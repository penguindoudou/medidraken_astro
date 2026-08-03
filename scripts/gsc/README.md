# GSC Scripts

Google Search Console tooling for Medidraken. Fetch performance data, analyze keyword opportunities, track changes over time, and fix canonicalization issues.

---

## Typical workflow

### Regular cadence (weekly)

```bash
# 1. Fetch a fresh snapshot
npm run gsc:fetch

# 2. Immediately check for anomalies — drops, disappearances, new cannibalization
npm run gsc:alert

# 3. See what moved since last time (overall)
npm run gsc:compare

# 4. Check how your tracked experiments are doing (focused view)
npm run gsc:track -- --compare --tracked-only

# 5. Decide what to actually work on this session
npm run gsc:action-plan
# or show the top 5 opportunities at once:
npm run gsc:action-plan -- --top 5
# or target a specific keyword:
npm run gsc:action-plan -- --keyword "massage nyköping"

# 6. If the action is "new article", generate a pre-filled draft
npm run gsc:draft -- --keyword "massage nyköping"
```

> **Before acting on any recommendation from `gsc:action-plan`:** GSC lags up to 2 weeks
> behind live changes. Check `plans/work-log.md` (updated via `npm run gsc:log`) or manually verify
> the page wasn't recently updated before treating an opportunity as open.

### After making a change to a page

```bash
# 7. Tag the query so future compares show vs-baseline delta
npm run gsc:track -- --add "massage nyköping" --page "/behandling/massage/" --note "rewrote title"

# 8. Nudge Google to re-crawl the updated page
npm run gsc:request-index -- /behandling/massage/
```

### Occasional — canonicalization cleanup

```bash
# 9. Find .html ghosts and http:// variants Google has indexed
npm run gsc:audit

# 10. Submit fixes to the Indexing API (dry run first)
npm run gsc:cleanup:dry
npm run gsc:cleanup
```

> Data is saved to `plans/gsc-data/` as dated JSON files so snapshots accumulate over time. Tracked experiments live in `plans/gsc-tracked.json`.

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

### `alert.js` — `npm run gsc:alert`

Post-fetch anomaly detector. Diffs the two most recent snapshots and prints loud warnings if something significant changed — without requiring a manual `gsc:compare` run. Run this immediately after `gsc:fetch`.

Checks performed:
- **Tracked query drops** — position fell >3 positions for any query in `gsc-tracked.json`
- **General drops** — position fell >5 positions for any query with ≥5 impressions
- **Site-wide CTR drop** — overall CTR fell >10% relative (requires ≥500 impressions in both snapshots)
- **Disappeared pages** — query was ranking, now has zero impressions in GSC
- **New cannibalization** — a query that previously mapped to one URL now maps to multiple; new URLs are classified as param-variants, canon-variants already in cleanup, or unknown (flagged loudly)

Always exits 0 — alerts are informational and never block the pipeline.

```bash
npm run gsc:alert
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

Queries registered in `plans/gsc-tracked.json` are annotated with 🎯 wherever they appear.

---

### `track-queries.js` — `npm run gsc:track`

Per-opportunity feedback loop. Tags queries you've actively worked on so their delta is surfaced separately when comparing snapshots. Cross-references `plans/gsc-tracked.json` and the experiment files in `plans/seo-experiments/`.

```bash
# Tag a query as worked on (auto-pulls baseline from the latest snapshot)
npm run gsc:track -- --add "massage nyköping" --page "/behandling/massage/" --note "rewrote title"

# List all tracked queries and their measurement readiness
npm run gsc:track -- --list

# Compare snapshots — tracked queries appear first with vs-baseline delta
npm run gsc:track -- --compare

# Show only tracked queries, suppress the rest
npm run gsc:track -- --compare --tracked-only

# Compare specific snapshot files
npm run gsc:track -- --compare plans/gsc-data/gsc-keywords-2026-07-01.json plans/gsc-data/gsc-keywords-2026-07-31.json
```

Tracked entries are stored in `plans/gsc-tracked.json`. Each entry links to its experiment file in `plans/seo-experiments/` so the baseline, action note, and full experiment record are one hop away.

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

### `generate-article-draft.js` — `npm run gsc:draft`

Generates a Markdown article draft in `src/content/artiklar/` pre-filled with real GSC data. Auto-selects the highest-priority quick win from the latest snapshot, or targets a specific keyword.

```bash
# Auto-select the highest-priority quick win from the latest snapshot
npm run gsc:draft

