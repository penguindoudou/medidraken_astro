# Task 6: Keyword Gap Script

**Status:** ⬜ Todo
**Effort:** Small–Medium (~2–3h)

## What

A script that cross-references a curated seed list of Swedish TCM/health keywords against your actual GSC data, and outputs which queries you have zero or negligible presence for — your content gaps.

## Why

Your existing GSC tools only work with queries you already rank for. `gsc:analyze` and `gsc:draft` optimize the pages you have. But the biggest traffic gains come from topics you're not even in the picture for yet. Without this script, you have no systematic way to discover what to write next.

## What to build

**`plans/keyword-seeds.json`** — a curated list of high-intent Swedish queries organized by category:
- Treatment-specific: "akupunktur mot X", "tui na massage X", "medicinsk qigong X"
- Symptom-specific: variations of your existing symptom pages
- Local: "[treatment] nyköping/gnesta/oxelösund"
- Course-related: "tai chi kurs", "qigong kurs södermanland"
- Goal-oriented: "minska stress naturligt", "förbättra sömn naturligt"

**`scripts/gsc/keyword-gap.js`** — loads the latest GSC snapshot, loads `plans/keyword-seeds.json`, and outputs:
- Queries in the seed list with zero impressions in GSC → not ranking at all → new content needed
- Queries with low impressions but position >30 → exist but invisible → content investment needed
- Sorted by estimated search intent value (manual priority column in seeds file)

New npm script: `gsc:gap`

## Note

Seed list quality determines output quality. Start with ~50–100 seeds covering your core topics. Expand over time. This feeds directly into `gsc:draft` for new article selection.

## Context files to read before implementing

- `scripts/gsc/generate-article-draft.js` — gap output should be consumable by `gsc:draft --keyword`
- `plans/artikel-plan.md` — may already have keyword candidates to seed from
