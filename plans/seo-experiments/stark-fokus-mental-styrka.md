# Experiment: `stark-fokus-mental-styrka`

**Page**: `src/pages/na-dina-halsomal/stark-fokus-mental-styrka.astro`  
**URL**: `/na-dina-halsomal/stark-fokus-mental-styrka/`  
**Status**: ⏳ Measuring — check back ~2026-08-27

---

## Experiment #1 — CTR fix via title & meta rewrite

**Date**: 2026-07-30  
**Triggered by**: GSC data showing 12 impressions at avg pos 7.2 for `mental fokus` — page 1, zero clicks  
**Data source**: `plans/gsc-data/gsc-keywords-2026-07-30.json` (period: Jun 30 – Jul 30, 2026)  
**Hypothesis**: Page was already ranking on page 1 (pos 7) but getting zero clicks — a pure CTR failure. The old title led with "Stärk Fokus & Mental Styrka" which doesn't match the search query phrasing `mental fokus`. Rewriting the title to open with "Mental Fokus" and rewriting the meta description to address the prospect's problem directly should unlock clicks without needing any on-page content changes.

---

### Baseline GSC Metrics (before change)

> Period: **Jun 30 – Jul 30, 2026**  
> Snapshot taken: 2026-07-30  
> Baseline commit: **`7d6bbce`** ← restore this to roll back

#### Target query: `mental fokus`

| URL | Impressions | Clicks | CTR | Avg Pos |
| :--- | ---: | ---: | ---: | ---: |
| `/na-dina-halsomal/stark-fokus-mental-styrka/` | 12 | 0 | 0% | 7.2 |

#### Secondary queries hitting target page

| Query | Impressions | Clicks | CTR | Avg Pos |
| :--- | ---: | ---: | ---: | ---: |
| `mentalt dränerad` | 2 | 0 | 0% | 10.0 |
| `rensa för ökad klarhet` | 1 | 0 | 0% | 7.0 |
| `mental klarhet` | 1 | 0 | 0% | 19.0 |

**Page total (all queries)**: ~16 impressions, 0 clicks

---

### What the Page Looked Like Before (Baseline)

**`<title>`**:
```
Stärk Fokus & Mental Styrka | Nyköping | Medidraken
```

**`<meta description>`**:
```
Förbättra din koncentration, minska mental trötthet och bygg en stark inre grund. Upptäck hur Medicinsk Qigong, Tai Chi och Akupunktur i Nyköping ger dig skarpare fokus.
```

**H1, H2, body copy**: Unchanged — this experiment touched metadata only.

---

### Changes Made

#### Commit `2f01af1` — Title and meta rewrite
> `seo: rewrite title/meta for mental fokus CTR (GSC #3)`

1. **`<title>`**: Led with the target query keyword
   - Before: `Stärk Fokus & Mental Styrka | Nyköping | Medidraken`
   - After: `Mental Fokus & Inre Styrka | Nyköping | Medidraken`

2. **`<meta description>`**: Rewrote to open with a problem statement matching search intent
   - Before: `Förbättra din koncentration, minska mental trötthet och bygg en stark inre grund. Upptäck hur Medicinsk Qigong, Tai Chi och Akupunktur i Nyköping ger dig skarpare fokus.`
   - After (v1, 2026-07-30): `Svårt att hålla mental fokus och klarhet hela dagen? Vi hjälper dig rensa hjärndimma och bygga uthållig koncentration med Qigong, Tai Chi och behandling i Nyköping.`
   - After (v2, 2026-07-31, commit `3bc014e`): `Svårt att tänka klart och hålla fokus? Vi hjälper dig bygga uthållig koncentration med Medicinsk Qigong, Tai Chi och Akupunktur i Nyköping.`
   - Rationale for v2: Replaced AI calque "rensa hjärndimma" with plain Swedish "tänka klart". Restored "Medicinsk Qigong" (clinical credibility) and "Akupunktur" (specific over vague "behandling"). Dropped filler "hela dagen". 141 chars.

No other elements were changed (H1, H2, body copy, FAQ are all identical to baseline).

#### Commit `60c0c3d` — H1 alignment (2026-07-31)
- **H1**: Aligned with title tag to reduce post-click bounce from expectation mismatch
  - Before: `Stärk Fokus & Mental Styrka`
  - After: `Mental Fokus & Inre Styrka`

---

### Notes

- This was diagnosed as a pure CTR problem — pos 7 with 12 impressions and zero clicks means the result appeared in front of people who weren't compelled to click. Content is fine; packaging was wrong.
- Query `mental fokus` is generic/national (no local intent). Ranking at 7 is still useful for brand authority and top-of-funnel awareness, even if conversion rate will be lower than local commercial queries.
- Secondary queries (`mentalt dränerad`, `rensa för ökad klarhet`) confirm the content matches real search intent — the old title just didn't reflect it.
- Lowest-effort fix of the three GSC opportunities: no on-page rewrite needed, metadata only.

