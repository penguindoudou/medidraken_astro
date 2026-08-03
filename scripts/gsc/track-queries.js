/**
 * track-queries.js
 *
 * Per-opportunity feedback loop. Tags queries you've actively worked on so
 * compare-snapshots.js can surface their delta separately from everything else.
 *
 * Usage:
 *   # Add a query to the tracking list
 *   npm run gsc:track -- --add "massage nyköping" --page "/behandling/massage/" --note "rewrote title tag"
 *
 *   # List all tracked queries
 *   npm run gsc:track -- --list
 *
 *   # Compare snapshots and highlight tracked queries
 *   npm run gsc:track -- --compare
 *   npm run gsc:track -- --compare plans/gsc-data/gsc-keywords-2026-07-01.json plans/gsc-data/gsc-keywords-2026-07-31.json
 *
 *   # Show only tracked queries in the diff (suppress the rest)
 *   npm run gsc:track -- --compare --tracked-only
 */

import fs from 'node:fs';
import path from 'node:path';

// ─── Paths ────────────────────────────────────────────────────────────────────

const TRACKED_FILE = path.resolve(process.cwd(), 'plans/gsc-tracked.json');
const DATA_DIR     = path.resolve(process.cwd(), 'plans/gsc-data');

// ─── CLI args ─────────────────────────────────────────────────────────────────

const rawArgs = process.argv.slice(2);

// Extract named flag values: --add "query", --page "/url/", --note "text"
function getFlag(name) {
  const i = rawArgs.indexOf(`--${name}`);
  if (i === -1) return null;
  return rawArgs[i + 1] ?? null;
}

function hasFlag(name) {
  return rawArgs.includes(`--${name}`);
}

// Positional args that don't start with --
const positional = rawArgs.filter((a, i) => {
  if (a.startsWith('--')) return false;
  const prev = rawArgs[i - 1] ?? '';
  // Skip values that follow a named flag
  return !prev.startsWith('--');
});

// ─── Load / save tracked.json ─────────────────────────────────────────────────

function loadTracked() {
  if (!fs.existsSync(TRACKED_FILE)) {
    return { tracked: [] };
  }
  return JSON.parse(fs.readFileSync(TRACKED_FILE, 'utf8'));
}

