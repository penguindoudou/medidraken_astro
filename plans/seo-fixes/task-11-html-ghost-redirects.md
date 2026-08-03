# Task 11 — Fix .html ghost redirects

**Status:** ✅ Done  
**Effort:** ~20 min  
**Depends on:** Task 10 (canonical cleanup) done first — overlapping URLs, avoid conflicting signals

---

## Problem

Legacy `.html` pages from before the Astro rebuild are still being indexed by Google and appearing in query results. These split ranking authority from the correct canonical pages.

Confirmed ghosts (appearing in the 2026-08-03 snapshot):

| Ghost URL | Should redirect to |
|---|---|
| `medidraken.com/taiji.html` | `/kurser/tai-chi/` |
| `medidraken.com/johannes.html` | `/behandling/akupunktur/` (or `/om-oss/`) |
| `medidraken.com/kurser.html` | `/kurser/` |
| `medidraken.com/behandling` (no slash) | `/behandling/` |
| `medidraken.com/kurser/tai-chi` (no slash) | `/kurser/tai-chi/` |
| `medidraken.com/kurser/medicinsk-qigong` (no slash) | `/kurser/medicinsk-qigong/` |

---

## Steps

### 1. Confirm which pages exist in Astro

Check that the canonical targets actually exist (they should — this is just a sanity check before adding redirects):

```bash
ls src/pages/kurser/
ls src/pages/behandling/
ls src/pages/om-oss/
```

### 2. Add 301 redirects in `astro.config.mjs`

Astro supports redirects natively. Add to the `redirects` object in `astro.config.mjs`:

```js
redirects: {
  '/taiji.html':                    '/kurser/tai-chi/',
  '/johannes.html':                 '/behandling/akupunktur/',
  '/kurser.html':                   '/kurser/',
  '/behandling':                    '/behandling/',
  '/kurser/tai-chi':                '/kurser/tai-chi/',
  '/kurser/medicinsk-qigong':       '/kurser/medicinsk-qigong/',
},
```

PERSONAL FEEDBACK: Check if maybe '/om-oss/' is better than '/behandling/akupunktur/' as a redirect target for '/johannes.html'.

> **Note:** Trailing-slash redirects for paths like `/behandling` → `/behandling/` may already be handled by Cloudflare Pages' trailing-slash setting. Check `wrangler.toml` or Cloudflare Pages settings before adding duplicates.

### 3. Build and verify locally

```bash
npm run build
npm run preview
```

Test each ghost URL manually — they should 301 to the canonical.

### 4. Deploy

```bash
git add astro.config.mjs
git commit -m "fix: 301 redirects for legacy .html ghosts and no-slash variants"
git push
```

The post-push hook will update the work-log automatically.

### 5. Request re-index of the canonical pages

After deploying, nudge Google to re-crawl the pages that should now consolidate authority:

```bash
npm run gsc:request-index -- \
  /kurser/tai-chi/ \
  /behandling/akupunktur/ \
  /kurser/ \
  /kurser/medicinsk-qigong/
```

### 6. Track

```bash
npm run gsc:track -- --add "tai chi" --page "/kurser/tai-chi/" --note "301 redirect from taiji.html + no-slash variant"
npm run gsc:track -- --add "akupunktur nyköping" --page "/behandling/akupunktur/" --note "301 redirect from johannes.html"
```

---

## Expected outcome

- Ghost `.html` pages stop splitting impressions for `tai chi`, `akupunktur nyköping`, and related queries
- All ranking authority consolidates to the clean canonical URLs
- `🔴 Snippet` flags for `tai chi` (pos 6.3, 0% CTR) and `akupunktur nyköping` (pos 9.3, 0% CTR) should resolve — cannibalization is almost certainly the cause of the zero clicks

---

## Notes

- `.html` ghosts can take 2–4 weeks to drop out of GSC after a 301 is in place — this is normal.
- Do not remove the old `.html` routes from Astro; the redirect IS the removal.
- If `johannes.html` was a practitioner page, consider whether `/om-oss/` is a better redirect target than `/behandling/akupunktur/`.
