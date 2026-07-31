# Experiment: `minska-stress-hitta-inre-lugn`

**Page**: `src/pages/na-dina-halsomal/minska-stress-hitta-inre-lugn.astro`  
**URL**: `/na-dina-halsomal/minska-stress-hitta-inre-lugn/`  
**Status**: ⏳ Measuring — check back ~2026-08-27

---

## Experiment #1 — Local keyword on-page optimization

**Date**: 2026-07-30  
**Triggered by**: GSC data showing ~34 impressions at avg pos ~14 for `stresshantering nyköping` — page 2, no clicks  
**Data source**: `plans/gsc-data/gsc-keywords-2026-07-30.json` (period: Jun 30 – Jul 30, 2026)  
**Hypothesis**: Page was competing for the right query but Google wasn't confident about the local relevance. Surfacing "Nyköping" earlier in H1 and meta title should push it from page 2 to page 1 and start generating clicks.

---

### Baseline GSC Metrics (before change)

> Period: **Jun 30 – Jul 30, 2026**  
> Snapshot taken: 2026-07-30  
> Baseline commit: **`7d6bbce`** ← restore this to roll back

#### Target query: `stresshantering nyköping`

| URL | Impressions | Clicks | CTR | Avg Pos |
| :--- | ---: | ---: | ---: | ---: |
| `/na-dina-halsomal/minska-stress-hitta-inre-lugn` (no slash) | 23 | 0 | 0% | 13.8 |
| `/na-dina-halsomal/minska-stress-hitta-inre-lugn/` (slash) | 5 | 0 | 0% | 15.0 |
| `/symtom/utbrandhet-trotthet/` (cannibalization) | 10 | 0 | 0% | 77.9 |
| `/symtom/utbrandhet-trotthet` (no slash, cannibalization) | 1 | 0 | 0% | 81.0 |
| `/na-dina-halsomal/stark-fokus-mental-styrka/` | 1 | 0 | 0% | 91.0 |

**Target page combined** (with+without slash): **28 impressions, 0 clicks, avg pos ~14**

#### Secondary queries hitting target page

| Query | Impressions | Clicks | CTR | Avg Pos |
| :--- | ---: | ---: | ---: | ---: |
| `stresshantering nybro` | 6 | 0 | 0% | ~21 |
| `lugn och ro` | 1 | 0 | 0% | 13.0 |

**Page total (all queries)**: ~35 impressions, 0 clicks

---

### What the Page Looked Like Before (Baseline)

**`<title>`**:
```
Minska Stress & Hitta Inre Lugn | Nyköping | Medidraken
```

**`<meta description>`**:
```
Hitta tillbaka till lugnet och förebygg utmattning. Vi erbjuder effektiva verktyg, behandlingar och kurser för stresshantering i Nyköping & Gnesta.
```

**H1** (SymptomHero `title` prop):
```
Minska Stress & Hitta Inre Lugn
```

**H2** (SymptomHero `subtitle` prop):
```
Verktyg och Stöd för ett Mer Balanserat Liv
```

**Hero intro copy**:
```
I dagens höga tempo är det lätt att tappa fotfästet och känna sig överväldigad av stress. 
Men det är fullt möjligt att hitta tillbaka till ett tillstånd av inre ro och balans. 
Genom våra behandlingar och kurser får du hjälp att lugna nervsystemet, släppa djupa 
spänningar och lära dig konkreta verktyg för att navigera vardagen med mer harmoni.
```

**Methods section intro**: Single paragraph only — no local context mention.

---

### Changes Made

Two commits, both on 2026-07-30:

#### Commit `d762662` — Main optimization
> `seo: optimize minska-stress page for 'stresshantering nyköping' query`

1. **`<title>`**: Reordered to lead with target keyword
   - Before: `Minska Stress & Hitta Inre Lugn | Nyköping | Medidraken`
   - After: `Stresshantering i Nyköping | Minska Stress & Hitta Inre Lugn | Medidraken`

2. **`<meta description>`**: Rewrote to be more explicit about the service + CTA
   - Before: `Hitta tillbaka till lugnet och förebygg utmattning. Vi erbjuder effektiva verktyg, behandlingar och kurser för stresshantering i Nyköping & Gnesta.`
   - After: `Professionell stresshantering i Nyköping. Medidraken erbjuder behandlingar och kurser som lugnar nervsystemet och ger dig verktyg för ett mer balanserat liv. Boka tid idag.`

3. **H1** (SymptomHero `title`): City name moved to front of H1
   - Before: `Minska Stress & Hitta Inre Lugn`
   - After: `Stresshantering i Nyköping — Hitta Inre Lugn & Balans`

