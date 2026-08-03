/**
 * test-action-plan.js
 *
 * Verifies that classifyQuery and routeAction route every combination of
 * position / CTR / impressions to the correct tier and action type.
 *
 * Run: node scripts/gsc/test-action-plan.js
 */

// ---------------------------------------------------------------------------
// Import from the shared lib (single source of truth)
// ---------------------------------------------------------------------------

import {
  EXPECTED_CTR,
  TAIL_CTR,
  expectedCtr,
  classifyQuery,
  routeAction,
} from './lib/classify.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function makeEntry(avgPosition, actualCtr, impressions = 50, pages = ['example.com/page']) {
  const { tag, description } = classifyQuery(avgPosition, actualCtr, impressions);
  return { avgPosition, actualCtr, impressions, tag, description, pages, query: 'test query' };
}

function ctrFor(position, multiplier = 1) {
  return (EXPECTED_CTR[Math.round(position)] ?? TAIL_CTR) * multiplier;
}

function assert(label, actual, expected) {
  if (actual === expected) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.error(`  ❌  ${label}`);
    console.error(`       expected: ${expected}`);
    console.error(`       got:      ${actual}`);
    failed++;
  }
}

// helper: underperforming CTR that stays above the 🔴 Snippet threshold (0.005).
// Uses 0.70× expected, floored at just above 0.005 so the Snippet guard doesn't
// fire before the position-based logic runs.
function underCtr(position) {
  return Math.max(ctrFor(position, 0.70), 0.0051);
}

console.log('\n── classifyQuery ──────────────────────────────────────────────────────\n');

// Noise
assert(
  'Noise: < 5 impressions',
  classifyQuery(5, 0.01, 3).tag,
  '⚫ Noise',
);

// Broken snippet (near-zero CTR, enough impressions)
assert(
  'Snippet: CTR 0.001, 50 impressions',
  classifyQuery(8, 0.001, 50).tag,
  '🔴 Snippet',
);

// Top 3 – underperforming CTR
assert(
  'Push CTR: pos 2, CTR well below expected',
  classifyQuery(2, ctrFor(2, 0.5), 50).tag,
  '🟡 Push CTR',
);

// Top 3 – healthy CTR
assert(
  'Protect: pos 1, CTR at expected',
  classifyQuery(1, ctrFor(1, 1.0), 50).tag,
  '🔵 Protect',
);

// Position 3 healthy
assert(
  'Protect: pos 3, CTR at expected',
  classifyQuery(3, ctrFor(3, 1.0), 50).tag,
  '🔵 Protect',
);

// 4–10 underperforming → Quick win
assert(
  'Quick win: pos 4, CTR below expected',
  classifyQuery(4, ctrFor(4, 0.5), 50).tag,
  '🟢 Quick win',
);
assert(
  'Quick win: pos 7, CTR below expected',
  classifyQuery(7, ctrFor(7, 0.5), 50).tag,
  '🟢 Quick win',
);
assert(
  'Quick win: pos 10, CTR below expected',
  classifyQuery(10, ctrFor(10, 0.5), 50).tag,
  '🟢 Quick win',
);

// 4–10 normal CTR → Push rank
assert(
  'Push rank: pos 5, CTR at expected',
  classifyQuery(5, ctrFor(5, 1.0), 50).tag,
  '🟠 Push rank',
);

// 4–10 overperforming → Gem
assert(
  'Gem: pos 6, CTR above expected',
  classifyQuery(6, ctrFor(6, 1.5), 50).tag,
  '🌟 Gem',
);

// 11–20 underperforming → Push rank+
// Use underCtr() — at pos 15–20 expected CTR is very low (≤ 0.010), so
// multiplier 0.5 would drop below the 🔴 Snippet threshold (0.005).
// underCtr() gives 0.70× expected — still clearly underperforming, above 0.005.
// Note: pos 20 has expected CTR of 0.006, so 0.70× = 0.0042 < 0.005 — the
// underperforming test is physically impossible there. Test pos 19 as boundary.
assert(
  'Push rank+: pos 11, CTR below expected',
  classifyQuery(11, underCtr(11), 50).tag,
  '🟠 Push rank+',
);
assert(
  'Push rank+: pos 15, CTR below expected',
  classifyQuery(15, underCtr(15), 50).tag,
  '🟠 Push rank+',
);
assert(
  'Push rank+: pos 19, CTR below expected (boundary)',
  classifyQuery(19, underCtr(19), 50).tag,
  '🟠 Push rank+',
);
// pos 20: expected CTR is 0.006 — within 20% tolerance of 0.0051 floor, so it
// cannot be "underperforming". Normal CTR → Push rank is correct here.
assert(
  'Push rank: pos 20, CTR at expected (underperforming unreachable at this position)',
  classifyQuery(20, ctrFor(20, 1.0), 50).tag,
  '🟠 Push rank',
);

