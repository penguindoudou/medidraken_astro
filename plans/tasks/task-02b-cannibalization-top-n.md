# Task 2b: Fix cannibalization in --top N auto-selection

**Status:** ✅ Done

## Problem

When running `npm run gsc:action-plan -- --top N`, the tier-priority loop in `pickQuery()` only sorts by `TIER_PRIORITY` tags from `classifyQuery()`. Cannibalization is not a tag — it's detected inside `routeAction()` by checking `pages.length > 1`. So a cannibalized query surfaces at whatever its underlying tier happens to be (e.g. `🟠 Push rank`) rather than being treated as a distinct priority.

In practice: cannibalized queries appear somewhere in the ranked list but are not explicitly prioritized or labeled as consolidation candidates before the output stage. With `--top 5`, a cannibalization that needs fixing could be buried below lower-priority items, or its position in the list could be misleading (looks like a `🟠 Push rank` opportunity until you read the full output).

## What to change

**Option: promote cannibalized queries to a first-class tier at selection time.**

In `pickQuery()` (or just before it), tag cannibalized entries with a synthetic tier like `'⚠️ Cannibalized'` so the `TIER_PRIORITY` loop can place them explicitly. Don't mutate the `tag` field used for rendering — add a separate `isCannibalized` flag or pre-sort cannibalized entries to the top of whichever tier they fall in.

The simplest correct fix: before the `TIER_PRIORITY` loop, pull out all entries where `pages.length > 1`, sort them by `oppScore`, and prepend them to the candidate list. Then fill remaining slots from the normal tier-priority loop.

## Acceptance criteria

1. `npm run gsc:action-plan -- --top 5` lists cannibalized queries first (or at the top of their natural tier) when they exist in the snapshot
2. The rendered output for a cannibalized entry still shows `consolidate` action with the correct competing URLs
3. Single-keyword mode (`--keyword "..."`) is unaffected
4. `node scripts/gsc/test-action-plan.js` still passes

## Notes

- This is a small fix (~10 lines in `pickQuery()`) but closes a real logic gap
- Cannibalization is rare in this dataset, so the impact is low-frequency — but when it occurs, it's high-priority and should surface first
