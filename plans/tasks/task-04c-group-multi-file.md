# Task 4c: Group multi-file commit entries in gsc:log

**Status:** ⬜ Todo

## Problem

When a single commit touches many files (e.g. a site-wide rename), the work-log currently emits one line per file, each repeating the same commit message:

```
## 2026-07-30
<!-- hash:138c1192acd3984bc093e3f9f7f8929e17c4b185 -->
- `src/pages/404.astro` — content: rename TuiNa → Medicinsk Kinesisk Massage on site-wide pages | measure after: 2026-08-13
- `src/pages/behandling/oljemassage.astro` — content: rename TuiNa → Medicinsk Kinesisk Massage on site-wide pages | measure after: 2026-08-13
- `src/pages/for-foretag/samarbeten-halsoforetag.astro` — content: rename TuiNa → Medicinsk Kinesisk Massage on site-wide pages | measure after: 2026-08-13
- `src/pages/friskvardsbidrag.astro` — content: rename TuiNa → Medicinsk Kinesisk Massage on site-wide pages | measure after: 2026-08-13
... (8 more lines, same message)
```

This is noisy and hard to skim. It also makes future string-matching against a specific file harder when the block is visually dense.

## What to build

In `buildNewBlock()` in `update-work-log.js`, change the rendering for commits that touch more than one file. Instead of repeating the subject on each line, group the files under a single commit header:

**Single-file commit** — format unchanged:
```
- `src/pages/foo.astro` — seo: sharpen meta description | measure after: 2026-08-14
```

**Multi-file commit** (2+ files) — new grouped format:
```
- [content: rename TuiNa → Medicinsk Kinesisk Massage on site-wide pages] | measure after: 2026-08-13
  - `src/pages/404.astro`
  - `src/pages/behandling/oljemassage.astro`
  - `src/pages/for-foretag/samarbeten-halsoforetag.astro`
  - `src/pages/friskvardsbidrag.astro`
  ... (and so on)
```

The `<!-- hash:... -->` comment stays on its own line above the group, as before.

## Acceptance criteria

1. A commit touching 1 file renders as a single flat line (unchanged behavior)
2. A commit touching 2+ files renders with the subject as a header line and files indented below
3. Each individual file is still on its own line (so future string-matching in task-04a still works)
4. The `measure after` date appears once per commit group, not repeated per file
5. `npm run gsc:log --dry-run` shows the new format before writing
6. `npm run gsc:log` still deduplicates correctly on a second run (hash-based, not format-based)

## Context files to read

- `scripts/gsc/update-work-log.js` — `buildNewBlock()` is the only function changing; specifically the inner loop over `c.files`

## Notes

- The threshold for "multi-file" is 2+ files, not 3+
- The subject line in brackets `[...]` makes it visually distinct from file paths and easy to grep
- If task-04a (work-log check in action-plan) is implemented first, confirm that the indented file format `  - \`path\`` is still matched correctly by the parser there
