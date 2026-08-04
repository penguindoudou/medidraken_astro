/**
 * submit-canonical-cleanup.js
 *
 * Reads the JSON report produced by audit-canonicalization.js and:
 *
 *   1. Uses the URL Inspection API to verify that each ghost URL is NOT the
 *      one Google is treating as canonical (safety check before acting).
 *   2. Requests indexing of the correct canonical (https + trailing slash)
 *      version via the Indexing API.
 *
 * The Indexing API is officially only for JobPosting/BroadcastEvent schemas,
 * but Google processes the ping and it re-crawls the URL quickly — widely used
 * as a fast canonicalization nudge. It does NOT remove the bad URL; that
 * requires a separate "Remove URL" request in GSC or waiting for natural
 * re-crawl after the 301 is live.
 *
 * Usage:
 *   # Use the latest canon-audit-*.json automatically:
 *   node scripts/gsc/submit-canonical-cleanup.js
 *
 *   # Or specify a file:
 *   node scripts/gsc/submit-canonical-cleanup.js plans/gsc-data/canon-audit-2026-07-30.json
 *
 *   # Dry-run (inspect + report, no indexing requests sent):
 *   node scripts/gsc/submit-canonical-cleanup.js --dry-run
 *
 * Required scopes (both need to be granted to your service account / OAuth app):
 *   https://www.googleapis.com/auth/webmasters          (URL Inspection)
 *   https://www.googleapis.com/auth/indexing             (Indexing API)
 *
 * Rate limits:
 *   URL Inspection API: 2 000 req/day  (we use 1 per ghost URL)
 *   Indexing API:       200 req/day    (we use 1 per canonical URL)
 *   Both APIs:          ~10 req/s recommended — script respects this with a delay
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:medidraken.com';
const DRY_RUN = process.argv.includes('--dry-run');
const DELAY_MS = 120; // ~8 req/s — safe for both APIs

// ─── Auth ────────────────────────────────────────────────────────────────────

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

  const auth = new google.auth.GoogleAuth({ scopes });
  return auth.getClient();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Submit a single URL to the Indexing API.
 * We call the REST endpoint directly because the googleapis client doesn't
 * include an indexing service wrapper.
 */
