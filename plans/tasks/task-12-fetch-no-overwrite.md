# Task 12: Prevent same-day fetch from silently overwriting snapshot

**Status:** ✅ Done

## Problem

`fetch-gsc-queries.js` names output files by today's date:

```js
const outputFile = path.join(outputDir, `gsc-keywords-${endDate}.json`);
fs.writeFileSync(outputFile, JSON.stringify(rows, null, 2));
```

If you run `gsc:fetch` twice on the same day — or if `gsc:run` is re-triggered after a partial failure — the second run silently overwrites the first. You lose the earlier snapshot, and the next `gsc:compare` or `gsc:alert` run has no "before" to diff against from that day.

This is most likely to bite you when:
- You run `gsc:run`, it fails mid-chain, you fix the error and re-run.
- You fetch manually in the morning, then run the full chain later in the day.

## What to change

**File:** `scripts/gsc/fetch-gsc-queries.js`

Check if a same-day file already exists before writing. If it does, add a time suffix instead of overwriting:

```js
let outputFile = path.join(outputDir, `gsc-keywords-${endDate}.json`);

if (fs.existsSync(outputFile)) {
  // e.g. gsc-keywords-2026-08-04-103022.json
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(11, 19);
  const altFile = path.join(outputDir, `gsc-keywords-${endDate}-${ts}.json`);
  console.warn(
    `⚠️  Same-day snapshot already exists at ${path.basename(outputFile)}.\n` +
    `   Saving to ${path.basename(altFile)} instead to avoid overwriting.`
  );
  outputFile = altFile;
}

fs.writeFileSync(outputFile, JSON.stringify(rows, null, 2));
console.log(`Saved GSC data to ${outputFile}`);
```

## Acceptance criteria

1. Running `gsc:fetch` twice on the same day produces two separate files, not one overwritten file.
2. The second file is named `gsc-keywords-YYYY-MM-DD-HHmmss.json`.
3. A clear warning is printed on the second run.
4. The first run (no existing file) behaves exactly as before — no warning, same filename pattern.
5. `compare-snapshots.js` and `alert.js` still auto-select the two most recent files correctly (they sort by filename — the timestamp suffix sorts correctly after the plain date).

## Verification

```bash
# First fetch (should be silent, saves gsc-keywords-YYYY-MM-DD.json)
npm run gsc:fetch

# Second fetch same day (should warn, saves gsc-keywords-YYYY-MM-DD-HHmmss.json)
npm run gsc:fetch

# Both files should exist
ls plans/gsc-data/gsc-keywords-$(date +%Y-%m-%d)*.json

# Alert should still work (picks two most recent by sorted filename)
npm run gsc:alert
```

## Notes

- The timestamp format `HHmmss` (e.g. `103022` for 10:30:22) keeps filenames sortable and avoids colons that are invalid on some filesystems.
- `compare-snapshots.js` and `alert.js` both sort filenames alphabetically to pick the two most recent. The `YYYY-MM-DD-HHmmss` pattern sorts correctly after `YYYY-MM-DD` (which sorts as `YYYY-MM-DD-` effectively), so no changes needed to those scripts.
- Do not add a `--force` flag to override this check — if you genuinely want to overwrite, delete the file manually first. Silent overwrites are the bug we're fixing.
