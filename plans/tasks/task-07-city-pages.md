# Task 7: City Pages — Gnesta + Oxelösund

**Status:** ⬜ Todo  
**Effort:** Medium per page (~2–3h per treatment × locations)

## What

Separate, independently indexed pages for Gnesta and Oxelösund — one per treatment per location. Each page has its own title tag, H1, body copy mentioning the city, and `LocalBusiness` schema with the specific address.

## Why

City-qualified searches ("akupunktur gnesta", "massage oxelösund") are high-intent and low-competition. You're already physically present in all three cities. A JS city-switcher on a shared page would give Google only one indexable version — separate pages let each city URL rank independently.

Don't build all combinations upfront. Use GSC data to identify which treatment pages have traction in Nyköping, then build the Gnesta/Oxelösund equivalents for those first. Thin content at scale is a risk.

## Locations and addresses (from `src/data/site.ts`)

| City | Address |
|------|---------|
| Nyköping (main) | Östra Storgatan 2, 611 34 Nyköping |
| Gnesta | Dalgatan 20, 646 32 Gnesta |
| Oxelösund | Föreningsgatan 30, 613 31 Oxelösund |

## Suggested URL structure

```
/behandling/medicinsk-kinesisk-massage/gnesta/
/behandling/medicinsk-kinesisk-massage/oxelosund/
/behandling/akupunktur/gnesta/
/behandling/akupunktur/oxelosund/
```

## What each city page needs

- Unique H1 including city name
- Intro paragraph localized to the city (not just find-replace)
- Address block with map link for that city
- `LocalBusiness` JSON-LD with city-specific address
- Internal links back to the main treatment page (Nyköping)
- CTA pointing to `/kontakt/` with city context

## Before starting this task

Check GSC data to confirm which treatments have existing Nyköping traction worth localizing. Don't build city variants for pages that aren't ranking yet.

## Context files to read before implementing

- `src/data/site.ts` — addresses and contact details for all three cities
- The treatment page you're localizing (e.g. `src/pages/behandling/medicinsk-kinesisk-massage.astro`)
- `src/layouts/BaseLayout.astro` — understand the existing LocalBusiness schema to avoid duplicating it incorrectly
