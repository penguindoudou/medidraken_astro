/**
 * test-alert-ctr.mjs
 *
 * Standalone test for the intersection-based CTR logic in alert.js.
 * Runs without any test framework — just node.
 *
 * Scenarios tested:
 *   1. No false positive when CTR drop is caused solely by new queries appearing
 *   2. Alert fires correctly when existing queries collectively lose CTR
 *   3. sharedCount in the alert object matches the actual intersection size
 *   4. CTR_MIN_IMPRESSIONS guard is evaluated against shared-query totals
 */

// ─── Inline the CTR check logic (mirrors alert.js Check 3 exactly) ───────────

const CTR_DROP_THRESHOLD  = 0.10;
const CTR_MIN_IMPRESSIONS = 500;

function rollUpByQuery(rows) {
  const byQuery = {};
  for (const row of rows) {
    const [query] = row.keys;
    if (!byQuery[query]) byQuery[query] = { clicks: 0, impressions: 0, posAcc: 0, posImpAcc: 0 };
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

function checkCtr(beforeRows, afterRows) {
  const before = rollUpByQuery(beforeRows);
  const after  = rollUpByQuery(afterRows);

  const sharedQueries = Object.keys(before).filter(q => q in after);

  const totalBeforeImp    = sharedQueries.reduce((s, q) => s + before[q].impressions, 0);
  const totalAfterImp     = sharedQueries.reduce((s, q) => s + after[q].impressions,  0);
  const totalBeforeClicks = sharedQueries.reduce((s, q) => s + before[q].clicks,      0);
  const totalAfterClicks  = sharedQueries.reduce((s, q) => s + after[q].clicks,       0);

  const ctrBefore = totalBeforeImp > 0 ? totalBeforeClicks / totalBeforeImp : 0;
  const ctrAfter  = totalAfterImp  > 0 ? totalAfterClicks  / totalAfterImp  : 0;

  if (
    totalBeforeImp >= CTR_MIN_IMPRESSIONS &&
    totalAfterImp  >= CTR_MIN_IMPRESSIONS &&
    ctrBefore > 0
  ) {
    const ctrDrop = (ctrBefore - ctrAfter) / ctrBefore;
    if (ctrDrop > CTR_DROP_THRESHOLD) {
      return {
        fired:       true,
        ctrBefore,
        ctrAfter,
        ctrDropPct:  ctrDrop * 100,
        sharedCount: sharedQueries.length,
      };
    }
  }
  return { fired: false, sharedCount: sharedQueries.length };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function row(query, clicks, impressions, position = 5) {
  return { keys: [query, 'https://www.medidraken.se/'], clicks, impressions, position, ctr: clicks / impressions };
}

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.log(`  ❌  ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

// ─── Scenario 1: New queries appear → should NOT fire ────────────────────────
// Existing queries: stable CTR ~5 %
// New queries in "after": 300 impressions at 0 % CTR
// Without intersection fix this would pull aggregate CTR below threshold.

console.log('\nScenario 1: new queries in "after" — no false positive');

{
  const sharedRows = Array.from({ length: 20 }, (_, i) =>
    row(`query-shared-${i}`, 30, 600) // 5 % CTR each
  );

  const beforeRows = [...sharedRows];
  const afterRows  = [
    ...sharedRows,
    // 5 brand-new queries, 300 impressions total, 0 clicks → 0 % CTR
    ...Array.from({ length: 5 }, (_, i) =>
      row(`query-new-${i}`, 0, 60)
    ),
  ];

  const result = checkCtr(beforeRows, afterRows);
  assert('alert does not fire', !result.fired,
    `fired with ${result.ctrDropPct?.toFixed(1)}% drop`);
  assert('sharedCount = 20', result.sharedCount === 20,
    `got ${result.sharedCount}`);
}

// ─── Scenario 2: Existing queries lose CTR → SHOULD fire ─────────────────────

console.log('\nScenario 2: existing queries lose CTR — alert should fire');

{
  const beforeRows = Array.from({ length: 20 }, (_, i) =>
    row(`query-${i}`, 30, 600) // 5 % CTR
  );
  const afterRows = Array.from({ length: 20 }, (_, i) =>
    row(`query-${i}`, 15, 600) // 2.5 % CTR → 50 % relative drop
  );

  const result = checkCtr(beforeRows, afterRows);
  assert('alert fires', result.fired,
    'expected to fire but did not');
  assert('sharedCount = 20', result.sharedCount === 20,
    `got ${result.sharedCount}`);
  assert('ctrDropPct ≈ 50 %', Math.abs(result.ctrDropPct - 50) < 0.1,
    `got ${result.ctrDropPct?.toFixed(2)}%`);
}

// ─── Scenario 3: Mixed — new queries + real CTR drop ─────────────────────────
// Real CTR loss on shared queries should still fire even with new queries present.

console.log('\nScenario 3: new queries present AND existing queries lose CTR — alert fires');

{
  const beforeRows = Array.from({ length: 20 }, (_, i) =>
    row(`query-${i}`, 30, 600) // 5 % CTR
  );
  const afterRows = [
    ...Array.from({ length: 20 }, (_, i) =>
      row(`query-${i}`, 15, 600) // 2.5 % CTR on shared
    ),
    ...Array.from({ length: 10 }, (_, i) =>
      row(`query-new-${i}`, 0, 100) // new queries at 0 %
    ),
  ];

  const result = checkCtr(beforeRows, afterRows);
  assert('alert fires', result.fired);
  assert('sharedCount = 20 (new queries excluded)', result.sharedCount === 20,
    `got ${result.sharedCount}`);
}

// ─── Scenario 4: CTR_MIN_IMPRESSIONS guard — shared totals below floor ────────

console.log('\nScenario 4: shared impressions below CTR_MIN_IMPRESSIONS floor — no alert');

{
  // Only 2 shared queries, low impressions each
  const beforeRows = [row('q1', 5, 100), row('q2', 5, 100)];
  const afterRows  = [row('q1', 0, 100), row('q2', 0, 100),
                      // lots of new queries to inflate the after-total if fix wasn't applied
                      ...Array.from({ length: 50 }, (_, i) => row(`new-${i}`, 0, 20))];

  const result = checkCtr(beforeRows, afterRows);
  assert('alert does not fire (shared imp = 200, below 500 floor)', !result.fired);
  assert('sharedCount = 2', result.sharedCount === 2,
    `got ${result.sharedCount}`);
}

// ─── Result ───────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} assertions — ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
