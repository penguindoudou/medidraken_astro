# Task 2c: Automate the stale-data check in gsc:action-plan

**Status:** ✅ Done

## Problem

Every `gsc:action-plan` output currently ends with a static boilerplate block:

```
⚠️  STALE DATA CHECK
Before acting, check plans/gsc-tracked.json to confirm this page has
not been recently updated. GSC data lags up to 2 weeks behind live changes.
```

After seeing this 10+ times, you stop reading it. It's a reminder to do a manual check — not an actual check. The data needed to automate it already exists in `plans/gsc-tracked.json`.

## What to build

In `renderActionPlan()`, replace the static boilerplate with a live check:

1. Load `plans/gsc-tracked.json` (if it exists — gracefully skip if not)
2. Find any tracked entry whose `page` matches the ranking URL for the current query
3. Output one of:
   - `✅ Not recently tracked — signal is fresh` (no match found, or last tracked > 14 days ago)
   - `⚠️  Last tracked X days ago — GSC may not reflect this change yet` (match found, tracked < 14 days ago, with the note from the tracked entry shown)
   - `⚠️  Tracked today or this week — signal is definitely stale` (tracked < 7 days ago, stronger warning)

The "days ago" should be calculated from the tracked entry's `date` field (ISO string) against today's date.

## Acceptance criteria

1. When the ranking URL for a query has **no** entry in `gsc-tracked.json`, the output shows `✅ Not recently tracked — signal is fresh`
2. When the ranking URL was tracked **< 14 days ago**, the output shows the warning with the number of days and the note from the tracked entry
3. When `plans/gsc-tracked.json` does not exist or is empty, output falls back to the current static message (no crash)
4. `npm run gsc:action-plan` still works end-to-end
5. The check works for both single-keyword and `--top N` modes

## Context files to read

- `scripts/gsc/track-queries.js` — understand the shape of entries in `gsc-tracked.json`
- `plans/gsc-tracked.json` — see real tracked entries (may be empty at time of implementation)

## Notes

- This is a partial substitute for task 4 (work-log). Task 4 will eventually track *all* content changes via git diff — this improvement only covers pages explicitly tagged with `gsc:track`. It's still a meaningful improvement over the current static warning.
- The stale-data threshold of 14 days matches the documented GSC lag. Consider making it a named constant.
