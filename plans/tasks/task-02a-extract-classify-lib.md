# Task 2a: Extract classify lib — eliminate copy-paste between action-plan.js and test file

**Status:** ✅ Done

## Problem

`scripts/gsc/test-action-plan.js` duplicates all the pure logic from `action-plan.js` verbatim:
- `EXPECTED_CTR`, `TAIL_CTR`, `NOISE_THRESHOLD`, `CTR_TOLERANCE` constants
- `expectedCtr()`, `ctrGap()`, `classifyQuery()`, `routeAction()` functions

If you refine a classification threshold or add a new routing branch in `action-plan.js`, you have to remember to update the test file too — and nothing will warn you if they drift apart.

## What to build

Extract the pure, testable functions into a shared module: `scripts/gsc/lib/classify.js`.

Both `action-plan.js` and `test-action-plan.js` import from it. The logic stays in one place.

## Scope

**New file:**
- `scripts/gsc/lib/classify.js` — exports all constants and pure functions

**Modified files:**
- `scripts/gsc/action-plan.js` — replace inline definitions with `import` from `lib/classify.js`
- `scripts/gsc/test-action-plan.js` — replace inline copies with `import` from `lib/classify.js`

**Functions to extract:**
```
EXPECTED_CTR, TAIL_CTR, NOISE_THRESHOLD, CTR_TOLERANCE
expectedCtr(position)
ctrGap(actualCtr, position)
opportunityScore(impressions, actualCtr, position)
classifyQuery(avgPosition, actualCtr, impressions)
routeAction(entry)
TIER_PRIORITY
```

> **Note:** `routeAction` has no side effects and no I/O — it's a pure function and belongs in the lib alongside `classifyQuery`.

## What stays in action-plan.js

Everything that touches the filesystem or produces output:
- `mapUrlToSourceFile()`
- `loadSnapshot()` / `findLatestSnapshot()`
- `parseArgs()` / `pickQuery()`
- `renderActionPlan()`
- Entry point / CLI wiring

## Acceptance criteria

1. `node scripts/gsc/test-action-plan.js` passes all 35 tests after the refactor
2. `npm run gsc:action-plan` still works end-to-end
3. `scripts/gsc/lib/classify.js` contains the single source of truth for all classification logic
4. Neither `action-plan.js` nor `test-action-plan.js` defines `classifyQuery` or `routeAction` inline
