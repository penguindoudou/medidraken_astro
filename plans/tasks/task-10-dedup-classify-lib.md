# Task 10: Dedup classify lib — wire analyze-gsc-data.js and generate-article-draft.js to lib/classify.js

**Status:** ✅ Done

## Problem

`lib/classify.js` exists as the single source of truth for all classification logic, but two scripts ignore it and carry inline copies instead:

- `scripts/gsc/analyze-gsc-data.js` — defines its own `EXPECTED_CTR`, `TAIL_CTR`, `NOISE_THRESHOLD`, `CTR_TOLERANCE`, `expectedCtr()`, `ctrGap()`, `opportunityScore()`, and `classifyQuery()` verbatim.
- `scripts/gsc/generate-article-draft.js` — does the same.

`lib/classify.js` was created in task-02a specifically to solve this problem, but only `action-plan.js` and `test-action-plan.js` were updated at the time. These two scripts were overlooked.

The risk: any refinement to the CTR table, position bands, or tier logic in `lib/classify.js` silently diverges from the copies in these two files. Results from `gsc:analyze` and `gsc:draft` can differ from `gsc:action-plan` for the same query.

## What to change

### `scripts/gsc/analyze-gsc-data.js`

1. Delete the inline constant and function definitions:
   - `EXPECTED_CTR` object
   - `TAIL_CTR`, `NOISE_THRESHOLD`, `CTR_TOLERANCE`
   - `expectedCtr()`
   - `ctrGap()`
   - `opportunityScore()`
   - `classifyQuery()`

2. Add at the top of the file:
   ```js
   import {
     EXPECTED_CTR, TAIL_CTR, NOISE_THRESHOLD, CTR_TOLERANCE,
     expectedCtr, ctrGap, opportunityScore, classifyQuery,
   } from './lib/classify.js';
   ```

3. Keep `normalizeUrl()` — it's specific to this script and not in the lib.

### `scripts/gsc/generate-article-draft.js`

Same removals and the same import. Check whether `TIER_PRIORITY` is used — if so, import it too.

## Acceptance criteria

1. `npm run gsc:analyze` produces identical output before and after (run against the same snapshot file).
2. `npm run gsc:draft` produces a draft without error.
3. Neither `analyze-gsc-data.js` nor `generate-article-draft.js` contains a definition of `classifyQuery` or `expectedCtr`.
4. `lib/classify.js` is unchanged.

## Verification

```bash
# Before: note the table output for a known query
npm run gsc:analyze

# Apply the change

# After: output should be byte-for-byte identical
npm run gsc:analyze

# Draft should work
npm run gsc:draft -- --keyword "massage"
```

## Notes

- This is a pure refactor — zero behaviour change.
- If `generate-article-draft.js` uses a locally-defined `classifyQuery` that has drifted from `lib/classify.js`, reconcile them first: the lib version is authoritative.
- Do not add new exports to `lib/classify.js` unless the function is genuinely shared. `normalizeUrl()` in `analyze-gsc-data.js` is output-formatting code and belongs where it is.
