/**
 * audit-canonicalization.js
 *
 * Fetches every URL that has ever appeared in your GSC performance data and
 * flags two classes of canonicalization problem:
 *
 *   1. .html ghost pages  — URLs ending in .html (e.g. /kontakt.html)
 *   2. http:// variants   — any URL served over plain HTTP
 *
 * It then writes a JSON report to plans/gsc-data/canon-audit-<date>.json that
 * the companion script submit-canonical-cleanup.js can read and act on.
 *
 * Usage:
 *   node scripts/gsc/audit-canonicalization.js
 *   node scripts/gsc/audit-canonicalization.js --days 90    # look back further
 *   node scripts/gsc/audit-canonicalization.js --verify     # HTTP-check canonical URLs
 *   node scripts/gsc/audit-canonicalization.js --verify --days 90
 *
 * --verify behaviour:
 *   For http:// and non-www HTTPS variants the canonical is always a trivial
 *   transform (same path, protocol upgrade + www prefix). These do NOT need
 *   an entry in astro.config.mjs redirects — Cloudflare handles them. But we
 *   still want to confirm the target page exists. --verify sends a HEAD
 *   request to each canonical URL; if it returns 200, needsReview is cleared
 *   and canonicalSource is set to 'verified_live'. Non-200 / timeouts are
 *   left as needsReview=true so you can investigate.
 *
 * Auth: reuses the same env-var pattern as fetch-gsc-queries.js
 *   GSC_SERVICE_ACCOUNT_PATH  or
 *   GSC_SERVICE_ACCOUNT_JSON  or
 *   GSC_CLIENT_ID + GSC_CLIENT_SECRET + GSC_REFRESH_TOKEN
 */

import fs from 'node:fs';
import path from 'node:path';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import { loadRedirectsMap } from './lib/redirects-map.js';

dotenv.config();

// ─── HTTP verification ────────────────────────────────────────────────────────

/**
 * Verify that a canonical URL actually exists on the live site.
 *
 * Strategy: HEAD request, follow redirects, check final status === 200.
 * Times out after 8 s per URL; errors are treated as unverified (not failed).
 *
 * Returns: { verified: boolean, status: number|null, finalUrl: string|null, error: string|null }
 */
async function verifyUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'medidraken-canon-audit/1.0' },
    });
    clearTimeout(timer);
    return {
      verified: res.status === 200,
      status: res.status,
      finalUrl: res.url || null,
      error: null,
    };
  } catch (err) {
    clearTimeout(timer);
    return { verified: false, status: null, finalUrl: null, error: err.message };
  }
}

/**
 * Returns true for entries where the canonical is a trivial transform
 * of the bad URL (protocol upgrade and/or www prefix only — the path is
 * unchanged). For these, the mechanical guess is always correct;
 * verification is about confirming the target page exists, not about
 * guessing the right slug.
 */
function isTrivialTransform(entry) {
  // http:// variants and non-www HTTPS variants — slug did not change
  return entry.isHttpVariant || entry.isNonWww;
}

const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:medidraken.com';
const DAYS_BACK = (() => {
  const idx = process.argv.indexOf('--days');
  return idx !== -1 ? Number(process.argv[idx + 1]) || 90 : 90;
})();

/**
 * --verify  Run live HTTP checks on all trivial-transform entries
 *           (http:// and non-www HTTPS) to confirm the target URL exists.
 *           Clears needsReview when status 200 is confirmed.
 *           Safe to omit when running offline / in CI without outbound access.
 */
const VERIFY = process.argv.includes('--verify');

// ─── Auth (mirrors fetch-gsc-queries.js) ────────────────────────────────────

