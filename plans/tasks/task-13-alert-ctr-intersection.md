# Task 13: Fix CTR drop alert to use snapshot intersection

**Status:** ✅ Done

## Problem

`alert.js` calculates the site-wide CTR drop check by comparing the raw aggregate CTR across two full snapshots:

```
oldCtr = totalClicks(before) / totalImpressions(before)
newCtr = totalClicks(after)  / totalImpressions(after)
```

This is incorrect. If new pages or queries appeared between snapshots (freshly indexed pages, new keyword associations) they contribute impressions but have near-zero CTR at first — pulling the aggregate down even when nothing degraded. The alert fires as a false positive.

Example: Suppose a new page gets indexed and GSC starts reporting 300 impressions for new queries at 0% CTR. The aggregate CTR drops by ~12%. The alert fires. No actual ranking dropped.

## What to change

**File:** `scripts/gsc/alert.js`

In the site-wide CTR check, compute CTR only for queries present in **both** snapshots (intersection):

```js
// Current (incorrect):
const oldTotalImps   = before.reduce((s, r) => s + r.impressions, 0);
const oldTotalClicks = before.reduce((s, r) => s + r.clicks, 0);
const newTotalImps   = after.reduce((s, r) => s + r.impressions, 0);
const newTotalClicks = after.reduce((s, r) => s + r.clicks, 0);

// Fixed:
// Build a key from query+page (same aggregation used by the rest of the script)
function rowKey(r) {
  return `${r.keys[0]}||${r.keys[1]}`;
}

const beforeMap = new Map(before.map(r => [rowKey(r), r]));
const afterMap  = new Map(after.map(r  => [rowKey(r), r]));

// Intersection: only rows present in both snapshots
const sharedKeys = [...beforeMap.keys()].filter(k => afterMap.has(k));

const oldTotalImps   = sharedKeys.reduce((s, k) => s + beforeMap.get(k).impressions, 0);
const oldTotalClicks = sharedKeys.reduce((s, k) => s + beforeMap.get(k).clicks, 0);
const newTotalImps   = sharedKeys.reduce((s, k) => s + afterMap.get(k).impressions, 0);
const newTotalClicks = sharedKeys.reduce((s, k) => s + afterMap.get(k).clicks, 0);
```

The CTR thresholds and minimum-impressions guard remain unchanged.

Also update the alert message to note this is computed on shared queries:

```
⚠️  Site-wide CTR dropped by X% (shared queries only — N queries in both snapshots)
```

## Acceptance criteria

1. `npm run gsc:alert` does not fire a false CTR drop when the only change between snapshots is new queries appearing.
2. The alert still fires correctly when existing queries collectively lose CTR.
3. The alert output notes `(shared queries only — N queries in both snapshots)`.
4. The minimum-impressions guard (`CTR_MIN_IMPRESSIONS = 500`) still applies — it is now evaluated against the shared-query totals.
5. All other alert checks (position drops, disappeared pages, new cannibalization) are unchanged.

## Verification

To test the false-positive fix: if you have two snapshots where the second has noticeably more rows (new pages indexed), run `npm run gsc:alert` before and after the fix and confirm the CTR alert no longer fires spuriously.

```bash
# Check snapshot row counts to find a good test pair
ls -la plans/gsc-data/gsc-keywords-*.json

# Run alert (should not fire CTR warning if new queries are the cause)
npm run gsc:alert
```

## Notes

- This only changes the site-wide CTR aggregation. Per-query CTR is not involved in this check.
- The intersection approach is the standard method for week-over-week CTR comparison in GSC analysis — comparing totals across changing query sets is a known measurement error.
- `compare-snapshots.js` already does a per-query diff so it is not affected.
