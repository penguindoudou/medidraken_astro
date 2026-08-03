/**
 * alert.js
 *
 * Post-fetch anomaly detector. Runs after gsc:fetch and prints loud warnings
 * if something significant changed since the last snapshot — without requiring
 * a manual gsc:compare run.
 *
 * Checks:
 *   1. Tracked query position drop     (threshold: >3 positions)
 *   2. General query position drop     (threshold: >5 positions, ≥5 impressions)
 *   3. Site-wide CTR drop              (threshold: >10% WoW, ≥500 impressions floor)
 *   4. Page disappeared from index     (was ranking, now zero impressions in GSC)
 *   5. New cannibalization detected    (query now maps to 2+ URLs vs before)
 *
 * Always exits 0 — alerts are informational, they never block the pipeline.
 *
 * Usage:
 *   node scripts/gsc/alert.js
 *   npm run gsc:alert
 */

import fs   from 'node:fs';
import path from 'node:path';

// ─── Paths ────────────────────────────────────────────────────────────────────

const DATA_DIR     = path.resolve(process.cwd(), 'plans/gsc-data');
const TRACKED_FILE = path.resolve(process.cwd(), 'plans/gsc-tracked.json');

// ─── Thresholds ───────────────────────────────────────────────────────────────

const TRACKED_DROP_THRESHOLD   = 3;    // positions
const GENERAL_DROP_THRESHOLD   = 5;    // positions
const GENERAL_MIN_IMPRESSIONS  = 5;    // noise floor for general drop check
const CTR_DROP_THRESHOLD       = 0.10; // 10% relative drop
const CTR_MIN_IMPRESSIONS      = 500;  // both snapshots must have ≥ this
const SNAPSHOT_GAP_WARN_DAYS   = 8;    // print gap warning if > this many days apart

// ─── Load tracked queries ─────────────────────────────────────────────────────

function loadTrackedQueries() {
  if (!fs.existsSync(TRACKED_FILE)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(TRACKED_FILE, 'utf8'));
    return data.tracked ?? [];
  } catch (_) {
    return [];
  }
}

// ─── Pick two most recent snapshot files ─────────────────────────────────────

function pickFiles() {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter(f => f.startsWith('gsc-keywords-') && f.endsWith('.json'))
    .sort();

  if (files.length < 2) return null; // first-ever run

  return [
    path.join(DATA_DIR, files[files.length - 2]),
    path.join(DATA_DIR, files[files.length - 1]),
  ];
}

// ─── Extract date string from filename ───────────────────────────────────────
// Expects pattern: gsc-keywords-YYYY-MM-DD.json

function dateFromFilename(filename) {
  const base  = path.basename(filename);
  const match = base.match(/gsc-keywords-(\d{4}-\d{2}-\d{2})\.json/);
  return match ? match[1] : null;
}

function daysBetween(dateA, dateB) {
  // dateA, dateB: 'YYYY-MM-DD' strings
  const msA = new Date(dateA).getTime();
  const msB = new Date(dateB).getTime();
  return Math.round(Math.abs(msB - msA) / (1000 * 60 * 60 * 24));
}

// ─── Load snapshot ────────────────────────────────────────────────────────────

function loadSnapshot(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// ─── Load latest canon-cleanup results ───────────────────────────────────────
// Returns { date: 'YYYY-MM-DD', map: { [badUrl]: { date, status } } }
// Returns null if no cleanup file exists yet.

function loadCleanupResults() {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('canon-cleanup-') && f.endsWith('.json'))
    .sort();
  if (files.length === 0) return null;
  const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, files[files.length - 1]), 'utf8'));
  const map = {};
  for (const r of data.results) {
    map[r.badUrl] = { date: data.executedAt.slice(0, 10), status: r.indexingStatus };
  }
  return { date: data.executedAt.slice(0, 10), map };
}

