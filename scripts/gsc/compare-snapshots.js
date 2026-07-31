/**
 * compare-snapshots.js
 *
 * Diffs two GSC keyword snapshots and shows what moved — improved, dropped,
 * appeared, or disappeared — since the last fetch.
 *
 * Usage:
 *   # Auto-compare the two most recent snapshots:
 *   node scripts/gsc/compare-snapshots.js
 *
 *   # Compare specific files:
 *   node scripts/gsc/compare-snapshots.js plans/gsc-data/gsc-keywords-2026-07-01.json plans/gsc-data/gsc-keywords-2026-07-30.json
 *
 *   # Show only movers above a threshold:
 *   node scripts/gsc/compare-snapshots.js --min-pos-delta 3
 *   node scripts/gsc/compare-snapshots.js --min-imp 5
 *
 * Output sections:
 *   📈 Improved    — position moved up (lower number)
 *   📉 Dropped     — position moved down (higher number)
 *   🆕 New         — query appeared in "after" but not in "before"
 *   👻 Disappeared — query was in "before" but not in "after"
 *   📊 Summary     — overall CTR, impressions, clicks delta
 */

import fs from 'node:fs';
import path from 'node:path';

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const flags = Object.fromEntries(
  process.argv
    .slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => {
      const [k, v] = a.replace('--', '').split('=');
      return [k, v !== undefined ? Number(v) : true];
    })
);

const MIN_POS_DELTA = flags['min-pos-delta'] ?? 1;   // only show moves ≥ this many positions
const MIN_IMP      = flags['min-imp']       ?? 0;    // only show queries with ≥ this impressions (in "after")
const TOP_N        = flags['top']           ?? 30;   // max rows per section

// ─── Load snapshots ───────────────────────────────────────────────────────────

const dataDir = path.resolve(process.cwd(), 'plans/gsc-data');

function loadSnapshot(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return raw;
}

function pickFiles() {
  if (args.length >= 2) {
    return [
      path.resolve(process.cwd(), args[0]),
      path.resolve(process.cwd(), args[1]),
    ];
  }

  const files = fs
    .readdirSync(dataDir)
    .filter(f => f.startsWith('gsc-keywords-') && f.endsWith('.json'))
    .sort();

  if (files.length < 2) {
    console.error(
      `Need at least 2 snapshot files in ${dataDir} to compare.\n` +
      `Run fetch-gsc-queries.js to create them.`
    );
    process.exit(1);
  }

  return [
    path.join(dataDir, files[files.length - 2]),
    path.join(dataDir, files[files.length - 1]),
  ];
}

// ─── Roll up rows by query (weighted avg position, summed clicks/impressions) ─

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
    q.posAcc      += row.position * row.impressions; // weighted by impressions
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

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmt(n, decimals = 1) {
  return n.toFixed(decimals);
}

function posArrow(delta) {
  // delta = after.position - before.position
  // negative delta = improved (moved to lower position number)
  if (delta <= -3)  return '⬆⬆';
  if (delta < 0)    return '⬆ ';
  if (delta >= 3)   return '⬇⬇';
  return '⬇ ';
}

function impDelta(before, after) {
  const d = after - before;
  return (d >= 0 ? '+' : '') + d;
}

function clickDelta(before, after) {
  const d = after - before;
  return (d >= 0 ? '+' : '') + d;
}

function pad(str, len) {
  return String(str).slice(0, len).padEnd(len);
}

