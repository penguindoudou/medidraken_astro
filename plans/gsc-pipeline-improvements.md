# GSC Pipeline Improvements

Identified improvements to make the Google Search Console analysis process faster and more actionable. Work through these in order.

---

## 1. `gsc:compare` — Snapshot diff script

**Status:** ✅ Done

**Problem:** We fetch snapshots but never compare them. No way to see if a position changed after a content edit.

**What to build:** A script that takes two GSC JSON snapshots and produces a diff — what improved, what dropped, what's new, what disappeared. Output sorted by biggest movers.

**File:** `scripts/gsc/compare-snapshots.js`
**npm script:** `gsc:compare`

---

## 2. Opportunity classification in `analyze-gsc-data.js`

**Status:** ✅ Done

**Problem:** The analyzer sorts by impressions but doesn't tell us *what to do*. All queries look the same.

**What to build:** Tag each query with a priority tier:
- 🟢 **Quick win** — position 4–15, decent impressions, low CTR → fix title/meta
- 🟡 **Near-miss** — position 15–30 → improve content depth
- 🔵 **Winning** — position 1–3 → monitor, protect from drops
- 🔴 **Dead weight** — impressions but 0 clicks → title/snippet problem

**File:** `scripts/gsc/analyze-gsc-data.js` (modify existing)

---

## 3. `gsc:request-index` — Manual indexing nudge

**Status:** ✅ Done

**Problem:** No easy way to tell Google "I just updated this page, please re-crawl it" outside of the canonicalization cleanup script.

**What to build:** A script that accepts a list of URLs (via CLI args or a plain text file) and submits them to the Indexing API — same mechanism as `submit-canonical-cleanup.js` but for general content changes.

**File:** `scripts/gsc/request-index.js`
**npm script:** `gsc:request-index`

**Usage:**
```bash
npm run gsc:request-index -- /symtom/huvudvark/ /behandling/akupunktur/
```

---

## 4. Wire fetch + analyze into a single command

**Status:** ✅ Done

**Problem:** `fetch-gsc-queries.js` and `analyze-gsc-data.js` aren't connected — you have to run them separately, and `gsc:fetch` isn't even in package.json.

**What to build:**
- Add `gsc:fetch` to package.json
- Add `gsc:run` that runs fetch then analyze in sequence

**Changes:** `package.json` only

---

## 5. Connect `generate-article-draft.js` to GSC data

**Status:** ✅ Done

**Problem:** Article drafts are generated from a generic template. They could instead be pre-filled with the actual opportunity keyword, its stats (impressions, position, CTR), and a suggested angle based on the tier classification from improvement #2.

**What to build:** Read the latest GSC snapshot, pick a query by keyword arg (or highest-priority unaddressed quick win), and generate a draft pre-filled with real data.

**File:** `scripts/gsc/generate-article-draft.js` (modify existing)
**Depends on:** Improvement #2 (tier classification)

---

## 6. `gsc:track` — Per-opportunity feedback loop

**Status:** ⬜ Todo

**Problem:** `gsc:compare` diffs raw snapshots but has no concept of which queries were actively worked on. No way to answer "did P1 from last week's report actually improve after I rewrote that title tag?"

**What to build:** A mechanism to tag worked-on queries, then filter the snapshot diff to those specifically.

- A plain text or JSON file (e.g. `plans/gsc-tracked.json`) where you log worked-on queries with a date and note
- `compare-snapshots.js` (or a new script) reads that file and highlights tracked queries in the diff — position delta, CTR delta, clicks delta
- Output separates "tracked" from "everything else" so signal isn't buried in noise

**File:** `scripts/gsc/track-queries.js` (new) or extend `compare-snapshots.js`
**npm script:** `gsc:track`
**Depends on:** Improvement #1 (`gsc:compare`)

**Usage:**
```bash
# Mark a query as worked on
npm run gsc:track -- --add "massage oxelösund" --note "rewrote title tag 2026-07-31"

# Compare snapshots, highlight tracked queries
npm run gsc:track -- --compare snapshot-A.json snapshot-B.json
```
