# Task 4b: Skip root-level .md files in gsc:log

**Status:** ✅ Done

## Problem

`update-work-log.js` currently logs `README.md` because it matches the `.md` extension filter and is not under any of the `SKIP_PREFIXES`. Example from the current work-log:

```
<!-- hash:b11cc9e7da93767409c5c063849826fcf282acbf -->
- `README.md` — chore: update README and astro.config | measure after: 2026-08-13
```

`README.md` has no GSC relevance. It is not a page that gets crawled or ranked. Logging it adds noise and could cause a false stale-data warning if a future work-log check in `action-plan.js` matches it against a page URL.

The same applies to any other root-level `.md` files (e.g. `CHANGELOG.md`, `LICENSE.md`).

## What to build

In `update-work-log.js`, tighten the `isContentFile()` function so it only accepts `.md` and `.mdx` files that live under `src/` — not root-level markdown.

Current logic:
```js
function isContentFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!CONTENT_EXTS.has(ext)) return false;
  return !SKIP_PREFIXES.some(prefix => filePath.startsWith(prefix));
}
```

Required change: for `.md` and `.mdx` files, additionally require the path starts with `src/`. `.astro` files already only exist under `src/` by convention, so no change needed there.

## Acceptance criteria

1. `README.md` is no longer logged by `npm run gsc:log`
2. `src/content/artiklar/some-article.md` is still logged
3. `src/pages/some-page.mdx` is still logged (if it exists)
4. `.astro` files under `src/pages/` are still logged
5. `npm run gsc:log --dry-run` can be used to verify without writing

## Context files to read

- `scripts/gsc/update-work-log.js` — the `isContentFile()` function and `SKIP_PREFIXES` constant are the only things changing

## Notes

- This is a one-liner fix in `isContentFile()` — the whole task is small
- No need to retroactively clean up existing work-log entries; the `README.md` entry already in there does no harm, it just won't be added again