function padL(str, len) {
  return String(str).slice(0, len).padStart(len);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const [beforeFile, afterFile] = pickFiles();

console.log(`\nBefore : ${path.basename(beforeFile)}`);
console.log(`After  : ${path.basename(afterFile)}\n`);

const beforeRows = loadSnapshot(beforeFile);
const afterRows  = loadSnapshot(afterFile);

const before = rollUpByQuery(beforeRows);
const after  = rollUpByQuery(afterRows);

const allQueries = new Set([...Object.keys(before), ...Object.keys(after)]);

const improved     = [];
const dropped      = [];
const appeared     = [];
const disappeared  = [];

for (const query of allQueries) {
  const b = before[query];
  const a = after[query];

  if (!b && a) {
    appeared.push({ query, ...a });
    continue;
  }
  if (b && !a) {
    disappeared.push({ query, ...b });
    continue;
  }

  const posDelta = a.position - b.position; // negative = improved

  if (Math.abs(posDelta) < MIN_POS_DELTA) continue;
  if (a.impressions < MIN_IMP) continue;

  const entry = {
    query,
    beforePos:  b.position,
    afterPos:   a.position,
    posDelta,
    beforeImp:  b.impressions,
    afterImp:   a.impressions,
    impDelta:   a.impressions - b.impressions,
    beforeClicks: b.clicks,
    afterClicks:  a.clicks,
    clickDelta:   a.clicks - b.clicks,
    afterCtr:     a.ctr,
  };

  if (posDelta < 0) {
    improved.push(entry);
  } else {
    dropped.push(entry);
  }
}

// Sort
improved.sort((a, b) => a.posDelta - b.posDelta);       // biggest improvement first
dropped.sort((a, b) => b.posDelta - a.posDelta);         // biggest drop first
appeared.sort((a, b) => b.impressions - a.impressions);  // most impressions first
disappeared.sort((a, b) => b.impressions - a.impressions);

// ─── Print ────────────────────────────────────────────────────────────────────

const Q = 38;

function printSection(title, rows, renderRow) {
  if (rows.length === 0) return;
  console.log(title);
  console.log('─'.repeat(90));
  rows.slice(0, TOP_N).forEach(renderRow);
  if (rows.length > TOP_N) {
    console.log(`  … and ${rows.length - TOP_N} more (use --top=N to show more)`);
  }
  console.log();
}

printSection(`📈 Improved (${improved.length})`, improved, (r) => {
  console.log(
    `  ${posArrow(r.posDelta)} ${pad(r.query, Q)}` +
    `  pos ${padL(fmt(r.beforePos), 6)} → ${padL(fmt(r.afterPos), 6)}` +
    `  (${fmt(r.posDelta, 1)})` +
    `  imp ${padL(r.afterImp, 4)} (${impDelta(r.beforeImp, r.afterImp)})` +
    `  clicks ${padL(r.afterClicks, 3)} (${clickDelta(r.beforeClicks, r.afterClicks)})`
  );
});

printSection(`📉 Dropped (${dropped.length})`, dropped, (r) => {
  console.log(
    `  ${posArrow(r.posDelta)} ${pad(r.query, Q)}` +
    `  pos ${padL(fmt(r.beforePos), 6)} → ${padL(fmt(r.afterPos), 6)}` +
    `  (${fmt(r.posDelta, 1)})` +
    `  imp ${padL(r.afterImp, 4)} (${impDelta(r.beforeImp, r.afterImp)})` +
    `  clicks ${padL(r.afterClicks, 3)} (${clickDelta(r.beforeClicks, r.afterClicks)})`
  );
});

printSection(`🆕 New queries (${appeared.length})`, appeared, (r) => {
  console.log(
    `  ${pad(r.query, Q)}` +
    `  pos ${padL(fmt(r.position), 6)}` +
    `  imp ${padL(r.impressions, 4)}` +
    `  clicks ${padL(r.clicks, 3)}` +
    `  CTR ${(r.ctr * 100).toFixed(1)}%`
  );
});

printSection(`👻 Disappeared (${disappeared.length})`, disappeared, (r) => {
  console.log(
    `  ${pad(r.query, Q)}` +
    `  was pos ${padL(fmt(r.position), 6)}` +
    `  imp ${padL(r.impressions, 4)}` +
    `  clicks ${padL(r.clicks, 3)}`
  );
});

// ─── Overall summary ──────────────────────────────────────────────────────────

const totalBefore = {
  impressions: Object.values(before).reduce((s, r) => s + r.impressions, 0),
  clicks:      Object.values(before).reduce((s, r) => s + r.clicks, 0),
};
const totalAfter = {
  impressions: Object.values(after).reduce((s, r) => s + r.impressions, 0),
  clicks:      Object.values(after).reduce((s, r) => s + r.clicks, 0),
};
const ctrBefore = totalBefore.impressions > 0 ? totalBefore.clicks / totalBefore.impressions : 0;
const ctrAfter  = totalAfter.impressions  > 0 ? totalAfter.clicks  / totalAfter.impressions  : 0;

console.log('📊 Overall summary');
console.log('─'.repeat(90));
console.log(
  `  Impressions : ${totalBefore.impressions} → ${totalAfter.impressions}` +
  `  (${impDelta(totalBefore.impressions, totalAfter.impressions)})`
);
console.log(
  `  Clicks      : ${totalBefore.clicks} → ${totalAfter.clicks}` +
  `  (${clickDelta(totalBefore.clicks, totalAfter.clicks)})`
);
console.log(
  `  CTR         : ${(ctrBefore * 100).toFixed(2)}% → ${(ctrAfter * 100).toFixed(2)}%`
);
console.log(
  `  Queries     : ${Object.keys(before).length} → ${Object.keys(after).length}` +
  `  (+${appeared.length} new, -${disappeared.length} gone)`
);
console.log(
  `\n  Filters active: min-pos-delta=${MIN_POS_DELTA}  min-imp=${MIN_IMP}  top=${TOP_N}`
);
console.log(
  `  To adjust: --min-pos-delta=3 --min-imp=5 --top=50\n`
);
