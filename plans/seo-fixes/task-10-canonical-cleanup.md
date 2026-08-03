# Task 10 — Canonical cleanup

**Status:** ✅ Done — 2026-08-03  
**Effort:** ~30 min  
**Trigger:** `gsc:alert` fired 4 cannibalization warnings in the 2026-08-03 snapshot

---

## Problem

Multiple URLs are competing for the same queries in Google's index. This splits ranking authority and suppresses CTR because Google can't decide which page to show.

Flagged queries from the 2026-08-03 alert:

| Query | Competing URLs | Notes |
|---|---|---|
| `tai chi nyköping` | 12 URLs | `/kurser/tai-chi/` is the correct canonical |
| `stresshantering nyköping` 🎯 | Homepage appearing alongside stress/burnout pages | Homepage should not rank here |
| `medicinsk qigong` | `/kurser/medicinsk-qigong` (no slash) vs `/kurser/medicinsk-qigong/` | Slash-variant — classic Cloudflare Pages issue |
| `rygg och ledkliniken nyköping` | `/behandling/` vs `/symtom/rygg-landrygg/akut-ryggont/` | Symptom page should own this |

---

## Steps

### 1. Run the canonicalization audit

```bash
npm run gsc:audit
```

This fetches all URLs Google has seen and flags `.html` ghosts and `http://` variants. Output saved to `plans/gsc-data/canon-audit-YYYY-MM-DD.json`.

### 2. Review the audit report

Check `plans/gsc-data/canon-audit-2026-08-03.json` (or today's date). Look for:
- Any URLs without a trailing slash (e.g. `/kurser/tai-chi` vs `/kurser/tai-chi/`)
- Any `http://` variants
- Any `.html` ghost pages (handled separately in Task 11)

### 3. Dry run the cleanup

```bash
npm run gsc:cleanup:dry
```

Review what will be submitted before sending anything to the Indexing API.

### 4. Run the live cleanup

```bash
npm run gsc:cleanup
```

This inspects each bad URL via the URL Inspection API and submits the correct canonical to trigger a re-crawl.

### 5. Verify with `gsc:audit` in ~1 week

Re-run the audit after Google has had time to process the submissions. Positions for the affected queries should stabilize and cannibalization warnings should clear.

---

## Expected outcome

- `medicinsk qigong` slash-variant resolves immediately (low-friction)
- `tai chi nyköping` consolidates authority to `/kurser/tai-chi/` — position should improve from ~21 toward top 10
- Homepage stops competing for `stresshantering nyköping` — `/na-dina-halsomal/minska-stress-hitta-inre-lugn/` should own that query

---

## Notes

- Quota: 200 Indexing API requests/day. The cleanup script respects rate limits.
- Don't delete any pages before canonicals are processed — Google needs to crawl the change first.
- After running cleanup, add a tracking entry: `npm run gsc:track -- --add "tai chi nyköping" --page "/kurser/tai-chi/" --note "canonical cleanup submitted"`
