# GSC Scripts

Google Search Console tooling for Medidraken. Fetch performance data, analyze keyword opportunities, track changes over time, and fix canonicalization issues.

---

## Typical workflow

```bash
# 1. Fetch fresh data from GSC
npm run gsc:fetch

# 2. Analyze the latest snapshot (opportunities, cannibalization)
npm run gsc:analyze

# 3. Compare with the previous snapshot to see what moved
npm run gsc:compare

# 4. After fixing a page, tell Google to re-crawl it
npm run gsc:request-index -- /symtom/huvudvark/ /behandling/akupunktur/

# 5. Audit for canonicalization issues (.html ghosts, http:// variants)
npm run gsc:audit

# 6. Submit canonical fixes to the Indexing API
npm run gsc:cleanup          # live
npm run gsc:cleanup:dry      # dry run first
```

> Data is saved to `plans/gsc-data/` as dated JSON files so snapshots accumulate over time.

---

## Scripts

### `fetch-gsc-queries.js` — `npm run gsc:fetch`

Fetches the last 30 days of query+page performance data from the GSC Search Analytics API and saves it to `plans/gsc-data/gsc-keywords-YYYY-MM-DD.json`.

```bash
npm run gsc:fetch
```

---

### `analyze-gsc-data.js` — `npm run gsc:analyze`

Reads the latest snapshot and prints a ranked table of queries by impressions. Flags keyword cannibalization (⚠) where the same query maps to multiple URLs.

```bash
npm run gsc:analyze

# Analyze a specific file:
node scripts/gsc/analyze-gsc-data.js plans/gsc-data/gsc-keywords-2026-07-01.json
```

---

### `compare-snapshots.js` — `npm run gsc:compare`

Diffs two snapshots to show what changed between fetches. Use this after making content edits to measure impact.

```bash
# Auto-compare the two most recent snapshots:
npm run gsc:compare

# Compare specific files:
node scripts/gsc/compare-snapshots.js plans/gsc-data/gsc-keywords-2026-07-01.json plans/gsc-data/gsc-keywords-2026-07-30.json

# Filter flags:
npm run gsc:compare -- --min-pos-delta=3   # only show moves of ≥ 3 positions
npm run gsc:compare -- --min-imp=5         # hide queries with < 5 impressions
npm run gsc:compare -- --top=50            # show up to 50 rows per section
```

Output sections:
- 📈 **Improved** — queries that moved up, sorted by biggest gain
- 📉 **Dropped** — queries that fell, sorted by biggest loss
- 🆕 **New** — queries that appeared since the previous snapshot
- 👻 **Disappeared** — queries that were present before but are now gone
- 📊 **Summary** — total impressions, clicks, and CTR delta

---

### `request-index.js` — `npm run gsc:request-index`

Submits one or more URL paths to Google's Indexing API, requesting an immediate re-crawl. Use this after updating page content so Google picks up changes without waiting for its regular crawl schedule.

```bash
npm run gsc:request-index -- /path/one/ /path/two/

# Example — after updating three pages:
npm run gsc:request-index -- \
  /na-dina-halsomal/minska-stress-hitta-inre-lugn/ \
  /na-dina-halsomal/stark-fokus-mental-styrka/ \
  /symtom/huvudvark/spanningshuvudvark-stresshuvudvark/
```

Paths are resolved against `SITE_BASE_URL` (defaults to `https://medidraken.com`). Full URLs are also accepted.

> **Quota:** 200 requests/day on the free Indexing API tier. Each URL costs 1.
> The service account must have the **Owner** role in Search Console for submissions to be accepted.

---

### `audit-canonicalization.js` — `npm run gsc:audit`

Fetches all URLs Google has seen and flags two types of canonicalization problems:
- `.html` ghost pages (e.g. `/kontakt.html` instead of `/kontakt/`)
- `http://` variants that should be `https://`

Saves a report to `plans/gsc-data/canon-audit-YYYY-MM-DD.json`.

```bash
npm run gsc:audit

# Look back further than the default 90 days:
node scripts/gsc/audit-canonicalization.js --days 180
```

---

### `submit-canonical-cleanup.js` — `npm run gsc:cleanup`

Reads the latest `canon-audit-*.json` report and:
1. Inspects each bad URL via the URL Inspection API to confirm Google's current canonical
2. Submits the correct canonical to the Indexing API to trigger a re-crawl

```bash
npm run gsc:cleanup:dry    # preview — no requests sent
npm run gsc:cleanup        # live run
```

Rate limits respected: ~8 req/s, well within the 2 000/day (Inspection) and 200/day (Indexing) quotas.

---

### `generate-article-draft.js`

Generates a Markdown article draft in `src/content/artiklar/` from a title and description, pre-filled with a Swedish TCM content structure.

```bash
node scripts/gsc/generate-article-draft.js "Akupunktur mot migrän i Nyköping" "Läs om hur akupunktur kan lindra migrän."
```

---

## Auth setup

> **Auth is already configured and working.** Service account key is set up and verified against the live GSC property.

All scripts share the same auth resolution order. Add one of these to your `.env`:

| Option | Variables |
|---|---|
| Service account key file | `GSC_SERVICE_ACCOUNT_PATH=/path/to/key.json` |
| Service account JSON inline | `GSC_SERVICE_ACCOUNT_JSON='{...}'` |
| OAuth2 with refresh token | `GSC_CLIENT_ID` + `GSC_CLIENT_SECRET` + `GSC_REFRESH_TOKEN` |
| Application Default Credentials | *(automatic if running on GCP or `gcloud auth` is set up)* |

`GSC_SITE_URL` defaults to `sc-domain:medidraken.com`.

> **Note:** `submit-canonical-cleanup.js` and `request-index.js` require the `indexing` scope (write). `submit-canonical-cleanup.js` also needs `webmasters` (read). All other scripts only need `webmasters.readonly`.

---

## Data files (`plans/gsc-data/`)

| Pattern | Created by |
|---|---|
| `gsc-keywords-YYYY-MM-DD.json` | `fetch-gsc-queries.js` |
| `canon-audit-YYYY-MM-DD.json` | `audit-canonicalization.js` |
| `canon-cleanup-YYYY-MM-DD.json` | `submit-canonical-cleanup.js` |

Snapshots accumulate so `compare-snapshots.js` always has a "before" to work with. Don't delete old files.
