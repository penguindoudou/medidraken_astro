# Task 1b: Smarter Cannibalization Alerts

**Status:** ⬜ Todo
**Depends on:** Task 1 (alert.js) — already complete

## What

Two improvements to the cannibalization check in `scripts/gsc/alert.js`:

1. **Cross-reference against cleanup results** — when a cannibalized URL matches a known bad URL that was already submitted via `gsc:cleanup`, say so instead of making it look like a new unknown problem.
2. **Classify query-param variants** — when the "new" cannibalized URL contains `?`, flag it as a separate category with a specific investigation note and the known fix.

---

## Why each one

### 1. Cleanup cross-reference

Currently the alert fires on http/www/ghost variants even though `gsc:cleanup` already submitted indexing requests for all 18 of them on 2026-07-30. The alert has no way to know this, so every weekly run produces noise that looks urgent but isn't.

The fix is to load the latest `canon-cleanup-*.json` at runtime and annotate each cannibalized URL:
- If the bad URL was submitted → print `→ submitted to Google on <date>, awaiting re-crawl`
- If it hasn't been targeted → print `→ not yet in cleanup — run: npm run gsc:cleanup`

This also answers the question "has cleanup been run?" automatically, every time.

### 2. Query-param classification

`?`-param URLs are a different class of problem from protocol/ghost variants:
- They won't appear in the canon audit or cleanup results (those only cover http/ghost variants)
- They're caused by intentional deep-links on the site being crawled by Google
- The fix is always a `<link rel="canonical">` on the page — but that requires a human to first confirm whether the param is intentional

The alert should surface these separately with a clear message:
- What the clean URL is
- What the param variant is
- That it needs manual investigation before acting — there is no prescribed fix

The fix depends on what the investigation finds:
- Is the param intentional (e.g. UX pre-selection)? → likely add `<link rel="canonical">` to the clean URL
- Is it from a bad internal link? → fix the link, param disappears naturally
- Is it from an external backlink you can't control? → add `<link rel="canonical">` anyway

The alert cannot know which case applies, so it should not prescribe a fix.

**Known instance from current data:**
- Query: `företagsfriskvård`
- Clean URL: `https://www.medidraken.com/for-foretag/kontakt-offert/`
- Param URL: `https://www.medidraken.com/for-foretag/kontakt-offert/?type=samarbete`
- Root cause: Alpine.js reads `?type=` on init to pre-check form fields — the param is intentional UX, but Google indexed the typed URL as a separate page
- Fix: add `<link rel="canonical" href="...kontakt-offert/">` to the page (BaseLayout likely needs a `canonical` prop added for SSR pages, since `prerender = false` pages don't get auto-canonicals from Astro)

---

## What to build

### Changes to `scripts/gsc/alert.js`

#### Load cleanup results

```js
// After loading snapshots, load the latest canon-cleanup-*.json if it exists
function loadCleanupResults() {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('canon-cleanup-') && f.endsWith('.json'))
    .sort();
  if (files.length === 0) return null;
  const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, files[files.length - 1]), 'utf8'));
  // Build a map: badUrl → { submittedDate, status }
  const map = {};
  for (const r of data.results) {
    map[r.badUrl] = { date: data.executedAt.slice(0, 10), status: r.indexingStatus };
  }
  return { date: data.executedAt.slice(0, 10), map };
}
```

#### Classify cannibalization entries

In the cannibalization check (check 5), after building `alertCannibalization`, classify each new URL before printing:

```js
// For each entry in alertCannibalization, classify each newPage:
function classifyNewUrl(newUrl, existingUrls, cleanupMap) {
  // Query-param variant: new URL has ? and base path matches an existing URL
  const urlWithoutParam = newUrl.split('?')[0].replace(/\/$/, '');
  const isParamVariant = existingUrls.some(u => {
    return u.split('?')[0].replace(/\/$/, '') === urlWithoutParam;
  });
  if (isParamVariant) return { type: 'param-variant', cleanUrl: newUrl.split('?')[0] };
  // Already in cleanup results
  if (cleanupMap && cleanupMap[newUrl]) {
    return { type: 'cleanup-submitted', date: cleanupMap[newUrl].date };
  }

  // Known bad URL pattern (http, non-www, .html) but not yet in cleanup
  const isHttpVariant = newUrl.startsWith('http://');
  const isNonWww = !newUrl.includes('://www.');
  const isHtmlGhost = newUrl.endsWith('.html');
  if (isHttpVariant || isHtmlGhost) return { type: 'canon-variant', needsCleanup: true };

  // Unclassified — genuinely unknown, flag loudly
  return { type: 'unknown' };
}
```

#### Updated print section for cannibalization

Replace the current flat print with classified output:

```
🔀 Cannibalization detected — query now maps to multiple URLs (N)
──────────────────────────────────────────────────────────────────────
  företagsfriskvård
    existing : https://www.medidraken.com/for-foretag/kontakt-offert/
    new      : https://www.medidraken.com/for-foretag/kontakt-offert/?type=samarbete
               ↳ Query-param variant — param URL is being indexed as a separate page.
                 Investigate before acting: find what is linking to this URL and why.

  tai chi near me
    existing : http://www.medidraken.com/taiji.html  (submitted 2026-07-30, awaiting re-crawl)
    new      : https://www.medidraken.com/kurser/tai-chi
               ↳ Canon variant — already submitted via gsc:cleanup on 2026-07-30.
                 No action needed. Will resolve once Google re-crawls.
```

Only entries with `type: 'unknown'` or `type: 'param-variant'` should increment `totalAlerts`. Canon variants that are already submitted are informational only (don't count toward the alert total, don't add to the summary "N alerts fired").

---

## Context files to read before implementing

| File | Why |
|---|---|
| `scripts/gsc/alert.js` | The file being modified — read in full |
| `plans/gsc-data/canon-cleanup-2026-07-30.json` | Shape of cleanup results: `{ executedAt, results: [{ badUrl, canonical, indexingStatus }] }` |
| `plans/gsc-data/gsc-keywords-2026-07-31.json` | Current snapshot — verify the 4 known cannibalization cases still fire correctly after changes |

---

## Edge cases

- No cleanup file exists yet → skip cross-reference, treat all canon variants as `type: 'unknown'`
- Cleanup file exists but URL not in it → `type: 'unknown'`, print "not yet targeted by gsc:cleanup — run: npm run gsc:cleanup"
- Multiple cleanup files → always use the most recent (already handled by `.sort()` + `files[files.length - 1]`)
- Param variant where the base path is also new (not in existing URLs) → fall through to `unknown`, don't classify as param-variant

---

## Expected output after changes

From the current 4 alerts:
- `akupunktur timrå` → canon variant, submitted 2026-07-30 → informational only, not counted
- `rygg o ledkliniken nyköping` → canon variant, submitted 2026-07-30 → informational only, not counted
- `tai chi near me` → mixed: `taiji.html` is a submitted ghost, `kurser/tai-chi` is the real new URL → the real URL is `unknown` type → still counts as 1 alert
- `företagsfriskvård` → param variant → counts as 1 alert with fix instructions

**Net result: 4 cannibalization entries → 2 real alerts, 2 informational. Summary line changes from "4 alerts" to "2 alerts".**