4. **H2** (SymptomHero `subtitle`): Changed from generic USP to the original title
   - Before: `Verktyg och Stöd för ett Mer Balanserat Liv`
   - After: `Minska Stress & Hitta Inre Lugn`

5. **Hero intro copy**: Rewritten to open with local search intent signal
   - Before: Generic "I dagens höga tempo är det lätt att tappa fotfästet..."
   - After: "I dagens höga tempo söker allt fler professionell stresshantering i Nyköping..."

6. **Methods section**: Added local context paragraph
   - Added: `Våra patienter i Nyköping och Gnesta kommer till oss med allt från akut stress till långvarig utmattning. Oavsett var du befinner dig i din återhämtning skräddarsyr vi ett upplägg för din stresshantering.`

#### Commit `72ad60f` — Minor meta tweak
> `Update spanningshuvudvark and minska-stress pages`

- **`<meta description>`**: Removed "Boka tid idag." from the end
  - Before: `...ger dig verktyg för ett mer balanserat liv. Boka tid idag.`
  - After: `...ger dig verktyg för ett mer balanserat liv.`
- **Hero intro copy**: Minor phrasing fix (removed unintended line break creating awkward sentence)

#### Commit `3c87373` — Tone & copy refinement
> `seo: refine minska-stress copy — tone, CTA, meta, H1, H2 (GSC #1 iteration 2)`

Review of personal notes from iteration 1 — all issues addressed:

1. **`<title>`**: Second segment refined to be less redundant and more benefit-oriented
   - Before: `Stresshantering i Nyköping | Minska Stress & Hitta Inre Lugn | Medidraken`
   - After: `Stresshantering i Nyköping | Balans för en Hållbar Vardag | Medidraken`

2. **`<meta description>`**: Dropped "Professionell", switched to problem-first opening, updated closing benefit
   - Before: `Professionell stresshantering i Nyköping. Medidraken erbjuder behandlingar och kurser som lugnar nervsystemet och ger dig verktyg för ett mer balanserat liv.`
   - After: `Stressad och överväldigad? Medidraken i Nyköping erbjuder behandlingar och kurser som lugnar och balanserar nervsystemet och ger dig verktyg för en hållbar vardag.`

3. **H1**: Updated to be consistent with new tone, ties to hero intro copy
   - Before: `Stresshantering i Nyköping — Hitta Inre Lugn & Balans`
   - After: `Stresshantering i Nyköping — Hitta Ro & Energi i Vardagen`

4. **H2**: Replaced repeated-title H2 with descriptive benefit statement
   - Before: `Minska Stress & Hitta Inre Lugn`
   - After: `Effektiv Stresshantering för en Hållbar Vardag`

5. **Hero intro copy**: Rewrote from third-person/generic to direct prospect address
   - Before: `I dagens höga tempo söker allt fler professionell stresshantering i Nyköping...`
   - After: `Känner du att det aldrig riktigt går att koppla av — att stressen följer med hem, in i sömnen och in i helgerna? Hos Medidraken i Nyköping får du hjälp att lugna nervsystemet, släppa djupa spänningar och konkreta verktyg för en levande vardag med mer ro och energi.`

6. **Methods section**: Replaced "återhämtning"/"skräddarsyr" with grounded alternatives
   - Before: `Oavsett var du befinner dig i din återhämtning skräddarsyr vi ett upplägg för din stresshantering.`
   - After: `Oavsett var du befinner dig med din stress anpassar vi ett upplägg efter dina behov.`

7. **Method card — Medicinsk Kinesisk Massage desc**: Removed "total återhämtning och ro" (spa framing)
   - Before: `...ger dig en stund av total återhämtning och ro.`
   - After: `...ger kroppen djup vila och nervsystemet en chans att landa.`

8. **CTA button (hero)**: Replaced retreat-framing with neutral action
   - Before: `Boka Tid för Återhämtning`
   - After: `Boka Din Första Tid`

9. **CTA section title**: Replaced "Lugn & Återhämtning" with consistent page theme
   - Before: `Ta Första Steget Mot ett Lugn & Återhämtning`
   - After: `Ta Första Steget mot en Hållbar Vardag`

10. **CTA body copy**: Removed "harmonisk vardag" lifestyle language
    - Before: `...verktygen och stödet för en mer balanserad och harmonisk vardag.`
    - After: `...verktygen och stödet för att hantera stressen och må bättre i vardagen.`

#### Commit `b37c1ed` — Content cleanup
> `content: remove redundant methods section paragraph on minska-stress page`