async function getAuthClient(scopes) {
  const saPath =
    process.env.GSC_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (saPath && fs.existsSync(saPath)) {
    const auth = new google.auth.GoogleAuth({ keyFile: saPath, scopes });
    return auth.getClient();
  }

  if (process.env.GSC_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.GSC_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({ credentials, scopes });
    return auth.getClient();
  }

  if (
    process.env.GSC_CLIENT_ID &&
    process.env.GSC_CLIENT_SECRET &&
    process.env.GSC_REFRESH_TOKEN
  ) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GSC_CLIENT_ID,
      process.env.GSC_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      refresh_token: process.env.GSC_REFRESH_TOKEN,
    });
    return oauth2Client;
  }

  // Fallback: ADC
  const auth = new google.auth.GoogleAuth({ scopes });
  return auth.getClient();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract the path component from a full URL string.
 * e.g. 'https://medidraken.com/taiji.html' → '/taiji.html'
 */
function urlToPath(url) {
  try {
    return new URL(url).pathname;
  } catch {
    // Not a full URL — treat as a bare path
    return url.replace(/^https?:\/\/[^/]+/, '') || '/';
  }
}

/**
 * Given a "ghost" URL, return the canonical version and a confidence flag.
 *
 * Resolution order:
 *   1. Exact match in knownRedirects  (source = 'known_redirect')
 *   2. Path with .html appended       (source = 'known_redirect')
 *   3. Path without .html / trailing slash (source = 'known_redirect')
 *   4. Mechanical .html → trailing-slash transform  (source = 'mechanical_guess',
 *      needsReview = true) — only correct when the slug didn't change between
 *      the old site and the current Astro build.
 *
 * Returns: { canonical: string, source: 'known_redirect'|'mechanical_guess', needsReview: boolean }
 */