async function submitIndexingRequest(url, accessToken) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ url, type: 'URL_UPDATED' });
    const options = {
      hostname: 'indexing.googleapis.com',
      path: '/v3/urlNotifications:publish',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // ── Load audit report ────────────────────────────────────────────────────

  const dataDir = path.resolve(process.cwd(), 'plans/gsc-data');
  let reportFile;

  if (process.argv[2] && !process.argv[2].startsWith('--')) {
    reportFile = path.resolve(process.cwd(), process.argv[2]);
  } else {
    const files = fs
      .readdirSync(dataDir)
      .filter((f) => f.startsWith('canon-audit-') && f.endsWith('.json'))
      .sort();

    if (files.length === 0) {
      console.error(
        'No canon-audit-*.json found in plans/gsc-data/\n' +
          'Run audit-canonicalization.js first.'
      );
      process.exit(1);
    }
    reportFile = path.join(dataDir, files[files.length - 1]);
  }

  console.log(`\nLoading audit report: ${path.basename(reportFile)}`);
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));

  const allIssues = [...(report.htmlGhosts ?? []), ...(report.httpVariants ?? []), ...(report.nonWwwVariants ?? [])];
  if (allIssues.length === 0) {
    console.log('✅  No issues in report — nothing to do.');
    return;
  }

  console.log(
    `Found ${allIssues.length} issue(s): ` +
      `${report.summary.htmlGhosts} .html ghost(s), ` +
      `${report.summary.httpVariants} http:// variant(s), ` +
      `${report.summary.nonWwwVariants ?? 0} non-www variant(s)`
  );

  // ── Skip entries that need manual review ─────────────────────────────────
  const needsReview = allIssues.filter((e) => e.needsReview);
  const actionable  = allIssues.filter((e) => !e.needsReview);

  if (needsReview.length > 0) {
    console.log(
      `\n🚨  Skipping ${needsReview.length} entry(s) with needsReview=true` +
      ' (mechanical guesses — canonical target is uncertain):'
    );
    for (const e of needsReview) {
      const kind = e.isHtmlGhost ? '.html ghost' : e.isNonWww ? 'non-www' : 'http://';
      console.log(`\n  Bad URL  : ${e.badUrl}  [${kind}]`);
      console.log(`  Guessed  : ${e.canonical}  ← NOT submitted`);
      console.log(`  Fix      : Add an explicit entry in astro.config.mjs redirects, then re-run gsc:audit`);
    }
    console.log();
  }

  if (actionable.length === 0) {
    console.log('ℹ  No actionable entries remaining after skipping unreviewed guesses.');
    console.log('   Resolve the needsReview entries above, then re-run.\n');
    return;
  }

  console.log(`Proceeding with ${actionable.length} confirmed redirect(s).\n`);

  if (DRY_RUN) {
    console.log('\n── DRY RUN — no requests will be sent ──────────────────────');
    if (needsReview.length > 0) {
      console.log(`(${needsReview.length} needsReview entry(s) already listed above — excluded here)`);
    }
    for (const e of actionable) {
      const kind = e.isHtmlGhost ? '.html ghost' : e.isNonWww ? 'non-www' : 'http://';
      console.log(`\n  Bad URL  : ${e.badUrl}  [${kind}]`);
      console.log(`  Canonical: ${e.canonical}  [${e.canonicalSource ?? 'known_redirect'}]`);
    }
    console.log('\nRemove --dry-run to execute.\n');
    return;
  }

  // ── Authenticate ─────────────────────────────────────────────────────────

  const SCOPES = [
    'https://www.googleapis.com/auth/webmasters',  // URL Inspection (read)
    'https://www.googleapis.com/auth/indexing',    // Indexing API (write)
  ];

  let authClient;
  try {
    authClient = await getAuthClient(SCOPES);
  } catch (err) {
    console.error('Auth failed:', err.message);
    process.exit(1);
  }

  const sc = google.searchconsole({ version: 'v1', auth: authClient });

  // Get a fresh access token for direct REST call to Indexing API
  let accessToken;
  try {
    const tokenRes = await authClient.getAccessToken();
    accessToken = tokenRes.token || tokenRes;
  } catch (err) {
    console.error('Failed to get access token:', err.message);
    process.exit(1);
  }

  // ── Process each issue ───────────────────────────────────────────────────

  const results = [];

  for (const entry of actionable) {
    const { badUrl, canonical } = entry;
    console.log(`\nProcessing: ${badUrl}`);

    // Step 1 — URL Inspection: check what Google thinks the canonical is
    let inspectionVerdict = 'UNKNOWN';
    try {
      const insp = await sc.urlInspection.index.inspect({
        requestBody: {
          inspectionUrl: badUrl,
          siteUrl: SITE_URL,
        },
      });

      const result = insp.data.inspectionResult;
      const googleCanon = result?.indexStatusResult?.googleCanonical;
      inspectionVerdict = result?.indexStatusResult?.verdict || 'UNKNOWN';

      console.log(`  Inspection verdict: ${inspectionVerdict}`);
      if (googleCanon) {
        console.log(`  Google canonical  : ${googleCanon}`);
        if (googleCanon === canonical) {
          console.log(`  ✅  Google already points to the correct canonical — skipping indexing request.`);
          results.push({ badUrl, canonical, inspectionVerdict, indexingStatus: 'SKIPPED_ALREADY_CANONICAL' });
          await sleep(DELAY_MS);
          continue;
        }
      }
    } catch (err) {
      console.warn(`  ⚠  URL Inspection failed (${err.message}) — proceeding anyway`);
    }

    await sleep(DELAY_MS);

    // Step 2 — Indexing API: ping the canonical URL for re-crawl
    try {
      const res = await submitIndexingRequest(canonical, accessToken);
      if (res.status === 200) {
        console.log(`  ✅  Indexing request accepted for ${canonical}`);
        results.push({ badUrl, canonical, inspectionVerdict, indexingStatus: 'SUBMITTED', httpStatus: res.status });
      } else {
        console.warn(`  ⚠  Indexing API returned ${res.status}:`, JSON.stringify(res.body));
        results.push({ badUrl, canonical, inspectionVerdict, indexingStatus: 'ERROR', httpStatus: res.status, error: res.body });
      }
    } catch (err) {
      console.error(`  ✗  Indexing request failed: ${err.message}`);
      results.push({ badUrl, canonical, inspectionVerdict, indexingStatus: 'FAILED', error: err.message });
    }

    await sleep(DELAY_MS);
  }

  // ── Save results ─────────────────────────────────────────────────────────

  const today = new Date().toISOString().split('T')[0];
  const outputFile = path.join(dataDir, `canon-cleanup-${today}.json`);
  const output = {
    executedAt: new Date().toISOString(),
    sourceReport: path.basename(reportFile),
    dryRun: false,
    skippedNeedsReview: needsReview.length,
    results,
  };
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));

  // ── Summary ───────────────────────────────────────────────────────────────

  const submitted = results.filter((r) => r.indexingStatus === 'SUBMITTED').length;
  const skipped   = results.filter((r) => r.indexingStatus === 'SKIPPED_ALREADY_CANONICAL').length;
  const errors    = results.filter((r) => ['ERROR', 'FAILED'].includes(r.indexingStatus)).length;

  console.log('\n── Cleanup Summary ─────────────────────────────────────────');
  console.log(`  Submitted        : ${submitted}`);
  console.log(`  Skipped (already canonical): ${skipped}`);
  console.log(`  Skipped (needsReview / unconfirmed): ${needsReview.length}`);
  console.log(`  Errors           : ${errors}`);
  console.log(`\nFull results saved → ${outputFile}`);

  if (submitted > 0) {
    console.log(
      '\nWhat to do next:',
      '\n  • Wait 24–72 h for Google to re-crawl the canonical URLs.',
      '\n  • Use GSC URL Inspection to confirm the bad URLs are no longer',
      '\n    being treated as canonical.',
      '\n  • For .html ghosts that were previously indexed, use GSC →',
      '\n    Removals → Temporary Removal to speed up de-indexing.',
    );
  }

  console.log();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
