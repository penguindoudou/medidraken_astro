# Task 4d: Stale reminder when gsc:log hasn't been run recently

**Status:** ✅ Done

## Problem

`gsc:log` is a manual command. If you forget to run it after a push, `plans/work-log.md` goes stale — and then the work-log check in `gsc:action-plan` (task-04a) gives false "no recent changes" signals because the log simply wasn't updated.

There is currently no feedback anywhere that the work-log itself is out of date.

## What to build

At the top of `gsc:action-plan` output, before any opportunity is rendered, check when the work-log was last updated and warn if it's been more than 3 days since the most recent entry.

### In `action-plan.js`

Add a `workLogFreshnessCheck()` function:

1. Read `plans/work-log.md`
2. Find the most recent date heading inside the `<!-- WORK-LOG-START -->` / `<!-- WORK-LOG-END -->` block (format: `## YYYY-MM-DD`)
3. Compare to today:
   - If most recent entry is ≤ 3 days old → silent (no output)
   - If most recent entry is 4–13 days old → print a soft reminder:
     ```
     ℹ  Work-log last updated N days ago — run npm run gsc:log if you've pushed content changes since then
     ```
   - If most recent entry is 14+ days old (or work-log is empty / missing) → print a stronger warning:
     ```
     ⚠️  Work-log is 14+ days old — stale-data checks may be unreliable. Run: npm run gsc:log
     ```
4. Print this check once, before the first opportunity block

### Threshold constants

- `WORK_LOG_SOFT_DAYS = 3` — days before soft reminder kicks in
- `WORK_LOG_STALE_DAYS = 14` — days before hard warning (same as the GSC lag constant)

## Acceptance criteria

1. When the work-log was updated today or within 3 days, no message is printed
2. When the work-log was last updated 4–13 days ago, the soft reminder is printed once before any opportunity block
3. When the work-log is 14+ days old or missing, the hard warning is printed
4. The check does not crash or affect the rest of the output if `plans/work-log.md` does not exist
5. `npm run gsc:action-plan` still works end-to-end

## Context files to read

- `scripts/gsc/action-plan.js` — add `workLogFreshnessCheck()` and call it once at the top of the entry point block, before the `take.forEach(...)` loop
- `plans/work-log.md` — understand the date heading format (`## YYYY-MM-DD`) and anchor structure

## Notes

- Parse only the date from the `## YYYY-MM-DD` heading — don't rely on file mtime, which is unreliable after git checkouts
- This check complements task-04a: 04a warns per-page when a match is found; 04d warns globally when the log itself is out of date
- If task-04c (grouped format) is implemented, the date heading `## YYYY-MM-DD` is not changed by that task — the parser here will still work
