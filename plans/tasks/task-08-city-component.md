# Task 8: City-Aware Component

**Status:** ⬜ Todo  
**Effort:** Medium (~3–4h)
**Depends on:** Task 7 (city pages must exist first)

## What

A client-side component that lets users select their city (Nyköping / Gnesta / Oxelösund), persists the choice in `localStorage`, and uses it to surface the correct address and CTA details wherever they appear on the site.

## Why

Once separate city pages exist (Task 7), a user who arrives on the Gnesta akupunktur page and then navigates to the homepage should still see Gnesta-relevant contact info — not the default Nyköping address. This creates a coherent local experience without any SEO downside (Google sees static HTML, the city personalization is purely client-side UX).

## How it works

1. User arrives on `/behandling/akupunktur/gnesta/` → component reads the page's city from a data attribute or meta tag and sets `localStorage.setItem('medidraken_city', 'gnesta')`
2. On any page that has a contact/CTA block, the component reads `localStorage` and swaps in the city-specific address, phone attribution, and map link
3. A small city selector (dropdown or pill buttons) appears in the header or CTA — lets users change city manually
4. Default city when nothing is stored: Nyköping

## Addresses (from `src/data/site.ts`)

| Key | City | Address |
|-----|------|---------|
| `nykoping` | Nyköping | Östra Storgatan 2, 611 34 Nyköping |
| `gnesta` | Gnesta | Dalgatan 20, 646 32 Gnesta |
| `oxelosund` | Oxelösund | Föreningsgatan 30, 613 31 Oxelösund |

## What to build

- New component: `src/components/CitySelector.astro` (or `.ts` client script)
- Update CTA/contact blocks (in `Footer.astro`, `SymptomCTA.astro`, and treatment page CTAs) to read from the city preference
- City pages (Task 7) set the preference automatically on load via a `<script>` tag

## Context files to read before implementing

- `src/data/site.ts` — all address data already structured here
- `src/components/Footer.astro` — main CTA/contact block to update
- `src/components/symptom/SymptomCTA.astro` — used on symptom pages
- Task 7 city pages — need to understand how city is signaled to the component