// 11–20 normal CTR → Push rank
assert(
  'Push rank: pos 15, CTR at expected',
  classifyQuery(15, ctrFor(15, 1.0), 50).tag,
  '🟠 Push rank',
);

// 11–20 overperforming → Gem
assert(
  'Gem: pos 18, CTR above expected',
  classifyQuery(18, ctrFor(18, 1.5), 50).tag,
  '🌟 Gem',
);

// 21+ normal → Content
// The Snippet guard is now gated to pos ≤ 20, so low-CTR deep positions
// no longer get misclassified as Snippet.
assert(
  'Content: pos 25, CTR at expected',
  classifyQuery(25, ctrFor(25, 1.0), 50).tag,
  '🟡 Content',
);

// 21+ overperforming → Gem
assert(
  'Gem: pos 28, CTR above expected',
  classifyQuery(28, ctrFor(28, 1.5), 50).tag,
  '🌟 Gem',
);

// ---------------------------------------------------------------------------
// routeAction tests
// ---------------------------------------------------------------------------

console.log('\n── routeAction ────────────────────────────────────────────────────────\n');

// Cannibalization
assert(
  'consolidate: multiple pages for same query',
  routeAction(makeEntry(5, ctrFor(5, 1.0), 50, ['a.com/x', 'a.com/y'])).type,
  'consolidate',
);

// fix-snippet (🔴 Snippet)
assert(
  'fix-snippet: broken snippet tag',
  routeAction(makeEntry(8, 0.001, 50)).type,
  'fix-snippet',
);

// push-ctr (🟡 Push CTR)
assert(
  'push-ctr: top-3 low CTR',
  routeAction(makeEntry(2, ctrFor(2, 0.5), 50)).type,
  'push-ctr',
);

// protect (🔵 Protect)
assert(
  'protect: top-3 healthy CTR',
  routeAction(makeEntry(1, ctrFor(1, 1.0), 50)).type,
  'protect',
);

// rewrite-snippet — pos 4 (previously fell through to new-content)
assert(
  'rewrite-snippet: pos 4 Quick win (was bug — fell through)',
  routeAction(makeEntry(4, ctrFor(4, 0.5), 50)).type,
  'rewrite-snippet',
);
assert(
  'rewrite-snippet: pos 7 Quick win',
  routeAction(makeEntry(7, ctrFor(7, 0.5), 50)).type,
  'rewrite-snippet',
);
assert(
  'rewrite-snippet: pos 10 Quick win',
  routeAction(makeEntry(10, ctrFor(10, 0.5), 50)).type,
  'rewrite-snippet',
);

// deepen-content — pos 4 Push rank (previously fell through to new-content)
assert(
  'deepen-content: pos 4 Push rank (was bug — fell through)',
  routeAction(makeEntry(4, ctrFor(4, 1.0), 50)).type,
  'deepen-content',
);
assert(
  'deepen-content: pos 5 Push rank',
  routeAction(makeEntry(5, ctrFor(5, 1.0), 50)).type,
  'deepen-content',
);
assert(
  'deepen-content: pos 20 Push rank',
  routeAction(makeEntry(20, ctrFor(20, 1.0), 50)).type,
  'deepen-content',
);

// push-rank-and-snippet — new action type for 11–20 underperformers
// Use underCtr() to stay above the 🔴 Snippet threshold (see classifyQuery tests above).
assert(
  'push-rank-and-snippet: pos 11 Push rank+',
  routeAction(makeEntry(11, underCtr(11), 50)).type,
  'push-rank-and-snippet',
);
assert(
  'push-rank-and-snippet: pos 16 Push rank+ (was bug — fell through to new-content)',
  routeAction(makeEntry(16, underCtr(16), 50)).type,
  'push-rank-and-snippet',
);
assert(
  'push-rank-and-snippet: pos 19 Push rank+ (boundary)',
  routeAction(makeEntry(19, underCtr(19), 50)).type,
  'push-rank-and-snippet',
);
// At pos 25 the tail CTR (0.004) is below the snippet threshold, but the
// Snippet guard is now gated to positions ≤ 20, so this routes correctly.
assert(
  'expand-or-support: pos 25 Content',
  routeAction(makeEntry(25, ctrFor(25, 1.0), 50)).type,
  'expand-or-support',
);

// push-ranking — Gem
assert(
  'push-ranking: Gem at pos 6',
  routeAction(makeEntry(6, ctrFor(6, 1.5), 50)).type,
  'push-ranking',
);
assert(
  'push-ranking: Gem at pos 18',
  routeAction(makeEntry(18, ctrFor(18, 1.5), 50)).type,
  'push-ranking',
);

// new-content — Noise falls through to new-content
assert(
  'new-content: Noise (< 5 impressions)',
  routeAction(makeEntry(10, ctrFor(10, 1.0), 3)).type,
  'new-content',
);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${'─'.repeat(72)}`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`${'─'.repeat(72)}\n`);

if (failed > 0) process.exit(1);