function saveTracked(data) {
  fs.writeFileSync(TRACKED_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// ─── Load GSC snapshot ────────────────────────────────────────────────────────

function loadSnapshot(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function pickFiles() {
  if (positional.length >= 2) {
    return [
      path.resolve(process.cwd(), positional[0]),
      path.resolve(process.cwd(), positional[1]),
    ];
  }

  const files = fs
    .readdirSync(DATA_DIR)
    .filter(f => f.startsWith('gsc-keywords-') && f.endsWith('.json'))
    .sort();

  if (files.length < 2) {
    console.error(`Need at least 2 snapshot files in ${DATA_DIR}.\nRun: npm run gsc:fetch`);
    process.exit(1);
  }

  return [
    path.join(DATA_DIR, files[files.length - 2]),
    path.join(DATA_DIR, files[files.length - 1]),
  ];
}

// ─── Roll up snapshot rows by query ──────────────────────────────────────────

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

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmt(n, d = 1) { return n.toFixed(d); }
function pad(str, len) { return String(str).slice(0, len).padEnd(len); }
function padL(str, len) { return String(str).slice(0, len).padStart(len); }
function delta(a, b) { const d = a - b; return (d >= 0 ? '+' : '') + d; }
function fmtCtr(n) { return (n * 100).toFixed(1) + '%'; }

function posTrend(d) {
  if (d <= -5)  return '⬆⬆ ';
  if (d < 0)    return '⬆  ';
  if (d === 0)  return '→  ';
  if (d >= 5)   return '⬇⬇ ';
  return '⬇  ';
}

// ─── Commands ─────────────────────────────────────────────────────────────────

function cmdAdd() {
  const query = getFlag('add');
  if (!query) {
    console.error('Usage: npm run gsc:track -- --add "query text" [--page "/url/"] [--note "text"]');
    process.exit(1);
  }

  const page   = getFlag('page') ?? '';
  const note   = getFlag('note') ?? '';
  const date   = new Date().toISOString().slice(0, 10);

  const data = loadTracked();

  // Check for duplicate
  const existing = data.tracked.find(t => t.query === query);
  if (existing) {
    console.log(`⚠️  Already tracked: "${query}" (added ${existing.date})`);
    console.log(`   Edit plans/gsc-tracked.json directly to update it.`);
    process.exit(0);
  }

  // Try to grab baseline from the latest snapshot
  let baseline = null;
  try {
    const files = fs
      .readdirSync(DATA_DIR)
      .filter(f => f.startsWith('gsc-keywords-') && f.endsWith('.json'))
      .sort();

    if (files.length > 0) {
      const latest = loadSnapshot(path.join(DATA_DIR, files[files.length - 1]));
      const rolled = rollUpByQuery(latest);
      if (rolled[query]) {
        const r = rolled[query];
        baseline = {
          snapshot:    `plans/gsc-data/${files[files.length - 1]}`,
          impressions: r.impressions,
          clicks:      r.clicks,
          ctr:         parseFloat(r.ctr.toFixed(4)),
          position:    parseFloat(r.position.toFixed(1)),
        };
      }
    }
  } catch (_) {
    // baseline stays null — not fatal
  }

  // Measure-after = today + 28 days
  const measureDate = new Date();
  measureDate.setDate(measureDate.getDate() + 28);
  const measureAfter = measureDate.toISOString().slice(0, 10);

  const entry = {
    query,
    page,
    experiment: '',
    action: note,
    date,
    ...(baseline ? { baseline } : {}),
    measureAfter,
  };

  data.tracked.push(entry);
  saveTracked(data);

  console.log(`\n✅ Tracking "${query}"`);
  if (page)     console.log(`   Page    : ${page}`);
  if (note)     console.log(`   Action  : ${note}`);
  if (baseline) {
    console.log(`   Baseline: pos ${fmt(baseline.position)} | ${baseline.impressions} imp | ${baseline.clicks} clicks`);
  } else {
    console.log(`   Baseline: not found in snapshot — fill in plans/gsc-tracked.json manually`);
  }
  console.log(`   Measure : ${measureAfter} (28 days)\n`);
}

function cmdList() {
  const data = loadTracked();
  if (data.tracked.length === 0) {
    console.log('\nNo tracked queries yet.\nAdd one: npm run gsc:track -- --add "query" --page "/url/" --note "what you changed"\n');
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  console.log(`\n📌 Tracked queries (${data.tracked.length})\n`);
  console.log(`  ${'Query'.padEnd(40)} ${'Page'.padEnd(45)} ${'Date'.padEnd(12)} ${'Measure after'.padEnd(14)} Status`);
  console.log('  ' + '─'.repeat(125));

  for (const t of data.tracked) {
    const ready = today >= t.measureAfter;
    const status = ready ? '✅ Ready to measure' : `⏳ Wait until ${t.measureAfter}`;
    console.log(
      `  ${pad(t.query, 40)} ${pad(t.page, 45)} ${pad(t.date, 12)} ${pad(t.measureAfter, 14)} ${status}`
    );
    if (t.action) {
      console.log(`    └─ ${t.action}`);
    }
  }
  console.log();
}

function cmdCompare() {
  const trackedOnly = hasFlag('tracked-only');
  const data = loadTracked();
  const trackedMap = Object.fromEntries(data.tracked.map(t => [t.query, t]));
  const trackedQueries = new Set(Object.keys(trackedMap));

  const [beforeFile, afterFile] = pickFiles();

  console.log(`\nBefore : ${path.basename(beforeFile)}`);
  console.log(`After  : ${path.basename(afterFile)}`);
  if (trackedOnly) {
    console.log(`Filter : tracked queries only (${trackedQueries.size} tracked)\n`);
  } else {
    console.log(`Tracked: ${trackedQueries.size} queries flagged for follow-up\n`);
  }

  const before = rollUpByQuery(loadSnapshot(beforeFile));
  const after  = rollUpByQuery(loadSnapshot(afterFile));

  const allQueries = trackedOnly
    ? trackedQueries
    : new Set([...Object.keys(before), ...Object.keys(after)]);

  const tracked   = [];
  const improved  = [];
  const dropped   = [];
  const appeared  = [];
  const disappeared = [];

  for (const query of allQueries) {
    const b = before[query];
    const a = after[query];
    const isTracked = trackedQueries.has(query);

    if (!b && a) {
      if (!trackedOnly || isTracked) appeared.push({ query, ...a, tracked: isTracked });
      continue;
    }
    if (b && !a) {
      if (!trackedOnly || isTracked) disappeared.push({ query, ...b, tracked: isTracked });
      continue;
    }

    const posDelta = a.position - b.position;

    const entry = {
      query,
      beforePos:    b.position,
      afterPos:     a.position,
      posDelta,
      beforeImp:    b.impressions,
      afterImp:     a.impressions,
      beforeClicks: b.clicks,
      afterClicks:  a.clicks,
      beforeCtr:    b.ctr,
      afterCtr:     a.ctr,
      tracked:      isTracked,
      meta:         isTracked ? trackedMap[query] : null,
    };

    if (isTracked) {
      tracked.push(entry);
    } else if (!trackedOnly) {
      if (posDelta < -0.9)     improved.push(entry);
      else if (posDelta > 0.9) dropped.push(entry);
    }
  }

  // Sort
  tracked.sort((a, b) => a.posDelta - b.posDelta);
  improved.sort((a, b) => a.posDelta - b.posDelta);
  dropped.sort((a, b) => b.posDelta - a.posDelta);
  appeared.sort((a, b) => b.impressions - a.impressions);
  disappeared.sort((a, b) => b.impressions - a.impressions);

  const Q = 40;

  // ─── Tracked section (always shown, always first) ──────────────────────────
  if (tracked.length > 0) {
    console.log(`🎯 Tracked queries — your worked-on opportunities (${tracked.length})`);
    console.log('═'.repeat(100));
    for (const r of tracked) {
      const trend   = posTrend(r.posDelta);
      const posLine = `pos ${padL(fmt(r.beforePos), 6)} → ${padL(fmt(r.afterPos), 6)}  (${fmt(r.posDelta, 1)})`;
      const impLine = `imp ${padL(r.afterImp, 4)} (${delta(r.afterImp, r.beforeImp)})`;
      const clkLine = `clicks ${padL(r.afterClicks, 3)} (${delta(r.afterClicks, r.beforeClicks)})`;
      const ctrLine = `CTR ${fmtCtr(r.beforeCtr)} → ${fmtCtr(r.afterCtr)}`;

      console.log(`  ${trend}${pad(r.query, Q)}  ${posLine}  ${impLine}  ${clkLine}  ${ctrLine}`);

      // Baseline comparison if available
      if (r.meta?.baseline) {
        const bl = r.meta.baseline;
        const posVsBaseline = r.afterPos - bl.position;
        const impVsBaseline = r.afterImp - bl.impressions;
        const clkVsBaseline = r.afterClicks - bl.clicks;
        console.log(
          `    vs baseline (${bl.snapshot.split('/').pop()}):` +
          `  pos ${fmt(bl.position)} → ${fmt(r.afterPos)} (${fmt(posVsBaseline, 1)})` +
          `  imp ${bl.impressions} → ${r.afterImp} (${delta(r.afterImp, bl.impressions)})` +
          `  clicks ${bl.clicks} → ${r.afterClicks} (${delta(r.afterClicks, bl.clicks)})`
        );
      }

      if (r.meta?.action) {
        console.log(`    └─ ${r.meta.action} (${r.meta.date})`);
      }
      if (r.meta?.experiment) {
        console.log(`    └─ experiment: ${r.meta.experiment}`);
      }
    }
    console.log();
  }

  if (trackedOnly) return;

  // ─── Rest of the diff ─────────────────────────────────────────────────────

  function printSection(title, rows, renderRow) {
    if (rows.length === 0) return;
    console.log(title);
    console.log('─'.repeat(100));
    rows.slice(0, 25).forEach(renderRow);
    if (rows.length > 25) console.log(`  … and ${rows.length - 25} more`);
    console.log();
  }

  printSection(`📈 Improved (${improved.length})`, improved, (r) => {
    console.log(
      `  ${posTrend(r.posDelta)}${pad(r.query, Q)}` +
      `  pos ${padL(fmt(r.beforePos), 6)} → ${padL(fmt(r.afterPos), 6)}` +
      `  imp ${padL(r.afterImp, 4)} (${delta(r.afterImp, r.beforeImp)})` +
      `  clicks ${padL(r.afterClicks, 3)} (${delta(r.afterClicks, r.beforeClicks)})`
    );
  });

  printSection(`📉 Dropped (${dropped.length})`, dropped, (r) => {
    console.log(
      `  ${posTrend(r.posDelta)}${pad(r.query, Q)}` +
      `  pos ${padL(fmt(r.beforePos), 6)} → ${padL(fmt(r.afterPos), 6)}` +
      `  imp ${padL(r.afterImp, 4)} (${delta(r.afterImp, r.beforeImp)})` +
      `  clicks ${padL(r.afterClicks, 3)} (${delta(r.afterClicks, r.beforeClicks)})`
    );
  });

  printSection(`🆕 New queries (${appeared.length})`, appeared, (r) => {
    const tag = r.tracked ? ' 🎯' : '';
    console.log(
      `  ${pad(r.query + tag, Q + 2)}` +
      `  pos ${padL(fmt(r.position), 6)}` +
      `  imp ${padL(r.impressions, 4)}` +
      `  clicks ${padL(r.clicks, 3)}` +
      `  CTR ${fmtCtr(r.ctr)}`
    );
  });

  printSection(`👻 Disappeared (${disappeared.length})`, disappeared, (r) => {
    const tag = r.tracked ? ' 🎯' : '';
    console.log(
      `  ${pad(r.query + tag, Q + 2)}` +
      `  was pos ${padL(fmt(r.position), 6)}` +
      `  imp ${padL(r.impressions, 4)}` +
      `  clicks ${padL(r.clicks, 3)}`
    );
  });
}

// ─── Route command ─────────────────────────────────────────────────────────────

if (hasFlag('add')) {
  cmdAdd();
} else if (hasFlag('list')) {
  cmdList();
} else if (hasFlag('compare')) {
  cmdCompare();
} else {
  console.log(`
gsc:track — per-opportunity feedback loop

Commands:
  --add "query"          Tag a query as worked on
    --page "/url/"       (optional) target page
    --note "text"        (optional) what you changed

  --list                 Show all tracked queries + measurement status

  --compare              Diff snapshots, highlight tracked queries first
    [before] [after]     (optional) explicit snapshot paths
    --tracked-only       Only show tracked queries in the output

Examples:
  npm run gsc:track -- --add "massage nyköping" --page "/behandling/massage/" --note "rewrote title"
  npm run gsc:track -- --list
  npm run gsc:track -- --compare
  npm run gsc:track -- --compare --tracked-only
`);
}
