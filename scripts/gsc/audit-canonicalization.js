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
 *   node scripts/gsc/audit-canonicalization.js --days 90   # look back further
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

dotenv.config();

const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:medidraken.com';
const DAYS_BACK = (() => {
  const idx = process.argv.indexOf('--days');
  return idx !== -1 ? Number(process.argv[idx + 1]) || 90 : 90;
})();

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
 * Given a "ghost" URL, return what the canonical version should be.
 *   http://example.com/page.html  → https://www.example.com/page/
 *   https://example.com/page.html → https://www.example.com/page/
 *   http://example.com/page/      → https://www.example.com/page/
 *   https://example.com/page/     → https://www.example.com/page/  (non-www → www)
 */
function toCanonical(url) {
  let u = url
    .replace(/^http:\/\//, 'https://')   // upgrade to https
    .replace(/\.html$/, '/');            // strip .html, add slash

  // ensure www. prefix
  u = u.replace(/^https:\/\/(?!www\.)/, 'https://www.');

  // ensure trailing slash (but don't double it)
  if (!u.endsWith('/')) u += '/';

  return u;
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

    const entry = {
      badUrl: url,
      canonical: toCanonical(url),
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

  // ── Report ────────────────────────────────────────────────────────────────

  const report = {
    generatedAt: new Date().toISOString(),
    siteUrl: SITE_URL,
    period: { startDate, endDate, daysBack: DAYS_BACK },
    totalUrlsSeen: allUrls.size,
    summary: {
      htmlGhosts:      htmlGhosts.length,
      httpVariants:    httpVariants.length,
      nonWwwVariants:  nonWwwVariants.length,
      total: htmlGhosts.length + httpVariants.length + nonWwwVariants.length,
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
    if (htmlGhosts.length > 0) {
      console.log(`\n⚠  .html ghost pages (${htmlGhosts.length}):`);
      for (const e of htmlGhosts) {
        console.log(`   ${e.badUrl}`);
        console.log(`   → canonical: ${e.canonical}`);
      }
    }

    if (httpVariants.length > 0) {
      console.log(`\n⚠  http:// variants (${httpVariants.length}):`);
      for (const e of httpVariants) {
        console.log(`   ${e.badUrl}`);
        console.log(`   → canonical: ${e.canonical}`);
      }
    }

    if (nonWwwVariants.length > 0) {
      console.log(`\n⚠  non-www HTTPS variants (${nonWwwVariants.length}):`);
      for (const e of nonWwwVariants) {
        console.log(`   ${e.badUrl}`);
        console.log(`   → canonical: ${e.canonical}`);
      }
    }

    console.log('\n────────────────────────────────────────────────────────────');
    console.log(
      `Total issues: ${report.summary.total}  ` +
        `(${htmlGhosts.length} .html · ${httpVariants.length} http:// · ${nonWwwVariants.length} non-www)`
    );
    console.log(
      `\nNext step: node scripts/gsc/submit-canonical-cleanup.js ${path.basename(outputFile)}`
    );
  }

  console.log(`\nFull report saved → ${outputFile}\n`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