function toCanonical(url, knownRedirects) {
  const urlPath = urlToPath(url);

  // Try several key variants against the known-redirects map
  const candidates = [
    urlPath,                                           // '/taiji.html'
    urlPath.replace(/\/$/, ''),                        // '/taiji'  (strip trailing slash)
    urlPath.replace(/\.html$/, ''),                    // '/taiji'  (strip .html)
    urlPath.replace(/\.html$/, '/'),                   // '/taiji/' (strip .html, add slash)
    urlPath.replace(/\.html$/, '') + '.html',          // normalise in case it was already stripped
  ];

  for (const key of candidates) {
    if (knownRedirects[key]) {
      return { canonical: knownRedirects[key], source: 'known_redirect', needsReview: false };
    }
  }

  // Mechanical fallback — strip .html and ensure https://www. + trailing slash
  let mechanical = url
    .replace(/^http:\/\//, 'https://')
    .replace(/\.html$/, '/')
    .replace(/^https:\/\/(?!www\.)/, 'https://www.');

  if (!mechanical.endsWith('/')) mechanical += '/';

  return { canonical: mechanical, source: 'mechanical_guess', needsReview: true };
}

function isBadUrl(url) {
  return (
    url.endsWith('.html') ||
    url.startsWith('http://') ||
    (url.startsWith('https://') && !url.startsWith('https://www.'))
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const scopes = ['https://www.googleapis.com/auth/webmasters.readonly'];
  let authClient;
  try {
    authClient = await getAuthClient(scopes);
  } catch (err) {
    console.error('Auth failed:', err.message);
    process.exit(1);
  }

  const sc = google.searchconsole({ version: 'v1', auth: authClient });

  const endDate = new Date().toISOString().split('T')[0];
  const startDateObj = new Date();
  startDateObj.setDate(startDateObj.getDate() - DAYS_BACK);
  const startDate = startDateObj.toISOString().split('T')[0];

  console.log(`\nFetching GSC page data for ${SITE_URL}`);
  console.log(`Period: ${startDate} → ${endDate} (${DAYS_BACK} days)\n`);

  // ── Load known redirects from astro.config.mjs ────────────────────────────
  const knownRedirects = loadRedirectsMap();
  const knownCount = Object.keys(knownRedirects).length;
  console.log(`Known redirects loaded from astro.config.mjs: ${knownCount}`);
  if (knownCount === 0) {
    console.warn('  ⚠  No redirects found — all ghost page mappings will be mechanical guesses.\n');
  }

  // Pull all pages that received at least 1 impression — paginate if needed
  const allUrls = new Set();
  let startRow = 0;
  const ROW_LIMIT = 1000;

  while (true) {
    const res = await sc.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: ROW_LIMIT,
        startRow,
      },
    });

    const rows = res.data.rows || [];
    for (const row of rows) {
      allUrls.add(row.keys[0]);
    }

    if (rows.length < ROW_LIMIT) break; // no more pages
    startRow += ROW_LIMIT;
  }

  console.log(`Total unique URLs seen by Google: ${allUrls.size}`);

  // ── Classify ──────────────────────────────────────────────────────────────

  const htmlGhosts    = [];
  const httpVariants  = [];
  const nonWwwVariants = [];

  for (const url of allUrls) {
    if (!isBadUrl(url)) continue;

    const { canonical, source, needsReview } = toCanonical(url, knownRedirects);

    const entry = {
      badUrl: url,
      canonical,
      canonicalSource: source,
      needsReview,
      isHtmlGhost:    url.endsWith('.html'),
      isHttpVariant:  url.startsWith('http://'),
      isNonWww:       url.startsWith('https://') && !url.startsWith('https://www.'),
    };

    if (url.endsWith('.html')) {
      htmlGhosts.push(entry);
    } else if (url.startsWith('http://')) {
      httpVariants.push(entry);
    } else {
      nonWwwVariants.push(entry);
    }
  }

  // ── Live HTTP verification (opt-in via --verify) ──────────────────────────
  //
  // For http:// and non-www variants the canonical is a trivial transform
  // (same path, just protocol upgrade + www prefix). These don't need a
  // redirect entry in astro.config.mjs — they're handled by Cloudflare.
  // What we actually want to verify is: does the target URL exist (200)?
  // If yes, clear needsReview automatically.

  let verifiedCount = 0;
  let verifyFailCount = 0;

  if (VERIFY) {
    const toVerify = [...httpVariants, ...nonWwwVariants].filter(
      (e) => e.needsReview && isTrivialTransform(e)
    );

    if (toVerify.length > 0) {
      console.log(`\nVerifying ${toVerify.length} trivial-transform canonical URLs…`);

      // Run in batches of 8 to avoid hammering the server
      const BATCH = 8;
      for (let i = 0; i < toVerify.length; i += BATCH) {
        const batch = toVerify.slice(i, i + BATCH);
        const results = await Promise.all(batch.map((e) => verifyUrl(e.canonical)));

        for (let j = 0; j < batch.length; j++) {
          const entry  = batch[j];
          const result = results[j];

          entry.verification = result;

          if (result.verified) {
            // Target page exists → no manual action needed
            entry.needsReview    = false;
            entry.canonicalSource = 'verified_live';
            verifiedCount++;
            process.stdout.write('✓');
          } else {
            verifyFailCount++;
            process.stdout.write('✗');
          }
        }
      }
      console.log(); // newline after progress dots
      console.log(
        `  Live check: ${verifiedCount} confirmed ✓  ${verifyFailCount} unconfirmed ✗`
      );
    }
  }

  // ── Report ────────────────────────────────────────────────────────────────

  const needsReviewCount =
    [...htmlGhosts, ...httpVariants, ...nonWwwVariants].filter((e) => e.needsReview).length;

  const report = {
    generatedAt: new Date().toISOString(),
    siteUrl: SITE_URL,
    period: { startDate, endDate, daysBack: DAYS_BACK },
    totalUrlsSeen: allUrls.size,
    knownRedirectsLoaded: knownCount,
    verified: VERIFY,
    summary: {
      htmlGhosts:      htmlGhosts.length,
      httpVariants:    httpVariants.length,
      nonWwwVariants:  nonWwwVariants.length,
      total: htmlGhosts.length + httpVariants.length + nonWwwVariants.length,
      needsReview:     needsReviewCount,
      ...(VERIFY && { verifiedLive: verifiedCount, verifyFailed: verifyFailCount }),
    },
    htmlGhosts,
    httpVariants,
    nonWwwVariants,
  };

  const outputDir = path.resolve(process.cwd(), 'plans/gsc-data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, `canon-audit-${endDate}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));

  // ── Console summary ───────────────────────────────────────────────────────

  console.log('\n── Canonicalization Audit ──────────────────────────────────');

  if (htmlGhosts.length === 0 && httpVariants.length === 0 && nonWwwVariants.length === 0) {
    console.log('✅  No canonicalization issues found in GSC data.');
  } else {
    /** Format one entry line with confidence label */
    const fmt = (e) => {
      let label;
      if (e.canonicalSource === 'verified_live') {
        label = `✅ [verified live — HTTP ${e.verification?.status}]`;
      } else if (e.canonicalSource === 'known_redirect') {
        label = '✅ [known redirect]';
      } else if (e.needsReview) {
        label = '⚠  [MECHANICAL GUESS — add to astro.config.mjs redirects]';
      } else {
        label = '⚠  [unverified — run with --verify to check]';
      }
      let line = `   ${e.badUrl}\n   → ${e.canonical}  ${label}`;
      if (e.verification && !e.verification.verified) {
        line += `\n   ✗ verify failed: ${e.verification.error || `HTTP ${e.verification.status}`}`;
      }
      return line;
    };

    if (htmlGhosts.length > 0) {
      console.log(`\n⚠  .html ghost pages (${htmlGhosts.length}):`);
      for (const e of htmlGhosts) console.log(fmt(e));
    }

    if (httpVariants.length > 0) {
      console.log(`\n⚠  http:// variants (${httpVariants.length}):`);
      for (const e of httpVariants) console.log(fmt(e));
    }

    if (nonWwwVariants.length > 0) {
      console.log(`\n⚠  non-www HTTPS variants (${nonWwwVariants.length}):`);
      for (const e of nonWwwVariants) console.log(fmt(e));
    }

    console.log('\n────────────────────────────────────────────────────────────');
    console.log(
      `Total issues: ${report.summary.total}  ` +
        `(${htmlGhosts.length} .html · ${httpVariants.length} http:// · ${nonWwwVariants.length} non-www)`
    );

    if (needsReviewCount > 0) {
      console.log(
        `\n🚨  ${needsReviewCount} entry(s) still marked needsReview=true.`
      );
      const htmlNeedsReview = htmlGhosts.filter((e) => e.needsReview);
      if (htmlNeedsReview.length > 0) {
        console.log(
          `    • ${htmlNeedsReview.length} .html ghost(s) need explicit redirect entries in astro.config.mjs`
        );
      }
      const trivialUnverified = [...httpVariants, ...nonWwwVariants].filter((e) => e.needsReview);
      if (trivialUnverified.length > 0 && !VERIFY) {
        console.log(
          `    • ${trivialUnverified.length} http/non-www variant(s) not yet verified — re-run with --verify to auto-confirm`
        );
      } else if (trivialUnverified.length > 0 && VERIFY) {
        console.log(
          `    • ${trivialUnverified.length} http/non-www variant(s) could not be confirmed (target returned non-200 or timed out)`
        );
      }
      if (htmlNeedsReview.length > 0) {
        console.log(
          '\n    submit-canonical-cleanup.js will SKIP needsReview=true entries until resolved.'
        );
      }
    } else {
      console.log('\n✅  All entries resolved — no manual action required.');
    }

    console.log(
      `\nNext step: node scripts/gsc/submit-canonical-cleanup.js ${path.basename(outputFile)}`
    );
  }

  if (!VERIFY) {
    console.log(
      '\n💡  Tip: re-run with --verify to HTTP-check all http:// and non-www canonicals automatically.'
    );
  }

  console.log(`\nFull report saved → ${outputFile}\n`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