- **Methods section**: Removed redundant second paragraph
  - Removed: `Vi erbjuder flera vägar för att hjälpa dig minska stress och öka ditt inre lugn. Välj det som passar dig bäst, eller kombinera behandlingar med egen träning för optimal effekt.`
  - Reason: Redundant — section title and method cards already convey the same information. First paragraph (local context) is sufficient intro.

#### Commit `a24ea1f` — Minor copy fixes
> `content: fix imageAlt and tighten CTA copy on minska-stress page`

- **`imageAlt`**: Updated to accurately describe the image content
  - Before: `Person som finner inre lugn i vacker natur`
  - After: `Kvinna som går från stress till inre lugn och balans`

- **CTA body copy**: Tightened to remove repetition of "hantera stressen"
  - Before: `...verktygen och stödet för att hantera stressen och må bättre i vardagen.`
  - After: `...verktygen och stödet för att må bättre och orka med vardagen.`

---

### Notes

- The trailing slash/no-slash split in GSC (28 vs 5 impressions) is a separate canonical issue — tracked in `plans/gsc-data/canon-cleanup-2026-07-30.json`. Canonical fix handled by middleware (`src/middleware.ts` 301 redirect). Needs GSC indexing to consolidate.
- `/symtom/utbrandhet-trotthet/` appearing at pos 78 for this query is noise — not a real cannibalization threat. No action needed unless it climbs.
- `stresshantering nybro` signal (pos ~21) is interesting — suggests the page is picking up surrounding region. Keep monitoring.
- We are **not** adding Nybro-specific copy — would dilute the Nyköping focus which is our actual location.

#### Personal notes on the changes — revisit when measuring (2026-08-27)

**1. Title** — confident. "Balans för en Hållbar Vardag" is grounded and benefit-oriented without overpromising.

**2. Meta — problem-first opening ("Stressad och överväldigad?")** — question format mirrors the prospect's state. Risk: "överväldigad" may feel too strong for someone with moderate stress. Watch bounce rate — if it spikes, the question may be raising expectations the page doesn't meet. Candidate softer opening: `Svårt att koppla av och känner du dig ständigt på språng?`

**3. Hero intro — "koppla av" opening** — strong and relatable. "stressen följer med hem, in i sömnen och in i helgerna" is specific enough to resonate without being clinical. "levande vardag med mer ro och energi" as the closing benefit is concrete and not grandiose.

**4. H2 — "Effektiv Stresshantering för en Hållbar Vardag"** — pairs well with H1. "Effektiv" is a mild claim but acceptable at H2 level.

**5. Page-wide tone** — iteration 2 addressed the main offenders ("återhämtning", "harmonisk vardag", "balanserat liv", "skräddarsyr"). The page now reads more like a functional service offering than a wellness retreat. Review again at 28 days if bounce rate is still high.

---

### How to Roll Back

The baseline is commit **`7d6bbce`**. To restore the page to pre-experiment state:

```bash
# Preview what you're restoring to
git show 7d6bbce:src/pages/na-dina-halsomal/minska-stress-hitta-inre-lugn.astro

# Restore
git checkout 7d6bbce -- src/pages/na-dina-halsomal/minska-stress-hitta-inre-lugn.astro

# Then commit the rollback
git add src/pages/na-dina-halsomal/minska-stress-hitta-inre-lugn.astro
git commit -m "revert: roll back minska-stress SEO experiment #1 (2026-07-30)"
```

---

## Results — Measure at 2026-08-27

> Fill in after pulling fresh GSC data. Use `scripts/gsc/fetch-gsc-queries.js`.

### Target query: `stresshantering nyköping`

| URL | Impressions | Clicks | CTR | Avg Pos |
| :--- | ---: | ---: | ---: | ---: |
| Target page (consolidated) | — | — | — | — |

### Secondary queries

| Query | Impressions | Clicks | CTR | Avg Pos |
| :--- | ---: | ---: | ---: | ---: |
| `stresshantering nybro` | — | — | — | — |
| `lugn och ro` | — | — | — | — |

### Assessment

> [ ] Position improved (target: pos ≤ 10)  
> [ ] CTR improved (target: > 0%)  
> [ ] Impressions consolidated (trailing slash issue resolved)  
> [ ] No cannibalization from `/symtom/utbrandhet-trotthet/`

**Verdict**: ⏳ Pending

**Next action**: _(fill in after measuring)_

---

## Results — Measure at 2026-09-27 (56 days)

> Second measurement for trend confirmation.

_(copy table from above and fill in)_
