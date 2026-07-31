# Experiment: `spanningshuvudvark-stresshuvudvark`

**Page**: `src/pages/symtom/huvudvark/spanningshuvudvark-stresshuvudvark.astro`  
**URL**: `/symtom/huvudvark/spanningshuvudvark-stresshuvudvark/`  
**Status**: ⏳ Measuring — check back ~2026-08-27

---

## Experiment #1 — Title & meta description CTR optimization

**Date**: 2026-07-30  
**Triggered by**: GSC data showing ~18 impressions at avg pos ~9 for `stresshuvudvärk` — bottom page 1, zero clicks  
**Data source**: `plans/gsc-data/gsc-keywords-2026-07-30.json` (period: Jun 30 – Jul 30, 2026)  
**Hypothesis**: Page already ranking page 1 for `stresshuvudvärk` (~pos 9) but title was generic and treatment-framed. Rewriting to lead with the query term and add local (Nyköping) signal should improve CTR and potentially lift position.

---

### Baseline GSC Metrics (before change)

> Period: **Jun 30 – Jul 30, 2026**  
> Snapshot taken: 2026-07-30  
> Baseline commit: **`7d6bbce`** ← restore this to roll back

#### Target query: `stresshuvudvärk`

| URL | Impressions | Clicks | CTR | Avg Pos |
| :--- | ---: | ---: | ---: | ---: |
| `www.medidraken.com/symtom/huvudvark/spanningshuvudvark-stresshuvudvark/` | 13 | 0 | 0% | 9.5 |
| `medidraken.com/symtom/huvudvark/spanningshuvudvark-stresshuvudvark/` | 5 | 0 | 0% | 8.2 |

**Target page combined** (www + non-www): **18 impressions, 0 clicks, avg pos ~9**

#### Secondary queries hitting target page

| Query | Impressions | Clicks | CTR | Avg Pos |
| :--- | ---: | ---: | ---: | ---: |
| `massage spänningshuvudvärk` | 12 | 0 | 0% | ~29 |
| `massage för spänningshuvudvärk` | 8 | 0 | 0% | ~30 |
| `massage mot spänningshuvudvärk` | 8 | 0 | 0% | ~30 |
| `spänningshuvudvärk massage` | 6 | 0 | 0% | ~29 |
| `spänningshuvudvärk behandling` | 1 | 0 | 0% | 58.0 |
| `stress huvudvärk` | 1 | 0 | 0% | 30.0 |
| `akupunktur huvudvärk` | 1 | 0 | 0% | 48.0 |
| `akupunktur mot huvudvärk` | 1 | 0 | 0% | 58.0 |
| `akupunktur spänningshuvudvärk` | 1 | 0 | 0% | 34.0 |

**Page total (all queries)**: ~56 impressions, 0 clicks

---

### What the Page Looked Like Before (Baseline)

**`<title>`**:
```
Behandling vid Spänningshuvudvärk & Stresshuvudvärk | Medidraken
```

**`<meta description>`**:
```
Få hjälp med din spänningshuvudvärk. Vi arbetar med Medicinsk Kinesisk Massage (TuiNa) & Akupunktur för att lösa upp spänningar i nacke och käkar samt reducera stress.
```

**H1** (SymptomHero `title` prop):
```
Låt Oss Hjälpa Dig Med Din Spänningshuvudvärk
```

**H2** (SymptomHero `subtitle` prop):
```
Behandling för Nacke, Axlar och Huvud
```

**Hero intro copy**:
```
Upplever du en molande värk som ett trångt band runt huvudet? 
Spänningshuvudvärk, även kallat stresshuvudvärk, orsakas ofta av ihållande muskelspänningar i nacke, 
axlar och käkar som byggts upp av stress och statiskt arbete. 
Vi hjälper dig att lösa upp spänningarna, reglera nervsystemet så att din kropp får bättre 
förutsättningar för minskad smärta.
```

---

### Changes Made

One commit on 2026-07-30:

#### Commit `72ad60f` — Title & meta CTR optimization
> `Update spanningshuvudvark and minska-stress pages`

1. **`<title>`**: Reordered to lead with target keyword + added local signal
   - Before: `Behandling vid Spänningshuvudvärk & Stresshuvudvärk | Medidraken`
   - After: `Stresshuvudvärk & Spänningshuvudvärk – Behandling i Nyköping | Medidraken`

2. **`<meta description>`**: Rewrote to open with symptom recognition + cleaner treatment CTA
   - Before: `Få hjälp med din spänningshuvudvärk. Vi arbetar med Medicinsk Kinesisk Massage (TuiNa) & Akupunktur för att lösa upp spänningar i nacke och käkar samt reducera stress.`
   - After (v1, 2026-07-30): `Lider du av stresshuvudvärk eller ett tryckande band runt huvudet? Vi arbetar med Medicinsk Massage för att lösa upp spänningarna som orsakar din huvudvärk.`
   - After (v2, 2026-07-31): `Lider du av återkommande stresshuvudvärk? Vi arbetar med Medicinsk Massage för att lösa upp spänningarna som orsakar din huvudvärk.`
   - Rationale for v2: "återkommande" speaks directly to the chronic sufferer (the core audience). Dropped "ett tryckande band runt huvudet" to go broader first — the band description is accurate but may filter out people who experience the same condition differently. Saved as candidate for a later experiment if broad version underperforms.

