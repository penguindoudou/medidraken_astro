# Task Queue — Medidraken SEO Pipeline

> **Start here:** Next up is [task 10 — dedup classify lib](task-10-dedup-classify-lib.md) (highest-risk: three files currently diverge). Or run `npm run gsc:action-plan` to find today's top opportunity.

Each file in this directory is a task brief. Open the relevant file at the start of a session.

---

## Priority Stack

| # | File | Status | Description |
|---|------|--------|-------------|
| 1 | [task-01-anomaly-alert.md](task-01-anomaly-alert.md) | ✅ Done | Post-fetch anomaly alert — catch ranking drops before they compound |
| 1b | [task-01b-cannibalization-alert.md](task-01b-cannibalization-alert.md) | ✅ Done | Smarter cannibalization alerts — classify param variants, cross-ref cleanup results |
| 2 | [task-02-action-plan.md](task-02-action-plan.md) | ✅ Done | `gsc:action-plan` — decision layer that routes to the right fix before any content work |
| 2a | [task-02a-extract-classify-lib.md](task-02a-extract-classify-lib.md) | ✅ Done | Extract classify lib — eliminate copy-paste between action-plan.js and test file |
| 2b | [task-02b-cannibalization-top-n.md](task-02b-cannibalization-top-n.md) | ✅ Done | Fix cannibalization in `--top N` — surface consolidation candidates first |
| 2c | [task-02c-stale-data-check.md](task-02c-stale-data-check.md) | ✅ Done | Automate stale-data check — replace static warning with live `gsc-tracked.json` lookup |
| 3 | [task-03-schema-audit.md](task-03-schema-audit.md) | ✅ Done | Schema/structured data audit — surface missing JSON-LD to fix `🟡 Push CTR` pages |
| 3b | [task-03b-schema-action-plan.md](task-03b-schema-action-plan.md) | ✅ Done | Wire schema audit into `gsc:action-plan` — show schema gaps for `🟡 Push CTR` entries |
| 4 | [task-04-work-log.md](task-04-work-log.md) | ✅ Done | Work-log + git-diff auto-populate — prevent agent from acting on stale GSC data |
| 4a | [task-04a-work-log-action-plan.md](task-04a-work-log-action-plan.md) | ✅ Done | Wire work-log check into `gsc:action-plan` — catch stale pages not in gsc-tracked.json |
| 4b | [task-04b-skip-root-md.md](task-04b-skip-root-md.md) | ✅ Done | Skip root-level `.md` files in `gsc:log` — stop logging README changes |
| 4c | [task-04c-group-multi-file.md](task-04c-group-multi-file.md) | ⬜ Todo | Group multi-file commit entries — reduce noise for site-wide changes |
| 4d | [task-04d-stale-reminder.md](task-04d-stale-reminder.md) | ✅ Done | Stale reminder in `gsc:action-plan` when work-log hasn't been updated recently |
| 4e | [task-04e-post-push-log.md](task-04e-post-push-log.md) | ✅ Done | Auto-run gsc:log on git push + fix measure-after to use push date instead of commit date |
| 5 | [task-05-sources-block.md](task-05-sources-block.md) | ⬜ Todo | Sources block in `gsc:draft` — make new articles more substantive |
| 6 | [task-06-keyword-gap.md](task-06-keyword-gap.md) | ⬜ Todo | Keyword gap script — find Swedish TCM queries you don't rank for yet |
| 7 | [task-07-city-pages.md](task-07-city-pages.md) | ⬜ Todo | City pages for Gnesta + Oxelösund — separate indexed pages per location |
| 8 | [task-08-city-component.md](task-08-city-component.md) | ⬜ Todo | City-aware component — localStorage city preference surfaced in CTA/address blocks |
| 9 | [task-09-ctr-benchmark.md](task-09-ctr-benchmark.md) | ⬜ Todo | CTR benchmark calibration — replace hardcoded industry averages with site-specific data |
| 10 | [task-10-dedup-classify-lib.md](task-10-dedup-classify-lib.md) | ✅ Done | Dedup classify lib — wire `analyze-gsc-data.js` and `generate-article-draft.js` to `lib/classify.js` |
| 11 | [task-11-fetch-row-limit.md](task-11-fetch-row-limit.md) | ✅ Done | Increase fetch row limit 500 → 25000 — stop silently missing long-tail queries |
| 12 | [task-12-fetch-no-overwrite.md](task-12-fetch-no-overwrite.md) | ✅ Done | Prevent same-day fetch overwrite — add timestamp suffix instead of silently clobbering |
| 13 | [task-13-alert-ctr-intersection.md](task-13-alert-ctr-intersection.md) | ✅ Done | Fix CTR drop alert — compute on snapshot intersection, not full aggregate |
| 14 | [task-14-redirects-map-test.md](task-14-redirects-map-test.md) | ✅ Done | Add test for `redirects-map.js` — catch silent parse breakage after config changes |
| 15 | [task-15-mdx-source-mapper.md](task-15-mdx-source-mapper.md) | ✅ Done | Add `.mdx` support to `mapUrlToSourceFile` — fix missing source file in action plans |
| 16 | [task-16-measure-days-flag.md](task-16-measure-days-flag.md) | ✅ Done | Add `--measure-days` flag to `gsc:log` — override the hard-coded 14-day window |
| 17 | [task-17-gsc-prune.md](task-17-gsc-prune.md) | ✅ Done | Add `gsc:prune` script — clean up old snapshots, keep monthly checkpoints |

