# Task 1: Anomaly Alert (post-fetch)

**Status:** ⬜ Todo

## What

A script that runs automatically after `gsc:fetch` and prints loud warnings if something significant changed since the last snapshot — without manually running `gsc:compare` and eyeballing it.

Add as `npm run gsc:alert` and wire it into `gsc:run` so it fires every fetch cycle.

## Why

Ranking drops compound silently. With a 28-day measurement window on tracked queries, you might not notice a drop until it's deep. The alert catches regressions the same week they happen.

---

## What to flag

### 1. Tracked query position drop (threshold: >3 positions)
Any query in `plans/gsc-tracked.json` that dropped >3 positions since last snapshot.

Rationale: tracked queries are active experiments — you want earlier signal there. >5
is the right threshold for noisy site-wide data, but tracked queries warrant tighter
monitoring since they represent intentional changes you're watching.

### 2. General query position drop (threshold: >5 positions)
Any non-tracked query that dropped >5 positions since last snapshot, provided it had
≥5 impressions in the "after" snapshot (noise floor — don't alert on queries nobody sees).

Rationale: at positions 7–14 (where current tracked queries sit), 2–4 position swings
are normal weekly variance. >5 is a meaningful signal without being hair-trigger.

### 3. Site-wide CTR drop (threshold: >10% week-over-week)
Overall site CTR dropped >10% between snapshots.

**Important constraint**: only fire this alert if total site impressions in both
snapshots were ≥500. With small absolute click volumes, CTR swings ±15% from noise —
the impressions floor prevents false alarms on quiet weeks.

### 4. Page disappeared from index
Any query/page that was ranking in the "before" snapshot but has zero impressions in
the "after" snapshot (i.e. fell out of GSC data entirely). Reuse the disappeared logic
already in `compare-snapshots.js`.

### 5. New cannibalization detected
A query that previously mapped to 1 URL now maps to 2+ URLs in the current snapshot.

This is a first-class alert, not optional. It tells you when a page rewrite has
confused Google about canonical intent — exactly the kind of regression to catch early.

Implementation: group the "after" snapshot rows by query, count distinct pages per
query, then compare against the same count from "before". Alert if a query gained a
new URL mapping.

---

## Exit behavior

**Always exit 0.** The script is wired into `gsc:run` as:
```
gsc:fetch && gsc:alert && gsc:analyze
```
A non-zero exit would block `gsc:analyze`. Print loud warnings but never stop the
pipeline. Alerts are informational, not errors.

---

## Edge cases to handle

### No previous snapshot for a tracked query
Tracked queries in `gsc-tracked.json` were added on 2026-07-30 — currently only one
snapshot exists. When comparing a tracked query that has no "before" data, print a
neutral message ("no prior snapshot for this query yet") and skip — do not crash or
emit a false alert.

### Snapshot date gap
The script compares the two most recent snapshots (same as `compare-snapshots.js`).
If the gap between them is >8 days (e.g. a fetch was skipped), print the date interval
at the top of the alert output. A "big drop" over a 3-week gap is not the same signal
as a weekly drop.

Example header:
```
⚠  Snapshot gap: 18 days (2026-07-01 → 2026-07-19). Drops may reflect accumulated drift, not a single event.
```

### First-ever run (only one snapshot)
If there is only one snapshot file in `plans/gsc-data/`, print a message that there's
nothing to diff yet and exit 0.

---

## What to build

- New file: `scripts/gsc/alert.js`
- New npm script: `gsc:alert` → `node scripts/gsc/alert.js`
- Update `gsc:run` in `package.json`:
  ```
  "gsc:run": "npm run gsc:fetch && npm run gsc:alert && npm run gsc:analyze"
  ```

---

## Context files to read before implementing

| File | Why |
|---|---|
| `scripts/gsc/compare-snapshots.js` | Reuse: `pickFiles()`, `rollUpByQuery()`, snapshot loading, the disappeared detection logic |
| `scripts/gsc/track-queries.js` | Reuse: tracked query loading (`loadTrackedQueries()` pattern) |
| `plans/gsc-tracked.json` | Data shape: `tracked[].query`, `tracked[].page`, `tracked[].baseline.position` |
| `package.json` | To update `gsc:run` correctly — current value is `npm run gsc:fetch && npm run gsc:analyze` |

### Snapshot data shape (from `compare-snapshots.js`)
Each snapshot file is an array of rows: `{ keys: [query, page], clicks, impressions, ctr, position }`.
Both query and page are present — `fetch-gsc-queries.js` uses `dimensions: ['query', 'page']`.
The `rollUpByQuery()` function in `compare-snapshots.js` aggregates these into a
`{ [query]: { clicks, impressions, position, ctr } }` map — reuse that directly.

For the cannibalization check, group rows by `keys[0]` (query) and collect distinct
`keys[1]` (page) values — this is what detects multiple URLs mapping to one query.

### rowLimit caveat
`fetch-gsc-queries.js` fetches with `rowLimit: 500`. If the site ever hits that cap,
the alert could miss queries silently. In `alert.js`, after loading each snapshot,
check if `rows.length === 500` and print a warning:

```
⚠  Snapshot <filename> contains exactly 500 rows — rowLimit may have been hit. Some queries could be missing from this analysis.
```

This turns a silent data gap into a visible one.

---

## Output format guidance

Print a clear header with snapshot filenames and date gap, then one section per alert
type. Use emoji section headers (consistent with `compare-snapshots.js` style).
Only print sections that have actual alerts — don't print empty sections.

Tracked query alerts should be visually distinct (e.g. `🎯` marker, same as
`compare-snapshots.js` already uses).

**Tracked query alerts: annotate with observation window status.**
Each entry in `gsc-tracked.json` has a `measureAfter` date. When a tracked query
triggers a drop alert, check whether today is before or after that date:

- Before `measureAfter`: append `⏳ still in observation window — check back <date> before acting.`
  The drop may be noise or algorithm adjustment lag after the intentional change.
- After `measureAfter`: append `⚠ observation window closed — experiment may have failed, act now.`

This distinction matters: a tracked drop is an experiment that may need more time;
an untracked drop has no such caveat and should be investigated immediately.

End with a one-line summary: how many alerts fired, or "✅ No anomalies detected."