No changes to H1, H2, body copy, FAQs, or page structure — metadata only.

---

### Notes

- Primary lever here is CTR, not ranking — page was already on page 1 (pos ~9). Title rewrite leads with the exact query term `stresshuvudvärk` and adds `Nyköping` for local disambiguation.
- The "massage + spänningshuvudvärk" cluster (pos 28–30, ~34 combined impressions) is a separate opportunity — all hitting the pillar because there's no spoke article. A dedicated spoke (`stresshuvudvark-behandling-tui-na-tcm`) could absorb these and rank better. Not yet created — track separately.
- www vs non-www split in GSC is a canonical/indexing noise issue, same as trailing-slash split on other pages. Being addressed via middleware.
- Akupunktur queries (pos 48–58) noted but not targeted — brand positioning leads with Tui Na/Medicinsk Kinesisk Massage per strategy.
- Meta description intentionally omits "TuiNa" brand name — simplified to "Medicinsk Massage" for cleaner CTR copy for a general searcher.

#### Personal notes on the meta description — revisit when measuring (2026-08-27)

Title change: confident, no doubts.

Meta description: mixed feelings on three points to evaluate against CTR data:

1. **"Lider du"** — opening with "lider" might feel too clinical or heavy for someone who just has a recurring headache. Could feel off-putting rather than relatable. Consider softer alternatives like "Har du" or "Besväras du av" if CTR stays low.

2. **"ett tryckande band runt huvudet"** — the symptom description is medically accurate but unclear if prospects actually think of it that way. It may resonate with people who know the classic description of tension headache, or it may feel too specific/jargon-y. Worth watching whether it helps or hurts. Alternative: describe the sensation more loosely ("återkommande huvudvärk från stress och spänningar").

3. **Method specificity** — the old version named Medicinsk Kinesisk Massage (TuiNa) & Akupunktur explicitly. The new version says "Medicinsk Massage" generically. Trade-off: losing specificity may reduce trust/differentiation, but a cleaner description could improve CTR from general searchers who aren't looking for a specific method yet. Theory: they should discover the method *after* clicking, not be filtered out before. Revisit if CTR improves but bounce rate goes up.

4. **Neck/shoulders/jaws angle** — the copy could explain *why* massage works by mentioning that tension headache originates from muscle tension in the neck, shoulders, and jaw — making the treatment logic immediately clear in the SERP snippet. Counterargument: 160 chars is tight and that explanation might be better placed on-page after the click. Don't add it to the meta unless the current version underperforms and we need a new hypothesis.

**When measuring**: if CTR is still 0% at 28 days, test a rewrite that addresses points 1–2 above. Keep title unchanged.

**Candidates for experiment #2 (if current version underperforms)**:

Option A — specific symptom description (narrower, filters for people who recognize the band sensation):
```
Lider du av stresshuvudvärk eller ett tryckande band runt huvudet? Vi arbetar med Medicinsk Massage för att lösa upp spänningarna som orsakar din huvudvärk.
```
This was v1 (2026-07-30). Accurate clinical description — may resonate strongly with people who recognize it, or may feel too specific for those who don't describe it that way.

Option B — mechanism-explicit:
```
Besväras du av återkommande stresshuvudvärk? Vi arbetar med Medicinsk Massage för att lösa upp spänningarna i nacke och axlar som orsakar din huvudvärk.
```
Softer opening ("Besväras du"). Adds "i nacke och axlar" to make treatment logic clear in the snippet. Uncertain whether mechanism detail helps or clutters in 160 chars.

---

### How to Roll Back

The baseline is commit **`7d6bbce`**. To restore the page to pre-experiment state:

```bash
# Preview what you're restoring to
git show 7d6bbce:src/pages/symtom/huvudvark/spanningshuvudvark-stresshuvudvark.astro

# Restore
git checkout 7d6bbce -- src/pages/symtom/huvudvark/spanningshuvudvark-stresshuvudvark.astro

# Then commit the rollback
git add src/pages/symtom/huvudvark/spanningshuvudvark-stresshuvudvark.astro
git commit -m "revert: roll back spanningshuvudvark SEO experiment #1 (2026-07-30)"
```

---

## Results — Measure at 2026-08-27

> Fill in after pulling fresh GSC data. Use `scripts/gsc/fetch-gsc-queries.js`.

### Target query: `stresshuvudvärk`

| URL | Impressions | Clicks | CTR | Avg Pos |
| :--- | ---: | ---: | ---: | ---: |
| Target page (consolidated) | — | — | — | — |

### Secondary queries

| Query | Impressions | Clicks | CTR | Avg Pos |
| :--- | ---: | ---: | ---: | ---: |
| `massage spänningshuvudvärk` | — | — | — | — |
| `massage för spänningshuvudvärk` | — | — | — | — |
| `massage mot spänningshuvudvärk` | — | — | — | — |
| `spänningshuvudvärk massage` | — | — | — | — |

### Assessment

> [ ] CTR improved on `stresshuvudvärk` (target: > 0%)  
> [ ] Position maintained or improved (target: pos ≤ 9)  
> [ ] "Massage" cluster showing any movement (pos 28–30 → lower)  
> [ ] www/non-www split consolidating in GSC

**Verdict**: ⏳ Pending

**Next action**: _(fill in after measuring)_

---

## Results — Measure at 2026-09-27 (56 days)

> Second measurement for trend confirmation.

_(copy table from above and fill in)_
