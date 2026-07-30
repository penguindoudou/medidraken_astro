# Medidraken SEO & Article Engine Master Plan

## 1. Core Requirements & Settings
- **Language**: Swedish only (`sv-SE`).
- **GSC Access**: Set up via Google Search Console. Service Account recommended.
- **Workflow**: Automated AI draft generation + Astro static content collections.

---

## 2. Status & Completed Work

### Completed Features & Components:
1. **Astro 5 Content Collection Architecture**:
   - Config: [src/content.config.ts](file:///home/wisel/ubuntu_projects/medidraken/src/content.config.ts) (`artiklar` schema with Zod validation).
   - Index Page: [src/pages/artiklar.astro](file:///home/wisel/ubuntu_projects/medidraken/src/pages/artiklar.astro) (prerendered, tag filtering, grid view, CTAs).
   - Detail Page: [src/pages/artiklar/[slug].astro](file:///home/wisel/ubuntu_projects/medidraken/src/pages/artiklar/[slug].astro) (prerendered, `BlogPosting` JSON-LD schema, TOC, breadcrumbs).
   - Navigation: `footerMenu` in [src/data/menu.ts](file:///home/wisel/ubuntu_projects/medidraken/src/data/menu.ts).

2. **Automation Scripts**:
   - GSC Query Fetcher: [scripts/gsc/fetch-gsc-queries.js](file:///home/wisel/ubuntu_projects/medidraken/scripts/gsc/fetch-gsc-queries.js) (supports Service Account JSON or OAuth2).
   - AI Draft Generator: [scripts/gsc/generate-article-draft.js](file:///home/wisel/ubuntu_projects/medidraken/scripts/gsc/generate-article-draft.js).

### 3. Published Target Articles (Educational Focus):
   - `qigong-tcm-halsa-effekter.md`: Educational guide on Qigong & TCM health benefits -> Internal link to [/kurser/](file:///home/wisel/ubuntu_projects/medidraken/src/pages/kurser.astro).
   - `tui-na-massage-terapeutisk-massage.md`: Educational guide on Tui Na vs Swedish massage -> Internal link to [/behandling/tui-na-massage](file:///home/wisel/ubuntu_projects/medidraken/src/pages/behandling/tui-na-massage.astro).
   - `nacksparr-behandling-tui-na-tcm.md`: Symptom guide for acute neck stiffness treated with Tui Na & Traditionell Kinesisk Terapeutisk Massage -> Internal link to [/symtom/nacke-axlar-skuldror/nacksparr-stel-nacke](file:///home/wisel/ubuntu_projects/medidraken/src/pages/symtom/nacke-axlar-skuldror/nacksparr-stel-nacke.astro) & [/behandling/](file:///home/wisel/ubuntu_projects/medidraken/src/pages/behandling.astro).

---

## 3. SEO Strategy & Content Rules

1. **Commercial Intent Queries** (`massage nyköping`, `qigong nyköping`):
   - Target via **Pillar Landing Pages** ([/behandling/tui-na-massage](file:///home/wisel/ubuntu_projects/medidraken/src/pages/behandling/tui-na-massage.astro), [/kurser/](file:///home/wisel/ubuntu_projects/medidraken/src/pages/kurser.astro)).
   - Do NOT build `/artiklar/` targeting exact commercial local keywords to avoid cannibalization.

2. **Educational Intent Queries** (`nackspärr behandling`, `tui na massage fördelar`):
   - Target via **`/artiklar/`**.
   - Build national search authority. Only cover services Medidraken actually offers (Tui Na, Kinesisk Terapeutisk Massage, Qigong, Tai Chi).
   - **Strict Constraint**: NO mention of cupping (koppning). Emphasize Tui Na & Kinesisk Terapeutisk Massage for muscle/symptom treatments.

---

## 4. Workflow & Pending Backlog

### Standard Workflow for Every Article (Hub & Spoke SEO Model):
1. **Audit Existing Site Pages**: Check existing pillar pages in `/symtom/`, `/behandling/`, `/kurser/`, `/upplevelser/`, `/for-foretag/`. Improve existing pages first if needed.
2. **SERP Research**: Inspect #1-3 ranking competitors for target query (headings, search intent, gaps).
3. **Title & Slug Formulation**: Informational/Guide focus for `/artiklar/`. Avoid cannibalizing commercial landing pages.
4. **Content & Internal Link Building**: Write deep TCM educational content. Include strategic contextual links back to relevant existing pillar pages - mainly `/symtom/...`, `/behandling/...`, `/kurser/...` AND secondary for special services for `/for-foretag/...` and `/upplevelser/...` if relevant to transfer search authority & drive conversions. No mention of cupping (koppning).

### Existing Symptom Pages & Supporting Article Backlog:
| Target Keyword / Intent | Existing Pillar Page (Money Page) | Supporting Blog Article (Informational Spoke) |
| :--- | :--- | :--- |
| `ont i knä`, `knäsmärta` | `/symtom/ledvark-idrottsskador/ont-i-knan-knabesvar` | `ont-i-kna-behandling-tui-na-tcm.md` |
| `smärta i axel`, `ont i axel` | `/symtom/nacke-axlar-skuldror/ont-i-axlar-skuldror` | `ont-i-axel-behandling-tui-na-tcm.md` |
| `migrän`, `huvudvärk` | `/symtom/huvudvark/migran` | `migran-behandling-tui-na-tcm.md` |
| `tennisarmbåge`, `armbåge` | `/symtom/ledvark-idrottsskador/tennisarmbage-musarm` | `tennisarmbage-behandling-tui-na-tcm.md` |
| `nackspärr` | `/symtom/nacke-axlar-skuldror/nacksparr-stel-nacke` | `nacksparr-behandling-tui-na-tcm.md` (Published) |

---

## 5. Competitor Reference List

### Nyköping Local Competitors:
- **Akupunktur**: [Bokadirekt Nyköping](https://www.bokadirekt.se/akupunktur/nykoping), [Caranna](https://caranna.se/akupunktur/)
- **Qigong**: [Nyköpingsguiden Qigong](https://www.nykopingsguiden.se/verksamheter/qigongtraning/)
- **Massage**: [Bokadirekt Massage](https://www.bokadirekt.se/massage/nykoping), [Martin Medicinsk Massageterapeut](https://www.bokadirekt.se/places/martin-medicinsk-massageterapeut-ab-24854), [Solhöjden](https://www.solhojden.net/), [Nypan](https://www.nypan.se/)

### Symptom Competitors:
- Kroppsverkstan (`smarta-i-armbage`, `smarta-i-kna`, `nacksparr`, `smarta-i-axel`, `migran`, `smarta-i-ryggen`)

### TCM Authority Competitors:
- Widings, Chinese Medical Center, Wikipedia, TCM-Akupunktur.se, Läkartidningen