// ─── Classify a cannibalized new URL ─────────────────────────────────────────
// Types:
//   param-variant    → newUrl has ? and its base path matches an existing URL,
//                      OR an existing URL has ? and its base path matches newUrl
//   cleanup-submitted → newUrl was already submitted via gsc:cleanup
//   canon-variant    → http or .html ghost URL not yet in cleanup
//   unknown          → none of the above — genuinely unclear, alert loudly

function classifyNewUrl(newUrl, existingUrls, cleanupResult) {
  const newBase = newUrl.split('?')[0].replace(/\/$/, '');

  // 1. Query-param variant (either direction):
  //    a) new URL has a param and its base path matches an existing URL
  //    b) an existing URL has a param and its base path matches the new URL
  const isParamVariant =
    (newUrl.includes('?') && existingUrls.some(u => u.split('?')[0].replace(/\/$/, '') === newBase)) ||
    existingUrls.some(u => u.includes('?') && u.split('?')[0].replace(/\/$/, '') === newBase);
  if (isParamVariant) {
    return { type: 'param-variant', cleanUrl: newBase };
  }

  // 2. Already submitted via gsc:cleanup
  const cleanupMap = cleanupResult ? cleanupResult.map : null;
  if (cleanupMap && cleanupMap[newUrl]) {
    return { type: 'cleanup-submitted', date: cleanupMap[newUrl].date, status: cleanupMap[newUrl].status };
  }

  // 3. Known bad-URL pattern (http, .html ghost, or non-www) but not yet in cleanup
  const isHttpVariant = newUrl.startsWith('http://');
  const isHtmlGhost   = newUrl.endsWith('.html');
  const isNonWww      = newUrl.startsWith('https://') && !newUrl.startsWith('https://www.');
  if (isHttpVariant || isHtmlGhost || isNonWww) {
    return { type: 'canon-variant', needsCleanup: true };
  }

  // 4. New URL is canonical (www/https) but existing URLs are the bad variants —
  //    specifically: an existing bad URL has the same path as the new URL (ignoring
  //    protocol, www prefix). E.g. https://medidraken.com/foo/ and https://www.medidraken.com/foo/.
  const newPath = newUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  const isBadUrl = u =>
    u.startsWith('http://') ||
    u.endsWith('.html') ||
    (u.startsWith('https://') && !u.startsWith('https://www.'));
  const hasBadExistingWithSamePath = existingUrls.some(u => {
    if (!isBadUrl(u)) return false;
    const uPath = u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').replace(/\.html$/, '');
    return uPath === newPath.replace(/\.html$/, '');
  });
  if (hasBadExistingWithSamePath) {
    return { type: 'existing-are-bad', needsCleanup: true };
  }

  // 5. Unclassified — flag loudly
  return { type: 'unknown' };
}

// ─── Roll up rows by query (weighted-avg position, summed clicks/impressions) ─
// Mirrors the implementation in compare-snapshots.js

function rollUpByQuery(rows) {
  const byQuery = {};

  for (const row of rows) {
    const [query] = row.keys;
    if (!byQuery[query]) {
      byQuery[query] = { clicks: 0, impressions: 0, posAcc: 0, posImpAcc: 0 };
    }
    const q = byQuery[query];
    q.clicks      += row.clicks;
    q.impressions += row.impressions;
    q.posAcc      += row.position * row.impressions;
    q.posImpAcc   += row.impressions;
  }

  const result = {};
  for (const [query, d] of Object.entries(byQuery)) {
    result[query] = {
      clicks:      d.clicks,
      impressions: d.impressions,
      position:    d.posImpAcc > 0 ? d.posAcc / d.posImpAcc : 0,
      ctr:         d.impressions > 0 ? d.clicks / d.impressions : 0,
    };
  }

  return result;
}

// ─── Group rows by query → set of distinct pages ─────────────────────────────
// Used for cannibalization detection (check 5).

