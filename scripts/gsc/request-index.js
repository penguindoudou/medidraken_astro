/**
 * request-index.js
 *
 * Submits one or more URL paths to Google's Indexing API to request an
 * immediate re-crawl. Use this after updating page content so Google picks
 * up the changes without waiting for its regular crawl schedule.
 *
 * Usage:
 *   npm run gsc:request-index -- /path/one/ /path/two/
 *   node scripts/gsc/request-index.js /na-dina-halsomal/minska-stress-hitta-inre-lugn/ /symtom/...
 *
 * Paths are resolved against the site's base URL (SITE_BASE_URL in .env,
 * defaults to https://medidraken.com).
 *
 * Quota: 200 requests/day on the free Indexing API tier. Each URL costs 1.
 *
 * Auth (same order as all other GSC scripts):
 *   GSC_SERVICE_ACCOUNT_PATH  — path to service account key JSON file
 *   GSC_SERVICE_ACCOUNT_JSON  — service account JSON as inline string
 *   GSC_CLIENT_ID + GSC_CLIENT_SECRET + GSC_REFRESH_TOKEN — OAuth2
 *   (fallback: Application Default Credentials)
 *
 * The service account must have the "Owner" role in Google Search Console
 * for the Indexing API to accept submissions.
 */

import fs from 'node:fs';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const SITE_BASE = (process.env.SITE_BASE_URL || 'https://medidraken.com').replace(/\/$/, '');

// ─── Auth ────────────────────────────────────────────────────────────────────

async function getAuthClient() {
  const scopes = ['https://www.googleapis.com/auth/indexing'];

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
    oauth2Client.setCredentials({ refresh_token: process.env.GSC_REFRESH_TOKEN });
    return oauth2Client;
  }

  // Fallback: Application Default Credentials
  const auth = new google.auth.GoogleAuth({ scopes });
  return auth.getClient();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalise a raw arg into a full URL. Accepts paths (/foo/) or full URLs. */
function toFullUrl(arg) {
  if (/^https?:\/\//.test(arg)) return arg;
  const path = arg.startsWith('/') ? arg : `/${arg}`;
  return `${SITE_BASE}${path}`;
}

/** Small delay to avoid hammering the API. */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const rawArgs = process.argv.slice(2).filter((a) => !a.startsWith('--'));

  if (rawArgs.length === 0) {
    console.error('Usage: npm run gsc:request-index -- /path/one/ /path/two/');
    process.exit(1);
  }

  const urls = rawArgs.map(toFullUrl);

  console.log(`\n📡  Requesting Google re-index for ${urls.length} URL(s):`);
  urls.forEach((u) => console.log(`   ${u}`));
  console.log();

  let authClient;
  try {
    authClient = await getAuthClient();
  } catch (err) {
    console.error('Auth failed:', err.message);
    process.exit(1);
  }

  // googleapis doesn't have a typed indexing client, so we use the raw
  // google.indexing helper which calls the REST endpoint directly.
  const indexing = google.indexing({ version: 'v3', auth: authClient });

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (const url of urls) {
    try {
      const res = await indexing.urlNotifications.publish({
        requestBody: {
          url,
          type: 'URL_UPDATED',
        },
      });

      const notif = res.data.urlNotificationMetadata?.latestUpdate;
      const notifyTime = notif?.notifyTime
        ? new Date(notif.notifyTime).toLocaleString('sv-SE')
        : 'n/a';

      console.log(`✅  ${url}`);
      console.log(`    notifyTime: ${notifyTime}`);

      results.push({ url, status: 'ok', notifyTime });
      successCount++;
    } catch (err) {
      const msg = err?.errors?.[0]?.message || err.message;
      console.error(`❌  ${url}`);
      console.error(`    ${msg}`);
      results.push({ url, status: 'error', error: msg });
      failCount++;
    }

    // Stay well within rate limits (~10 req/s allowed, we use ~2/s)
    if (urls.indexOf(url) < urls.length - 1) await sleep(500);
  }

  console.log('\n── Summary ─────────────────────────────────────────────────');
  console.log(`✅  Success: ${successCount}   ❌  Failed: ${failCount}`);

  if (failCount > 0) {
    console.log('\nFailed URLs:');
    results.filter((r) => r.status === 'error').forEach((r) => {
      console.log(`  ${r.url}  →  ${r.error}`);
    });
    process.exit(1);
  }

  console.log('\nGoogle has been notified. Re-indexing typically takes minutes');
  console.log('to hours. Check coverage in Search Console to confirm.\n');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