# Target a specific keyword
npm run gsc:draft -- --keyword "massage nyköping"

# Use a specific snapshot file
node scripts/gsc/generate-article-draft.js --snapshot plans/gsc-data/gsc-keywords-2026-07-31.json

# Combine flags
node scripts/gsc/generate-article-draft.js --snapshot plans/gsc-data/foo.json --keyword "akupunktur"
```

---

### `action-plan.js` — `npm run gsc:action-plan`

Decision layer. Takes a query (or auto-selects the top opportunity from the latest snapshot) and outputs a concrete, specific action — not just a tier tag. This is the main entry point for deciding what to work on each session; run it before touching any page content.

Routes to one of nine action types based on position band and CTR signal:

| Action type | Tier | Trigger |
|---|---|---|
| `fix-snippet` | `🔴 Snippet` | Impressions but near-zero CTR (positions ≤ 20 only) — broken title/meta |
| `push-ctr` | `🟡 Push CTR` | Top 3 position, CTR below expected — possible featured snippet stealing clicks |
| `protect` | `🔵 Protect` | Top 3 position, healthy CTR — monitor only |
| `rewrite-snippet` | `🟢 Quick win` | Position 4–10, low CTR — ranking solid, only snippet needs work |
| `deepen-content` | `🟠 Push rank` | Position 4–20, normal CTR — strengthen content to climb |
| `push-rank-and-snippet` | `🟠 Push rank+` | Position 11–20, low CTR — deepen content AND fix snippet together |
| `push-ranking` | `🌟 Gem` | CTR punching above weight at any position — push to top 3 |
| `expand-or-support` | `🟡 Content` | Position 21+, any CTR — expand or write a supporting article |
| `consolidate` | — | Cannibalization — multiple URLs competing for the same query |
| `new-content` | `⚫ Noise` | No meaningful ranking signal |

> **Key distinction — positions 4–10 vs 11–20:** A page at position 4–10 with low CTR gets `rewrite-snippet` — the ranking is solid and a better title alone can meaningfully lift clicks. A page at position 11–20 with low CTR gets `push-rank-and-snippet` — the page is marginal and needs both content depth and snippet work. Snippet-only won't move a position-11–20 page.

> **Snippet guard:** The near-zero CTR check only fires at positions ≤ 20. At position 21+ the expected CTR is already at or below 0.5%, so a low raw CTR there is normal — not a broken snippet.

```bash
# Auto-select the top opportunity
npm run gsc:action-plan

# Show the top N opportunities at once
npm run gsc:action-plan -- --top 5

# Target a specific keyword
npm run gsc:action-plan -- --keyword "massage nyköping"

# Use a specific snapshot file
npm run gsc:action-plan -- --snapshot plans/gsc-data/gsc-keywords-2026-07-31.json
```

Each output includes: tier tag, position, CTR vs expected, opportunity score, ranking URL, source file path, and numbered instructions for the recommended action.

> ⚠️ **Stale data:** GSC lags up to 2 weeks behind live changes. Before acting, verify the target page hasn't been recently updated. Run `npm run gsc:log` to check `plans/work-log.md`.

---

### `audit-schema.js` — `npm run gsc:schema`

Fetches every page from the live site via its sitemap and reports which structured data (JSON-LD) is present, missing, or malformed — per page — based on URL-pattern rules grounded in the actual Medidraken site structure.

```bash
npm run gsc:schema
```

Output: `plans/gsc-data/schema-audit-YYYY-MM-DD.json`

---

### `update-work-log.js` — `npm run gsc:log`

Reads recent git commits, extracts changed content files (`.astro`, `.md`, `.mdx`), and prepends new entries to `plans/work-log.md`. Deduplicates by commit hash so running it multiple times is safe.

```bash
npm run gsc:log                         # last 30 commits
npm run gsc:log -- --since 2026-07-01   # commits since a date
npm run gsc:log -- --n 50               # last N commits
npm run gsc:log -- --dry-run            # print what would be added, no write
```

Run this at the start of any GSC session so you know which pages are too fresh to measure.

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
| `schema-audit-YYYY-MM-DD.json` | `audit-schema.js` |
| `plans/work-log.md` | `update-work-log.js` — human-readable content change log |
| `plans/gsc-tracked.json` | `track-queries.js` — queries with active experiments |

Snapshots accumulate so `compare-snapshots.js` always has a "before" to work with. Don't delete old files.