function pagesByQuery(rows) {
  const map = {};
  for (const row of rows) {
    const [query, page] = row.keys;
    if (!map[query]) map[query] = new Set();
    map[query].add(page);
  }
  return map;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmt(n, d = 1) { return Number(n).toFixed(d); }
function pad(str, len)  { return String(str).slice(0, len).padEnd(len); }
function padL(str, len) { return String(str).slice(0, len).padStart(len); }

// ─── Observation window annotation for tracked queries ───────────────────────

function obsWindowNote(trackedEntry) {
  const today       = new Date().toISOString().slice(0, 10);
  const measureAfter = trackedEntry.measureAfter;
  if (!measureAfter) return '';
  if (today < measureAfter) {
    return `  ⏳ still in observation window — check back ${measureAfter} before acting.`;
  }
  return `  ⚠  observation window closed — experiment may have failed, act now.`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const filePair = pickFiles();

// Edge case: only one snapshot (first-ever run)
if (filePair === null) {
  console.log('\n🔔 gsc:alert — No anomaly check possible yet.');
  console.log('   Only one snapshot exists — nothing to diff.');
  console.log('   Run gsc:fetch again next week to enable weekly alerts.\n');
  process.exit(0);
}

const [beforeFile, afterFile] = filePair;

const beforeDate = dateFromFilename(beforeFile);
const afterDate  = dateFromFilename(afterFile);
const gapDays    = (beforeDate && afterDate) ? daysBetween(beforeDate, afterDate) : null;

// ─── Header ───────────────────────────────────────────────────────────────────

console.log('\n🔔 gsc:alert — Anomaly check');
console.log('─'.repeat(70));
console.log(`  Before : ${path.basename(beforeFile)}`);
console.log(`  After  : ${path.basename(afterFile)}`);
if (gapDays !== null) {
  console.log(`  Gap    : ${gapDays} day${gapDays !== 1 ? 's' : ''}`);
}
console.log();

// Snapshot gap warning
if (gapDays !== null && gapDays > SNAPSHOT_GAP_WARN_DAYS) {
  console.log(
    `⚠  Snapshot gap: ${gapDays} days (${beforeDate} → ${afterDate}). ` +
    `Drops may reflect accumulated drift, not a single event.`
  );
  console.log();
}

// ─── Load data ────────────────────────────────────────────────────────────────

const beforeRows = loadSnapshot(beforeFile);
const afterRows  = loadSnapshot(afterFile);

// rowLimit cap warning (fetch uses rowLimit: 500)
if (beforeRows.length === 500) {
  console.log(`⚠  Snapshot ${path.basename(beforeFile)} contains exactly 500 rows — rowLimit may have been hit. Some queries could be missing from this analysis.`);
}
if (afterRows.length === 500) {
  console.log(`⚠  Snapshot ${path.basename(afterFile)} contains exactly 500 rows — rowLimit may have been hit. Some queries could be missing from this analysis.`);
}

const before = rollUpByQuery(beforeRows);
const after  = rollUpByQuery(afterRows);

const beforePages = pagesByQuery(beforeRows);
const afterPages  = pagesByQuery(afterRows);

const trackedList    = loadTrackedQueries();
const trackedMap     = Object.fromEntries(trackedList.map(t => [t.query, t]));
const trackedQueries = new Set(Object.keys(trackedMap));

const cleanupResult = loadCleanupResults();

// ─── Alert collectors ─────────────────────────────────────────────────────────

const alertTrackedDrop    = [];
const alertGeneralDrop    = [];
const alertCtr            = [];
const alertDisappeared    = [];
const alertCannibalization = [];

// ─── Check 1: Tracked query position drops (>3 positions) ────────────────────

for (const entry of trackedList) {
  const { query } = entry;
  const b = before[query];
  const a = after[query];

  if (!b) {
    // No prior data for this tracked query — benign, skip silently (we'll note it)
    alertTrackedDrop.push({ query, noPrior: true, entry });
    continue;
  }
  if (!a) {
    // Was ranking, now gone — this is also covered by check 4, but flag here too
    alertTrackedDrop.push({ query, disappeared: true, beforePos: b.position, entry });
    continue;
  }

  const delta = a.position - b.position;
  if (delta > TRACKED_DROP_THRESHOLD) {
    alertTrackedDrop.push({
      query,
      beforePos: b.position,
      afterPos:  a.position,
      delta,
      entry,
    });
  }
}

// ─── Check 2: General query position drops (>5 positions, ≥5 impressions) ────

for (const query of Object.keys(before)) {
  if (trackedQueries.has(query)) continue; // already covered by check 1

  const b = before[query];
  const a = after[query];

  if (!a) continue; // disappeared — covered by check 4

  const delta = a.position - b.position;
  if (delta > GENERAL_DROP_THRESHOLD && a.impressions >= GENERAL_MIN_IMPRESSIONS) {
    alertGeneralDrop.push({
      query,
      beforePos: b.position,
      afterPos:  a.position,
      delta,
      afterImp:  a.impressions,
    });
  }
}

alertGeneralDrop.sort((a, b) => b.delta - a.delta); // biggest drop first

// ─── Check 3: Site-wide CTR drop (>10% relative, ≥500 impressions floor) ─────

const totalBeforeImp    = Object.values(before).reduce((s, r) => s + r.impressions, 0);
const totalAfterImp     = Object.values(after).reduce((s, r) => s + r.impressions, 0);
const totalBeforeClicks = Object.values(before).reduce((s, r) => s + r.clicks, 0);
const totalAfterClicks  = Object.values(after).reduce((s, r) => s + r.clicks, 0);

const ctrBefore = totalBeforeImp > 0 ? totalBeforeClicks / totalBeforeImp : 0;
const ctrAfter  = totalAfterImp  > 0 ? totalAfterClicks  / totalAfterImp  : 0;

if (
  totalBeforeImp >= CTR_MIN_IMPRESSIONS &&
  totalAfterImp  >= CTR_MIN_IMPRESSIONS &&
  ctrBefore > 0
) {
  const ctrDrop = (ctrBefore - ctrAfter) / ctrBefore; // relative drop (positive = worse)
  if (ctrDrop > CTR_DROP_THRESHOLD) {
    alertCtr.push({
      ctrBefore,
      ctrAfter,
      ctrDropPct:   ctrDrop * 100,
      beforeImp:    totalBeforeImp,
      afterImp:     totalAfterImp,
      beforeClicks: totalBeforeClicks,
      afterClicks:  totalAfterClicks,
    });
  }
}

// ─── Check 4: Pages disappeared from index ───────────────────────────────────
// Mirrors the disappeared logic in compare-snapshots.js:
// Query was in "before" but has zero impressions in "after" (not present at all).

for (const query of Object.keys(before)) {
  if (!after[query]) {
    alertDisappeared.push({
      query,
      wasPos:  before[query].position,
      wasImp:  before[query].impressions,
      tracked: trackedQueries.has(query),
    });
  }
}

alertDisappeared.sort((a, b) => b.wasImp - a.wasImp); // highest-impression loss first

// ─── Check 5: New cannibalization (query gained a new URL mapping) ────────────

for (const query of Object.keys(afterPages)) {
  const beforePageSet = beforePages[query];
  const afterPageSet  = afterPages[query];

  if (!beforePageSet) continue; // new query entirely — not cannibalization

  const beforeCount = beforePageSet.size;
  const afterCount  = afterPageSet.size;

  if (afterCount > beforeCount) {
    // Find newly added URLs
    const newUrls = [...afterPageSet].filter(p => !beforePageSet.has(p));
    alertCannibalization.push({
      query,
      beforePages: [...beforePageSet],
      newPages:    newUrls,
      afterCount,
      tracked:     trackedQueries.has(query),
    });
  }
}

// ─── Print alerts ─────────────────────────────────────────────────────────────

let totalAlerts = 0;

// --- 1. Tracked query drops ---------------------------------------------------

const realTrackedDrops   = alertTrackedDrop.filter(a => !a.noPrior && !a.disappeared);
const noPriorTracked     = alertTrackedDrop.filter(a => a.noPrior);
const disappearedTracked = alertTrackedDrop.filter(a => a.disappeared);

if (realTrackedDrops.length > 0) {
  totalAlerts += realTrackedDrops.length;
  console.log(`🎯 Tracked query drops — position fell >${TRACKED_DROP_THRESHOLD} positions (${realTrackedDrops.length})`);
  console.log('═'.repeat(70));
  for (const r of realTrackedDrops) {
    console.log(
      `  ⬇  ${pad(r.query, 42)}` +
      `  pos ${padL(fmt(r.beforePos), 6)} → ${padL(fmt(r.afterPos), 6)}` +
      `  (+${fmt(r.delta, 1)})`
    );
    console.log(`    ${obsWindowNote(r.entry)}`);
    if (r.entry.action) {
      console.log(`    └─ ${r.entry.action} (${r.entry.date})`);
    }
  }
  console.log();
}

if (noPriorTracked.length > 0) {
  console.log(`🎯 Tracked queries with no prior snapshot`);
  console.log('─'.repeat(70));
  for (const r of noPriorTracked) {
    console.log(`  ℹ  ${r.query}  — no prior snapshot yet, skipping.`);
  }
  console.log();
}

if (disappearedTracked.length > 0) {
  totalAlerts += disappearedTracked.length;
  console.log(`🎯 Tracked queries disappeared`);
  console.log('─'.repeat(70));
  for (const r of disappearedTracked) {
    console.log(
      `  👻 ${pad(r.query, 42)}` +
      `  was pos ${padL(fmt(r.beforePos), 6)}`
    );
    console.log(`    ${obsWindowNote(r.entry)}`);
  }
  console.log();
}

// --- 2. General position drops -----------------------------------------------

if (alertGeneralDrop.length > 0) {
  totalAlerts += alertGeneralDrop.length;
  console.log(`📉 Position drops >${GENERAL_DROP_THRESHOLD} positions (≥${GENERAL_MIN_IMPRESSIONS} imp) — ${alertGeneralDrop.length} quer${alertGeneralDrop.length === 1 ? 'y' : 'ies'}`);
  console.log('─'.repeat(70));
  for (const r of alertGeneralDrop) {
    console.log(
      `  ⬇  ${pad(r.query, 42)}` +
      `  pos ${padL(fmt(r.beforePos), 6)} → ${padL(fmt(r.afterPos), 6)}` +
      `  (+${fmt(r.delta, 1)})` +
      `  imp ${r.afterImp}`
    );
  }
  console.log();
}

// --- 3. CTR drop -------------------------------------------------------------

if (alertCtr.length > 0) {
  totalAlerts += 1;
  const r = alertCtr[0];
  console.log(`⚠  Site-wide CTR drop`);
  console.log('─'.repeat(70));
  console.log(
    `  CTR     : ${(r.ctrBefore * 100).toFixed(2)}% → ${(r.ctrAfter * 100).toFixed(2)}%` +
    `  (−${r.ctrDropPct.toFixed(1)}% relative)`
  );
  console.log(
    `  Clicks  : ${r.beforeClicks} → ${r.afterClicks}` +
    `  (${r.afterClicks - r.beforeClicks >= 0 ? '+' : ''}${r.afterClicks - r.beforeClicks})`
  );
  console.log(
    `  Imp     : ${r.beforeImp} → ${r.afterImp}`
  );
  console.log();
}

// --- 4. Disappeared ----------------------------------------------------------

if (alertDisappeared.length > 0) {
  totalAlerts += alertDisappeared.length;
  console.log(`👻 Disappeared from index — ${alertDisappeared.length} quer${alertDisappeared.length === 1 ? 'y' : 'ies'}`);
  console.log('─'.repeat(70));
  for (const r of alertDisappeared) {
    const tag = r.tracked ? ' 🎯' : '';
    console.log(
      `  ${pad(r.query + tag, 44)}` +
      `  was pos ${padL(fmt(r.wasPos), 6)}` +
      `  imp ${r.wasImp}`
    );
  }
  console.log();
}

// --- 5. Cannibalization ------------------------------------------------------

if (alertCannibalization.length > 0) {
  // Classify every new URL before deciding what to print and what to count.
  // Real alerts: unknown + param-variant. Canon variants already in cleanup are informational.
  let realCount = 0;

  // First pass: count real alerts so the header shows the right number.
  for (const r of alertCannibalization) {
    for (const newUrl of r.newPages) {
      const cls = classifyNewUrl(newUrl, r.beforePages, cleanupResult);
      if (cls.type === 'unknown' || cls.type === 'param-variant') realCount++;
    }
  }

  totalAlerts += realCount;

  // Header — always show total entries; note how many are real vs informational.
  const infoCount = alertCannibalization.reduce((s, r) => s + r.newPages.length, 0) - realCount;
  let headerSuffix = '';
  if (infoCount > 0 && realCount > 0) {
    headerSuffix = ` — ${realCount} actionable, ${infoCount} informational`;
  } else if (infoCount > 0) {
    headerSuffix = ` — all informational`;
  }

  console.log(`🔀 Cannibalization detected — query now maps to multiple URLs (${alertCannibalization.length})${headerSuffix}`);
  console.log('─'.repeat(70));

  for (const r of alertCannibalization) {
    const tag = r.tracked ? ' 🎯' : '';
    console.log(`  ${r.query}${tag}`);
    for (const p of r.beforePages) {
      // Annotate existing URLs that are themselves cleanup targets (informational).
      const existingCls = classifyNewUrl(p, [], cleanupResult);
      if (existingCls.type === 'cleanup-submitted') {
        console.log(`    existing : ${p}  (submitted ${existingCls.date}, awaiting re-crawl)`);
      } else {
        console.log(`    existing : ${p}`);
      }
    }
    for (const newUrl of r.newPages) {
      const cls = classifyNewUrl(newUrl, r.beforePages, cleanupResult);
      if (cls.type === 'param-variant') {
        console.log(`    new      : ${newUrl}`);
        console.log(`               ↳ Query-param variant — param URL is being indexed as a separate page.`);
        console.log(`                 Investigate before acting: find what is linking to this URL and why.`);
      } else if (cls.type === 'cleanup-submitted') {
        console.log(`    new      : ${newUrl}`);
        console.log(`               ↳ Canon variant — already submitted via gsc:cleanup on ${cls.date}.`);
        console.log(`                 No action needed. Will resolve once Google re-crawls.`);
      } else if (cls.type === 'canon-variant') {
        console.log(`    new      : ${newUrl}`);
        console.log(`               ↳ Canon variant — in GSC but not yet submitted via gsc:cleanup.`);
        console.log(`                 Run: npm run gsc:cleanup`);
      } else if (cls.type === 'existing-are-bad') {
        const isBadUrl = u =>
          u.startsWith('http://') ||
          u.endsWith('.html') ||
          (u.startsWith('https://') && !u.startsWith('https://www.'));
        const badExisting = r.beforePages.filter(isBadUrl);
        console.log(`    new      : ${newUrl}`);
        console.log(`               ↳ Canonical URL — these existing variants need cleanup:`);
        for (const b of badExisting) {
          console.log(`                   ${b}`);
        }
        console.log(`                 Run: npm run gsc:audit  then  npm run gsc:cleanup`);
      } else {
        // unknown — loud
        console.log(`    new      : ${newUrl}  ← investigate`);
      }
    }
  }
  console.log();
}

// ─── Summary line ─────────────────────────────────────────────────────────────

if (totalAlerts === 0) {
  console.log('✅ No anomalies detected.\n');
} else {
  console.log(`🚨 ${totalAlerts} alert${totalAlerts === 1 ? '' : 's'} fired. Review above before proceeding.\n`);
}
