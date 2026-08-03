# Task 2: gsc:action-plan — Decision Layer

**Status:** ✅ Done

## What

A script that takes a query (or auto-selects from the latest snapshot) and outputs a concrete, specific action — not just a tier tag. Routes to the right type of fix before any content work begins.

## Why

`gsc:draft` always generates a new article. But a new article is only the right move in one of several scenarios. Currently there's no step that asks "what should we actually do here?" before acting. This leads to wasted work — rewriting a page that's already good enough, or creating a new article when the existing page just needs a better title tag.

## The decision logic

| GSC signal | Tier | Correct action |
|---|---|---|
| Impressions with near-zero CTR (< 0.5%), position ≤ 20 | `🔴 Snippet` | Fix broken title tag + meta description — the snippet is irrelevant or invisible to users |
| Top 3 position (1–3), CTR below expected | `🟡 Push CTR` | Fix snippet + check for schema gap — a featured snippet or rich result may be stealing clicks above your result |
| Top 3 position (1–3), healthy CTR | `🔵 Protect` | Monitor for drops — no content changes needed |
| Position 4–10, low CTR | `🟢 Quick win` | Rewrite title tag + meta description on existing page — ranking is healthy, only the snippet needs work |
| Position 4–10, normal CTR | `🟠 Push rank` | Deepen existing page content to climb ranking |
| Position 4–10, CTR above expected | `🌟 Gem` | Push ranking higher — internal links + content depth |
| Position 11–20, low CTR | `🟠 Push rank+` | Deepen content AND fix snippet together — snippet-only won't move a marginal page |
| Position 11–20, normal CTR | `🟠 Push rank` | Deepen existing page content |
| Position 11–20, CTR above expected | `🌟 Gem` | Push ranking higher — big upside with content investment |
| Position 21+, any | `🟡 Content` | Expand existing page OR write supporting article + internal link |
| Not ranking at all | `⚫ Noise` | New page or article → call `gsc:draft` |
| Cannibalization detected | — | Consolidate pages, set canonical |

> **Note on the Snippet guard:** The near-zero CTR check only applies to positions ≤ 20. At position 21+ the expected CTR is already near or below 0.5%, so a low raw CTR there is normal — not a broken snippet.

## What was built

- `scripts/gsc/action-plan.js` — decision layer script
- `npm run gsc:action-plan` — registered in `package.json`
- `scripts/gsc/test-action-plan.js` — 35 test cases covering all routing paths

**Flags:**
- `--keyword "..."` — target a specific query
- `--top N` — show the N highest-priority opportunities in one run
- `--snapshot <path>` — target a specific snapshot file instead of the latest

**Output per query:** tier tag, position, CTR vs expected, opportunity score, ranking URL, source file path, numbered action instructions.

**Refinements made after initial implementation:**
- Position tiers split into 4–10 and 11–20 bands (was a single 4–20 band)
- New `push-rank-and-snippet` action for position 11–20 underperformers — deepen content AND fix snippet together, since snippet-only won't move a marginal page
- Snippet guard gated to positions ≤ 20 — at 21+ the expected CTR is already near 0.5%, so low raw CTR there is normal, not a broken snippet
- Fixed fallthrough bug: positions 16–20 with `🟢 Quick win` were routing to `new-content` (wrong)
- Fixed fallthrough bug: position 4 with `🟠 Push rank` was routing to `new-content` (wrong)

## ⚠️ Stale data caveat

This is the first script that acts on GSC data to make content decisions. Task 4 (work-log) is **not yet built** — once it is, it will automatically flag pages changed recently so you don't act twice. Until then: before running `gsc:action-plan` on any opportunity, manually check `plans/gsc-tracked.json` — if the target page was recently tracked, the GSC data predates your change and the signal is stale. GSC lags up to 2 weeks behind a live content update.

## Context files to read before implementing

- `scripts/gsc/analyze-gsc-data.js` — reuse classification/tier logic
- `scripts/gsc/generate-article-draft.js` — integrate for new-article path
- `src/pages/` — script needs to map a ranking URL to an actual source file
