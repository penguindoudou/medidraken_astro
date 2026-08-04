# Task 17: Add gsc:prune — clean up old snapshots

**Status:** ✅ Done

## Problem

`plans/gsc-data/` accumulates snapshot files forever. After 6 months of weekly fetches this becomes 25+ keyword snapshots plus matching audit files, schema audits, and cleanup reports. `compare-snapshots.js` and `alert.js` only use the two most recent files — everything older is deadweight unless you want long-range lookups.

No cleanup mechanism exists today. You'd have to manually `rm` old files.

## What to build

**New file:** `scripts/gsc/prune-snapshots.js`

A simple pruning script that:

1. Reads all `gsc-keywords-*.json` files in `plans/gsc-data/`.
2. Keeps the N most recent files (configurable, default 12 — roughly 3 months of weekly fetches).
3. Additionally keeps any file whose date falls on the 1st of the month (monthly checkpoint), regardless of age — so you always have one per month going back.
4. Deletes the rest.
5. Runs as `--dry-run` by default — prints what would be deleted without touching anything.
6. Pass `--confirm` to actually delete.

Does **not** touch canon-audit, canon-cleanup, or schema-audit files — those are sparse and useful for long-range reference.

### Suggested logic

```
Keep set = (N most recent by filename sort) ∪ (any file dated YYYY-MM-01)
Delete set = all gsc-keywords-*.json NOT in the keep set
```

### Add npm script

```json
"gsc:prune": "node scripts/gsc/prune-snapshots.js",
"gsc:prune:run": "node scripts/gsc/prune-snapshots.js --confirm"
```

The default `gsc:prune` is always a dry run. `gsc:prune:run` actually deletes.

## Acceptance criteria

1. `npm run gsc:prune` prints a list of files that would be deleted without deleting any.
2. `npm run gsc:prune:run` deletes the files listed in the dry run.
3. After `gsc:prune:run`, `npm run gsc:alert` still works (two most recent files are present).
4. After `gsc:prune:run`, `npm run gsc:compare` still works.
5. The first-of-month files are retained regardless of age.
6. Canon audit, cleanup, and schema audit files are untouched.

## Verification

```bash
# Dry run — should print what would be deleted
npm run gsc:prune

# Confirm alert still works after a dry run (nothing changed)
npm run gsc:alert

# Actual prune (use only when ready)
npm run gsc:prune:run

# Verify alert still works after the prune
npm run gsc:alert
npm run gsc:compare
```

## Notes

- Default of 12 keeps files (`--keep 12`) = ~3 months at weekly cadence. Adjust as the site matures.
- First-of-month retention means you can always reconstruct a monthly trend even after pruning — useful for the CTR benchmark calibration in task-09.
- This script intentionally does not prune canon or schema files. Those are created far less often (usually only when you run a specific audit) and their file count stays low naturally.
- Consider adding a `--keep N` flag if the default doesn't fit your cadence.
