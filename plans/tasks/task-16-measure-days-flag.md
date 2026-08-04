# Task 16: Add --measure-days flag to update-work-log.js

**Status:** ✅ Done

## Problem

`update-work-log.js` hard-codes the measurement window at 14 days:

```js
const MEASURE_DAYS = 14;
```

This is based on the GSC data lag (up to 2 weeks). But the lag varies: high-traffic pages sometimes reflect changes within 3–4 days. There's no way to override the window without editing the source file.

In practice, if you've made a minor change (a single title tag rewrite) and you want to check signal after 7 days, you have to manually edit the work-log entry or wait. A `--measure-days` flag makes this a one-liner.

## What to change

**File:** `scripts/gsc/update-work-log.js`

### 1. Read the flag from CLI args

The file already has a `getFlag()` helper. Add:

```js
const MEASURE_DAYS = parseInt(getFlag('measure-days') ?? '14', 10);
```

Replace the existing `const MEASURE_DAYS = 14;` line.

### 2. Validate the value

```js
if (isNaN(MEASURE_DAYS) || MEASURE_DAYS < 1 || MEASURE_DAYS > 90) {
  console.error('--measure-days must be a number between 1 and 90');
  process.exit(1);
}
```

### 3. Update the README

In `scripts/gsc/README.md`, add to the `update-work-log.js` usage block:

```bash
npm run gsc:log -- --measure-days 7    # use 7-day window instead of default 14
```

## Acceptance criteria

1. `npm run gsc:log` (no flag) still uses 14 days — default is unchanged.
2. `npm run gsc:log -- --measure-days 7` generates entries with `measure after` dates 7 days out.
3. `npm run gsc:log -- --measure-days 0` or `--measure-days 91` prints an error and exits non-zero.
4. `--dry-run` still works in combination with `--measure-days`.

## Verification

```bash
# Default — check measure-after date is 14 days from today
npm run gsc:log -- --dry-run
# Confirm "measure after" dates are today + 14

# Custom — check measure-after date is 7 days from today
npm run gsc:log -- --dry-run --measure-days 7
# Confirm "measure after" dates are today + 7

# Invalid — should error
npm run gsc:log -- --measure-days 0
```

## Notes

- The `MEASURE_DAYS` constant is used in `addDays(commitDate, MEASURE_DAYS)`. The variable name stays the same — only the source of the value changes.
- Don't change `--since` or `--n` flag parsing — they're separate and unrelated.
- This flag is intentionally per-run, not per-entry. If you need different windows for different commits in the same run, that's a more complex feature for later.
