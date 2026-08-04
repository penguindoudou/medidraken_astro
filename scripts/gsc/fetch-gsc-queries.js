import fs from 'node:fs';
import path from 'node:path';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:medidraken.com';

async function getAuthClient() {
  const saPath = process.env.GSC_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  // Option A: Service Account Key File
  if (saPath && fs.existsSync(saPath)) {
    const auth = new google.auth.GoogleAuth({
      keyFile: saPath,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    return auth.getClient();
  }

  // Option B: Service Account JSON directly in env
  if (process.env.GSC_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.GSC_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    return auth.getClient();
  }

  // Option C: OAuth2 Credentials with Refresh Token
  if (process.env.GSC_CLIENT_ID && process.env.GSC_CLIENT_SECRET && process.env.GSC_REFRESH_TOKEN) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GSC_CLIENT_ID,
      process.env.GSC_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: process.env.GSC_REFRESH_TOKEN });
    return oauth2Client;
  }

  // Fallback: default GoogleAuth auto-discovery
  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    return await auth.getClient();
  } catch (err) {
    throw new Error(
      'Missing GSC Auth Credentials in .env! Specify GOOGLE_APPLICATION_CREDENTIALS, GSC_SERVICE_ACCOUNT_PATH, GSC_SERVICE_ACCOUNT_JSON, or GSC_CLIENT_ID + GSC_CLIENT_SECRET + GSC_REFRESH_TOKEN.'
    );
  }
}

export async function fetchSearchConsoleData(daysBack = 30) {
  try {
    const authClient = await getAuthClient();
    const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });

    const endDate = new Date().toISOString().split('T')[0];
    const startDateDate = new Date();
    startDateDate.setDate(startDateDate.getDate() - daysBack);
    const startDate = startDateDate.toISOString().split('T')[0];

    console.log(`Fetching GSC performance data for ${SITE_URL} (${startDate} to ${endDate})...`);

    const res = await searchconsole.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query', 'page'],
        rowLimit: 25000,
      },
    });

    const rows = res.data.rows || [];
    console.log(`Retrieved ${rows.length} search query/page combinations.`);

    if (rows.length === 25000) {
      console.warn(
        '⚠️  Response hit the 25,000-row limit — some queries may be missing. ' +
        'Consider narrowing the date range or adding a second dimension filter.'
      );
    }

    const outputDir = path.resolve(process.cwd(), 'plans/gsc-data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let outputFile = path.join(outputDir, `gsc-keywords-${endDate}.json`);

    if (fs.existsSync(outputFile)) {
      // e.g. gsc-keywords-2026-08-04-103022.json
      const now = new Date();
      const ts = now.toISOString().slice(11, 19).replace(/:/g, '');
      const altFile = path.join(outputDir, `gsc-keywords-${endDate}-${ts}.json`);
      console.warn(
        `⚠️  Same-day snapshot already exists at ${path.basename(outputFile)}.\n` +
        `   Saving to ${path.basename(altFile)} instead to avoid overwriting.`
      );
      outputFile = altFile;
    }

    fs.writeFileSync(outputFile, JSON.stringify(rows, null, 2));
    console.log(`Saved GSC data to ${outputFile}`);

    return rows;
  } catch (error) {
    console.error('Error fetching Google Search Console data:', error.message);
    if (error.message.includes('Missing GSC Auth Credentials')) {
      console.log('\n--- Setup Instructions ---');
      console.log('Add one of the following setups to your .env file:');
      console.log('1) GSC_SERVICE_ACCOUNT_PATH=/path/to/key.json');
      console.log('2) GSC_CLIENT_ID, GSC_CLIENT_SECRET, GSC_REFRESH_TOKEN');
      console.log('---------------------------\n');
    }
    throw error;
  }
}

if (process.argv[1] && process.argv[1].endsWith('fetch-gsc-queries.js')) {
  fetchSearchConsoleData().catch(() => process.exit(1));
}
