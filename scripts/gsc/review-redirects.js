/**
 * review-redirects.js
 *
 * Interactive review of every redirect defined in astro.config.mjs.
 *
 * For each old → new pair it:
 *   1. Checks that the target URL is live (HTTP 200)
 *   2. Shows you the mapping
 *   3. Lets you approve (Enter) or type a replacement target
 *
 * At the end it writes any changes back to astro.config.mjs.
 *
 * Usage:
 *   node scripts/gsc/review-redirects.js
 *   node scripts/gsc/review-redirects.js --broken-only   # only show broken targets
 */

import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { loadRedirectsMap } from './lib/redirects-map.js';

const BROKEN_ONLY = process.argv.includes('--broken-only');
const CONFIG_PATH = path.resolve(process.cwd(), 'astro.config.mjs');

// ── HTTP check ────────────────────────────────────────────────────────────────

function checkUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 8000 }, (res) => {
      res.resume();
      resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 });
    });
    req.on('error', (e) => resolve({ status: 'ERR', ok: false, err: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT', ok: false }); });
  });
}

// ── Prompt helper ─────────────────────────────────────────────────────────────

function prompt(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

// ── Update astro.config.mjs ───────────────────────────────────────────────────

function applyChanges(changes) {
  // changes: Map<fromPath, newToPath>
  let config = fs.readFileSync(CONFIG_PATH, 'utf8');
  let count = 0;

  for (const [from, newTo] of changes) {
    // Match the line:  '/from':  '/old-to/',   (single or double quotes, any spacing)
    const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(
      `(['"]${escapedFrom}['"]\\s*:\\s*)['"][^'"]+['"]`,
      'g'
    );
    const newConfig = config.replace(re, (_, prefix) => `${prefix}'${newTo}'`);
    if (newConfig !== config) {
      config = newConfig;
      count++;
    } else {
      console.warn(`  ⚠  Could not find "${from}" in config to update — skipped`);
    }
  }

  if (count > 0) {
    fs.writeFileSync(CONFIG_PATH, config);
    console.log(`\n✅  ${count} change(s) written to astro.config.mjs`);
  } else {
    console.log('\nNo changes written.');
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const map = loadRedirectsMap();
  const entries = Object.entries(map); // [from, targetUrl]

  console.log(`\nLoaded ${entries.length} redirect(s) from astro.config.mjs`);
  console.log('Checking targets...\n');

  // Check all targets in parallel first
  const checks = await Promise.all(
    entries.map(async ([from, to]) => {
      const result = await checkUrl(to);
      return { from, to, ...result };
    })
  );

  const broken  = checks.filter((c) => !c.ok);
  const working = checks.filter((c) => c.ok);

  // Summary before interactive session
  console.log(`── Target check results ${'─'.repeat(40)}`);
  for (const c of working) {
    console.log(`  ✅ ${c.status}  ${c.from.padEnd(34)} → ${c.to}`);
  }
  if (broken.length > 0) {
    console.log();
    for (const c of broken) {
      const detail = c.err ? ` (${c.err})` : '';
      console.log(`  ❌ ${c.status}  ${c.from.padEnd(34)} → ${c.to}${detail}`);
    }
  }

  const toReview = BROKEN_ONLY ? broken : checks;
  if (toReview.length === 0) {
    console.log('\n✅  All targets are live. Nothing to review.\n');
    return;
  }

  console.log(`\n${'─'.repeat(64)}`);
  console.log(`Reviewing ${toReview.length} redirect(s).`);
  console.log(`Press Enter to keep the current target, or type a new path/URL.\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const changes = new Map();

  for (const entry of toReview) {
    const statusIcon = entry.ok ? '✅' : '❌';
    console.log(`\n${statusIcon}  OLD: ${entry.from}`);
    console.log(`     NEW: ${entry.to}`);

    const answer = await prompt(rl, `     Keep? [Enter] or type replacement: `);
    const trimmed = answer.trim();

    if (trimmed === '') {
      console.log('     → kept');
    } else {
      // Accept bare path (/kurser/) or full URL
      const newTarget = trimmed.startsWith('http') ? trimmed : trimmed;
      changes.set(entry.from, newTarget);
      console.log(`     → changed to: ${newTarget}`);
    }
  }

  rl.close();

  if (changes.size === 0) {
    console.log('\nNo changes made.\n');
    return;
  }

  console.log(`\n── Pending changes (${changes.size}) ${'─'.repeat(40)}`);
  for (const [from, to] of changes) {
    console.log(`  ${from.padEnd(34)} → ${to}`);
  }

  // Re-open readline for confirmation
  const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout });
  const confirm = await prompt(rl2, '\nWrite these changes to astro.config.mjs? [y/N] ');
  rl2.close();

  if (confirm.trim().toLowerCase() === 'y') {
    applyChanges(changes);
  } else {
    console.log('Aborted — no changes written.\n');
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
