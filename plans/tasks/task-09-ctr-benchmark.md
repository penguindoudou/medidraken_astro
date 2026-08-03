# Task 9: CTR Benchmark Calibration

**Status:** ⬜ Todo — revisit ~October 2026
**Effort:** Small (~1–2h when ready)

## What

Replace the hardcoded industry-average CTR table in `analyze-gsc-data.js` and `generate-article-draft.js` with a site-specific curve derived from Medidraken's own ranking data.

## Why

The current expected CTR values come from aggregated studies (Sistrix, Backlinko, AWR). These are generic averages across all industries and languages. Swedish health/wellness queries may behave differently — TCM searchers tend to be more deliberate, and niche health queries often have higher CTR at lower positions than e-commerce averages suggest.

Using site-specific data makes the opportunity scoring more accurate: fewer false positives (pages flagged as underperforming that are actually normal for this niche), better prioritization of real quick wins.

## When to do this

Once you have ~3–6 months of weekly snapshots. You need enough position-1 data points across different queries to fit a reliable curve. Started running weekly fetches in July 2026 → earliest meaningful calibration: October 2026.

**The data is already accumulating.** No action needed now except keeping `npm run gsc:fetch` running weekly without gaps.

## What to build (when ready)

**`scripts/gsc/calibrate-ctr.js`** — reads all accumulated snapshots in `plans/gsc-data/`, extracts queries where position is 1–3 (most reliable signal), computes actual average CTR per position band, and outputs a replacement `EXPECTED_CTR` object to paste into the analysis scripts.

New npm script: `gsc:calibrate`

## Current hardcoded values (for reference)

```js
// In analyze-gsc-data.js and generate-article-draft.js
const EXPECTED_CTR = {
  1: 0.284, 2: 0.152, 3: 0.103, 4: 0.073, 5: 0.056,
  6: 0.044, 7: 0.035, 8: 0.029, 9: 0.024, 10: 0.020,
  // ...
};
```

## Context files to read before implementing

- `scripts/gsc/analyze-gsc-data.js` — `EXPECTED_CTR` constant at top of file
- `scripts/gsc/generate-article-draft.js` — duplicate of the same constant, update both
- All `plans/gsc-data/gsc-keywords-*.json` files accumulated by then