---

## Workflow context

### Why this order

1–3 are about fixing and protecting what you already have — squeeze CTR from existing rankings before adding new content.
4–5 close operational gaps: preventing double-work and making new drafts more substantive. Task 4 is directly tied to task 2: `gsc:action-plan` is the first script that acts on GSC data to make content decisions, so without a work-log there's no guard against running it on a page you already changed — the 2-week GSC lag means the signal looks open even after you've acted.
6 expands the content surface once the existing pipeline runs cleanly.
7–8 are city expansion — deferred until GSC shows which pages have enough traction to justify localization.
9 is a future calibration — data accumulates passively, revisit at ~3 months of weekly snapshots.

**Tasks 10–17 are code-quality and data-integrity improvements surfaced by a toolchain review.**

- **10** is the highest-risk: three scripts carry divergent copies of the classification logic. Do this first — any tier or CTR threshold change you make after this only needs to be done once.
- **11** is trivial but high-impact: you're currently missing long-tail data on every fetch.
- **12** prevents silent data loss when the fetch chain is re-run.
- **13** fixes a known false-positive in the alert that produces noise on snapshots with new pages.
- **14** is a safety net — catches config changes that silently break redirect classification.
- **15** is a 4-line fix that prevents confusing "source file not found" output in action plans.
- **16** gives operational flexibility to the measure window.
- **17** is housekeeping — do it once the pipeline is stable and snapshots are accumulating.

### Existing scripts (already working)

| Script | npm command |
|--------|-------------|
| `fetch-gsc-queries.js` | `npm run gsc:fetch` |
| `analyze-gsc-data.js` | `npm run gsc:analyze` |
| `alert.js` | `npm run gsc:alert` |
| *(fetch + alert + analyze)* | `npm run gsc:run` |
| `compare-snapshots.js` | `npm run gsc:compare` |
| `track-queries.js` | `npm run gsc:track` |
| `request-index.js` | `npm run gsc:request-index` |
| `generate-article-draft.js` | `npm run gsc:draft` |
| `audit-canonicalization.js` | `npm run gsc:audit` |
| `submit-canonical-cleanup.js` | `npm run gsc:cleanup` |
| `action-plan.js` | `npm run gsc:action-plan` |
| `audit-schema.js` | `npm run gsc:schema` |
| `update-work-log.js` | `npm run gsc:log` |

All scripts live in `scripts/gsc/`. Auth is configured via `.env` (service account key). Data saved to `plans/gsc-data/`.
