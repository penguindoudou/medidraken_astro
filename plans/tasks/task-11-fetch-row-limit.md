# Task 11: Increase fetch row limit — 500 → 25000

**Status:** ✅ Done

## Problem

`fetch-gsc-queries.js` requests at most 500 rows from the GSC Search Analytics API:

```js
rowLimit: 500,
```

The API maximum is 25,000. At 500 rows you're missing long-tail queries, low-impression pages, and any query that didn't make the top 500 by impressions. The API returns no error when it truncates — it just silently caps the response. There's currently no log line that warns when the limit is reached.

Concrete impact: `gsc:analyze`, `gsc:alert`, and `gsc:action-plan` all work from the saved snapshot. Any query or page not captured in the 500-row cap is invisible to the entire pipeline.

## What to change

**File:** `scripts/gsc/fetch-gsc-queries.js`

### 1. Increase the row limit

```js
// Before
rowLimit: 500,

// After
rowLimit: 25000,
```

### 2. Add a cap-hit warning

After the fetch, log a warning if the response returned exactly the limit (likely truncated):

```js
const rows = res.data.rows || [];
console.log(`Retrieved ${rows.length} search query/page combinations.`);

if (rows.length === 25000) {
  console.warn(
    '⚠️  Response hit the 25,000-row limit — some queries may be missing. ' +
    'Consider narrowing the date range or adding a second dimension filter.'
  );
}
```

## Acceptance criteria

1. `fetch-gsc-queries.js` sends `rowLimit: 25000` in the API request body.
2. The saved snapshot file contains more rows than before (verify against the previous snapshot count if available).
3. A warning is printed when `rows.length === 25000`.
4. No other behaviour changes — auth, date range, output path, and file format are identical.

## Verification

```bash
# Check the current snapshot row count
node -e "const d=require('./plans/gsc-data/gsc-keywords-$(date +%Y-%m-%d).json'); console.log(d.length)"

# Run the fetch
npm run gsc:fetch

# Check new count
node -e "const d=require('./plans/gsc-data/gsc-keywords-$(date +%Y-%m-%d).json'); console.log(d.length)"
```

## Notes

- The GSC API quota is not per-row — it's per request. Raising the row limit has no quota cost.
- 25,000 rows is the hard cap documented in the GSC API reference. Do not set higher.
- If the site grows and regularly hits 25,000 rows, the next step is date-range pagination (multiple requests over sub-ranges). That's a future task.
