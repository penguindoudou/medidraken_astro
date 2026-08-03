# Task 4e: Auto-run gsc:log on git push via post-push hook

**Status:** ✅ Done

## Problem

`gsc:log` is currently a manual command. It needs to run right after every `git push` so the work-log always reflects the latest deploy without any manual step.

Additionally, the measure-after date in the work-log is currently calculated from the **commit date** (`%as` in git log). The correct base is the **deploy/push date** — a commit sitting unpushed for days hasn't changed anything on the live site, so the 14-day GSC lag window should start from push, not commit.

## What to build

### 1. Fix measure-after date in `update-work-log.js`

Replace commit-date-based calculation with today's date:

```js
// Before
const measureAfter = addDays(date, MEASURE_DAYS);  // date = commit date from git log

// After
const today = new Date().toISOString().slice(0, 10);  // YYYY-MM-DD
const measureAfter = addDays(today, MEASURE_DAYS);
```

The `addDays()` helper already exists — just change what date is passed to it.
`MEASURE_DAYS = 14` stays unchanged.

### 2. Create `.git/hooks/post-push`

```sh
#!/bin/sh
npm run gsc:log
```

Make it executable:
```sh
chmod +x .git/hooks/post-push
```

That's it. `post-push` fires immediately after `git push` completes, before the terminal returns. Since this is a solo project with a single branch, no branch filtering is needed now.

## Acceptance criteria

1. After `git push`, `gsc:log` runs automatically and the work-log is updated with today's date as the base for measure-after
2. When `gsc:log` is run manually (standalone), measure-after is still calculated from today's date — this is acceptable since standalone use is not a real workflow for this project
3. Entries already in the work-log are not duplicated (deduplication by commit hash is unchanged)
4. `npm run gsc:action-plan` still works end-to-end and the work-log check in 4a still fires correctly

## Context files to read

- `scripts/gsc/update-work-log.js` — find the `buildNewBlock()` function; `measureAfter` is set there using `addDays(date, MEASURE_DAYS)` where `date` comes from the commit. Change `date` to today's date string.
- `plans/work-log.md` — verify the measure-after date format after the change (`YYYY-MM-DD`)
- `.git/hooks/` — confirm no existing post-push hook before creating one

## Notes

- `.git/hooks/` is not tracked by git — this is intentional for a solo project. No setup overhead for contributors is needed.
- The hook fires after push completes, so today's date = push date = Cloudflare deploy date (same day, which is all the precision needed for a 14-day window)
- If a prod/dev branch split is added later, update the hook to filter by branch: `branch=$(git rev-parse --abbrev-ref HEAD); if [ "$branch" = "main" ]; then npm run gsc:log; fi`
- Task 4d (stale reminder in action-plan) becomes a redundant safety net once this is in place — the log will always be current after every push. It can be left as-is or stripped.
