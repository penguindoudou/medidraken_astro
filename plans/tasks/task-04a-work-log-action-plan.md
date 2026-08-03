# Task 4a: Wire work-log check into gsc:action-plan

**Status:** ✅ Done

## Problem

`gsc:action-plan` already checks `plans/gsc-tracked.json` for recently tracked keywords. But `gsc-tracked.json` only contains pages you explicitly tagged with `gsc:track`. If a page was rewritten and committed but never tracked, the stale-data check passes silently — even though the work-log has a record of the change.

The two signals are complementary:

| Source | What it tracks |
|--------|---------------|
| `gsc-tracked.json` | Queries you explicitly flagged with `gsc:track` |
| `plans/work-log.md` | Every `.astro`/`.md` file touched in any git commit |

A page can appear as a `🟢 Quick win` in action-plan, have no entry in `gsc-tracked.json`, but have a work-log entry from 3 days ago. Currently that is a silent false positive. Work-log would catch it.

## What to build

Add a `workLogCheck(sourceFile)` function in `action-plan.js`:

1. Read `plans/work-log.md` (gracefully return null if missing)
2. Parse the entries between `<!-- WORK-LOG-START -->` and `<!-- WORK-LOG-END -->`
3. Look for any line that starts with `- \`<sourceFile>\`` where sourceFile matches the mapped source file for the ranking URL
4. Extract the `measure after: YYYY-MM-DD` date from the matching line
5. Compare against today:
   - If measure-after date is in the future → return a stale warning with days remaining
   - If measure-after date is past → return null (no warning needed)
   - If no match → return null

In `renderActionPlan()`, incorporate the result after the existing `staleDataLine()`:
- If both checks fire, show both (they track different things)
- If only work-log fires, show it with a clear label so the source is obvious

## Acceptance criteria

1. When the source file for a query has a work-log entry with a future measure-after date, the action-plan output shows a warning including the date and days remaining
2. When the entry's measure-after date is already past, no warning is shown
3. When the source file has no work-log entry, output is unchanged
4. When `plans/work-log.md` does not exist, no crash — silent skip
5. The check works for both single-keyword and `--top N` modes
6. `npm run gsc:action-plan` still works end-to-end

## Context files to read

- `scripts/gsc/action-plan.js` — `staleDataLine()` and `renderActionPlan()` are the integration points; `mapUrlToSourceFile()` gives you the source file path
- `plans/work-log.md` — understand the entry format and anchor structure
- `scripts/gsc/update-work-log.js` — see how entries are written (format reference)

## Notes

- Match the source file path with simple string includes — the work-log stores paths like `` `src/pages/foo.astro` `` with backticks, so strip those when comparing
- This check is additive to `staleDataLine()`, not a replacement — they cover different cases
- The 14-day lag constant is already defined in `action-plan.js` as `STALE_DAYS`; reuse it here rather than hardcoding a new value