#### Personal notes on the changes — revisit when measuring (2026-08-27)

**1. Title — "Mental Fokus" lead** — straightforward and correct. The old title buried the keyword. Leading with "Mental Fokus" is the obvious fix for a query where the ranking was already there.

**2. Title — "Inre Styrka" vs "Mental Styrka"** — "Inre Styrka" is softer and more TCM-aligned, but "Mental Styrka" was the original copy and is arguably more googleable. Worth watching — if CTR doesn't improve, consider whether "Inre Styrka" is too abstract for the prospect compared to the more functional "Mental Styrka".

**3. Meta — problem-first opening ("Svårt att hålla mental fokus...")** — question format is a well-known CTR pattern (mirrors the prospect's internal monologue). Risk is that it can read as clickbait-y. Check if CTR improves or if bounce rate spikes — high bounce would suggest the question raised expectations the page doesn't fully meet.

**4. Meta — "rensa hjärndimma"** — good use of a phrase that appears verbatim in the secondary query signals (`rensa för ökad klarhet`). Signals content match to both the user and Google.

**5. Meta — "uthållig koncentration"** — "uthållig" (sustainable/enduring) is a meaningful qualifier. It differentiates from a caffeine fix and frames TCM methods accurately. Keep it.

**6. Meta — "med Qigong, Tai Chi och behandling"** — "behandling" is vague here. The old version named "Akupunktur" explicitly. Naming a third specific method (Akupunktur or TuiNa) would be more credible and informative. If CTR is flat, consider restoring "Akupunktur" to give the meta more specificity and trust signals.

**7. Meta — candidate revision (not yet applied)** — three issues with the current description worth addressing at 28 days:
- "Medicinsk" was dropped from "Medicinsk Qigong" — restore it.
- "Akupunktur" was dropped in favour of the vague "behandling" — restore it.
- Opening clause is unnatural — replace with "Svårt att tänka klart och hålla fokus?"

> ⚠️ **Writing note for future edits**: avoid AI-generated calques like "rensa hjärndimma" (from "clear brain fog") and "skingra tankarna" (literary/poetic, not how people talk). Prefer plain, spoken Swedish: "tänka klart", "hålla fokus", "koncentrationen sviker".

Candidate replacement:
```
Svårt att tänka klart och hålla fokus? Vi hjälper dig bygga uthållig koncentration med Medicinsk Qigong, Tai Chi och Akupunktur i Nyköping.
```
(141 chars — fits comfortably.) If CTR is still zero at 28 days, apply this before the 56-day measurement.

**8. No H1/body changes** — correct call given it was a CTR problem not a ranking problem. If position drops after the title change (Google may re-evaluate relevance), that would indicate the old title was doing more ranking work than expected. Monitor position closely at 28 days.

---

### How to Roll Back

The baseline is commit **`7d6bbce`**. To restore the page to pre-experiment state:

```bash
# Preview what you're restoring to
git show 7d6bbce:src/pages/na-dina-halsomal/stark-fokus-mental-styrka.astro

# Restore
git checkout 7d6bbce -- src/pages/na-dina-halsomal/stark-fokus-mental-styrka.astro

# Then commit the rollback
git add src/pages/na-dina-halsomal/stark-fokus-mental-styrka.astro
git commit -m "revert: roll back stark-fokus SEO experiment #1 (2026-07-30)"
```

---

## Results — Measure at 2026-08-27

> Fill in after pulling fresh GSC data. Use `scripts/gsc/fetch-gsc-queries.js`.

### Target query: `mental fokus`

| URL | Impressions | Clicks | CTR | Avg Pos |
| :--- | ---: | ---: | ---: | ---: |
| Target page | — | — | — | — |

### Secondary queries

| Query | Impressions | Clicks | CTR | Avg Pos |
| :--- | ---: | ---: | ---: | ---: |
| `mentalt dränerad` | — | — | — | — |
| `rensa för ökad klarhet` | — | — | — | — |
| `mental klarhet` | — | — | — | — |

### Assessment

> [ ] CTR improved (target: > 0% — any click is a win from zero)  
> [ ] Position held or improved (watch for drop from title change)  
> [ ] Impressions stable or growing

**Verdict**: ⏳ Pending

**Next action**: _(fill in after measuring)_

---

## Results — Measure at 2026-09-27 (56 days)

> Second measurement for trend confirmation.

_(copy table from above and fill in)_
