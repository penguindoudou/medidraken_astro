# SEO Cannibalization Playbook — Medidraken

How we reason about and fix keyword cannibalization on this site.
Maintained as source of truth — update this file, then run `knowledge update` to refresh the knowledge base.

---

## What is cannibalization?

When multiple pages on the same site rank for the same query, Google splits its ranking signal across them instead of consolidating it on one strong page. Result: none of the pages rank as well as they could.

Detected via `npm run gsc:alert` — look for the `🔀 Cannibalization detected` output.

---

## Diagnosis checklist

Before touching anything, answer these questions:

1. **Which page should own the query?** Usually the most specific, topically focused page. For "tai chi nyköping" → `/kurser/tai-chi/`.
2. **Why are other pages competing?** Check `title=` and `description=` in `.astro` files. The `title` tag is the primary ranking signal. Descriptions matter less but contribute.
3. **Is the page legitimately about that topic?** A gift card page listing all services is not competing — it's just comprehensive. A corporate wellness page with "Tai Chi i Nyköping" in the title *is* competing.

```bash
# Find all pages with a term in their title tag
grep -r --include="*.astro" "title=.*tai chi" src/pages/
```

---

## Decision rules

### Title tags (strongest signal — act here first)
- **Change** if: the page is not primarily about that topic AND the title creates a "term + location" pairing (e.g. "Tai Chi i Nyköping" on a corporate page).
- **Leave** if: the page legitimately lists multiple services (e.g. presentkort, about us) — Google understands context.
- **Reframe, don't remove** if: the topic is genuinely part of the offer but not the primary focus. Change the title structure so the topic appears as a list item, not a "service i Stad" signal.
  - Bad: "Friskvård för Företag i Nyköping | Medicinsk Qigong, Tai Chi & Behandling"
  - Good: "Företagsfriskvård på Arbetsplatsen i Nyköping | Medidraken" (services in description instead)

### Description tags (weaker signal — secondary)
- Generally safe to leave Tai Chi/Qigong in descriptions even on non-primary pages.
- Only remove if the description reads like a course offering on a page that isn't one.

### Sub-pages of the primary page
- `/kurser/tai-chi/helgkurser/`, `/veckokurser/`, `/privatundervisning/` — these are fine to keep "Tai Chi i Nyköping" in their titles. They're sub-pages and Google treats them as supporting the parent, not competing with it.

---

## Strengthening the primary page

The canonical page needs a stronger signal than it currently has. Apply all three:

1. **Title**: Include exact query + intent signal
   - Pattern: `[Topic] i [City] – [Course types] | [Brand]`
   - Example: "Tai Chi i Nyköping – Kurser & Privatundervisning | Medidraken"

2. **Description**: Front-load the exact query, list course types, end with benefits
   - Pattern: `Lär dig [Topic] i [City]. [Course types]. [Benefit 1], [Benefit 2] – [Benefit 3].`
   - Example: "Lär dig Tai Chi i Nyköping och Gnesta. Helgkurser, veckokurser och privatundervisning. Förbättra balans, kroppskontroll och fokus – minska stress."
   - Keep under 155 chars.

3. **Title length**: Keep under ~60 chars. Check with:
   ```bash
   echo -n "your title here" | wc -c
   ```

---

## What we changed — "tai chi nyköping" (2026-08-04)

| File | Change | Reason |
|---|---|---|
| `/kurser/tai-chi/index.astro` | Title → "Tai Chi i Nyköping – Kurser & Privatundervisning \| Medidraken" | Primary page — strengthened to own the query |
| `/kurser/tai-chi/index.astro` | Description rewritten, 152 chars, query-first | Front-loads exact match, lists all course types |
| `/kurser/index.astro` | Title reframed to lead with location | All-courses page shouldn't compete with specific course page |
| `/upplevelser/workshops-gruppaktiviteter.astro` | Title → "Boka Hälsoworkshop för Grupper i Nyköping – Qigong & Tai Chi" | "Hälsoworkshop för Grupper" signals group booking, not a course |
| `/for-foretag/halsa-pa-arbetsplatsen.astro` | Title → "Företagsfriskvård på Arbetsplatsen i Nyköping \| Medidraken" | Breaks "Tai Chi i Nyköping" pairing; services moved to description |
| `/presentkort.astro` | Left unchanged | Lists all services — Google understands it's a gift card page |
| `/for-foretag/foretagsevent-aktiviteter.astro` | Left unchanged | Tai Chi only in description, not title |
| `/for-foretag/samarbeten-halsoforetag.astro` | Left unchanged | Tai Chi only in description, not title |

---

## Key judgment calls from this session

- **Don't put CTAs ("Boka", "Kontakta") in title tags** — they waste character budget. CTAs belong in descriptions.
- **Always use the full service name** — "Medicinsk Qigong" not "Qigong". The full name is the brand differentiator and a search signal.
- **Descriptions don't drive cannibalization the way titles do.** When in doubt, leave the description alone and fix the title.
- **Don't remove a service from a title just because it causes cannibalization** — reframe the page context instead (e.g. "for groups", "on-site", "gift card").
- **Sub-pages of the primary page are allies, not competitors.** `/kurser/tai-chi/veckokurser/` ranking for "tai chi nyköping veckokurser" is fine — it funnels back to the parent.
- **Character limits matter.** Title ~60 chars, description ~155 chars. Always check with `wc -c`.
- **Push back is valuable.** Several initial proposals were too aggressive (removing Tai Chi entirely from pages where it belongs). The right answer was usually to reframe, not remove.

---

## Related commands

```bash
npm run gsc:run        # Full pipeline: fetch + alert + analyze
npm run gsc:fetch      # Fetch latest GSC data
npm run gsc:alert      # Check for cannibalization and anomalies
npm run gsc:analyze    # Rank opportunities by tag (Gem, Snippet, etc.)
npm run gsc:audit      # Audit canonical URL issues
npm run gsc:cleanup    # Fix canonical variants
```
