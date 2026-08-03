# Task 4: Work-Log + Git-Diff Auto-Populate

**Status:** ✅ Done
**Effort:** Small (~1–2h)

## What

A plain-text log at `plans/work-log.md` that records every content change pushed to production — which file was changed, what was done, and when to re-measure. Plus a script that auto-populates it from recent git commits.

## Why

GSC data is always 2–3 days behind, and Google may not re-crawl a page for up to 7 days after a push. Total lag between a content change and visible GSC effect: up to 2 weeks.

The risk: you open a GSC session, see a `🟢 Quick win` on a page you just rewrote, and an agent (or you) treats it as an open opportunity and rewrites it again — doubling work, potentially reverting a change that just hasn't ranked yet.

`gsc:track` handles the per-keyword tracking, but there's no file-level view of "what did we actually change and when." An AI agent opening a new session has no memory of prior work unless it reads this file first.

## What to build

**`plans/work-log.md`** — running log, newest first:
```
## 2026-07-31
- `src/pages/symtom/rygg-landrygg/ischias.astro` — rewrote H1 + added FAQ section | measure after: 2026-08-28
- `src/pages/behandling/akupunktur.astro` — new meta description | measure after: 2026-08-28
```

**`scripts/gsc/update-work-log.js`** — reads recent git commits, extracts changed `.astro`/`.md` files, appends new entries to `plans/work-log.md`. Run manually after a push or wire into the workflow.

New npm script: `gsc:log`

## Usage in practice

Before any GSC session: read `plans/work-log.md` first. If a page appears as an opportunity but has a work-log entry less than 14 days old — skip it, the data is stale relative to the change.

## Context files to read before implementing

- `scripts/gsc/track-queries.js` — work-log entries should complement (not duplicate) tracked queries
- `package.json` — to add `gsc:log`
