# Work Log — Medidraken Content Changes

> **Purpose:** File-level record of every content change pushed to production.
> Read this before any GSC session. If a page has an entry less than **14 days old**, skip it — GSC data is stale relative to the change.
>
> Run `npm run gsc:log` to auto-populate from recent git commits.

---

## How to read this file

Each entry: `path/to/file.astro — what changed | measure after: YYYY-MM-DD`

The measure-after date is commit date + 14 days (minimum GSC lag for content changes).
Wait until that date before treating any GSC signal for that page as actionable.

---

<!-- WORK-LOG-START -->
## 2026-07-31
<!-- hash:5c52314a150421cd153550ba8cde072d5d68b93c -->
- `src/pages/artiklar.astro` — artiklar: update intro and CTA copy to match service naming | measure after: 2026-08-14
<!-- hash:cd5248f5fefce6ea61621053dda1e602a84c5532 -->
- `src/pages/na-dina-halsomal/stark-fokus-mental-styrka.astro` — copy: replace AI calques with plain Swedish on stark-fokus page | measure after: 2026-08-14
<!-- hash:60c0c3da87d70c1e299f63dd16f14914c7e0921a -->
- `src/pages/na-dina-halsomal/stark-fokus-mental-styrka.astro` — seo: align H1 with title tag on stark-fokus page | measure after: 2026-08-14
<!-- hash:3bc014e9a09535349531742bdbd93d815e91c290 -->
- `src/pages/na-dina-halsomal/stark-fokus-mental-styrka.astro` — seo: sharpen meta description for stark-fokus page | measure after: 2026-08-14
<!-- hash:b75fface6f48ce49f7da6b0203c40eac84272a66 -->
- `src/pages/symtom/huvudvark/spanningshuvudvark-stresshuvudvark.astro` — seo: broaden meta description for spanningshuvudvark page | measure after: 2026-08-14
<!-- hash:a24ea1f3354c3b2fd37e512ecc6c18e5ddd52db1 -->
- `src/pages/na-dina-halsomal/minska-stress-hitta-inre-lugn.astro` — content: fix imageAlt and tighten CTA copy on minska-stress page | measure after: 2026-08-14
<!-- hash:b37c1ed6983d3bfef425142388cee8bd3122820e -->
- `src/pages/na-dina-halsomal/minska-stress-hitta-inre-lugn.astro` — content: remove redundant methods section paragraph on minska-stress page | measure after: 2026-08-14
<!-- hash:3c87373af994debb86909a6a6589b3df5ec0ef8c -->
- `src/pages/na-dina-halsomal/minska-stress-hitta-inre-lugn.astro` — seo: refine minska-stress copy — tone, CTA, meta, H1, H2 (GSC #1 iteration 2) | measure after: 2026-08-14

## 2026-07-30
<!-- hash:72ad60fcc7691088c1152627a86400bfb11fa42c -->
- `src/pages/na-dina-halsomal/minska-stress-hitta-inre-lugn.astro` — Update spanningshuvudvark and minska-stress pages | measure after: 2026-08-13
- `src/pages/symtom/huvudvark/spanningshuvudvark-stresshuvudvark.astro` — Update spanningshuvudvark and minska-stress pages | measure after: 2026-08-13
<!-- hash:2f01af124eb07e75fc8510975cabec23a55a8793 -->
- `src/pages/na-dina-halsomal/stark-fokus-mental-styrka.astro` — seo: rewrite title/meta for mental fokus CTR (GSC #3) | measure after: 2026-08-13
<!-- hash:d76266279bea5bd0a17ea8ed36743dc82f5f20a2 -->
- `src/pages/na-dina-halsomal/minska-stress-hitta-inre-lugn.astro` — seo: optimize minska-stress page for 'stresshantering nyköping' query | measure after: 2026-08-13
<!-- hash:b37f8b08c618854e12f6fa98b8ef1e2886c50656 -->
- `src/content/artiklar/massage-nykoping-tui-na-tcm.md` — content: remove artiklar that cannibalize existing pillar pages | measure after: 2026-08-13
- `src/content/artiklar/nacksparr-behandling-tui-na-tcm.md` — content: remove artiklar that cannibalize existing pillar pages | measure after: 2026-08-13
- `src/content/artiklar/qigong-tcm-halsa-effekter.md` — content: remove artiklar that cannibalize existing pillar pages | measure after: 2026-08-13
- `src/content/artiklar/tui-na-massage-terapeutisk-massage.md` — content: remove artiklar that cannibalize existing pillar pages | measure after: 2026-08-13
<!-- hash:b11cc9e7da93767409c5c063849826fcf282acbf -->
- `README.md` — chore: update README and astro.config | measure after: 2026-08-13
<!-- hash:138c1192acd3984bc093e3f9f7f8929e17c4b185 -->
- `src/pages/404.astro` — content: rename TuiNa → Medicinsk Kinesisk Massage on site-wide pages | measure after: 2026-08-13
- `src/pages/behandling/oljemassage.astro` — content: rename TuiNa → Medicinsk Kinesisk Massage on site-wide pages | measure after: 2026-08-13
- `src/pages/for-foretag/samarbeten-halsoforetag.astro` — content: rename TuiNa → Medicinsk Kinesisk Massage on site-wide pages | measure after: 2026-08-13
- `src/pages/friskvardsbidrag.astro` — content: rename TuiNa → Medicinsk Kinesisk Massage on site-wide pages | measure after: 2026-08-13
- `src/pages/index.astro` — content: rename TuiNa → Medicinsk Kinesisk Massage on site-wide pages | measure after: 2026-08-13
- `src/pages/kontakt.astro` — content: rename TuiNa → Medicinsk Kinesisk Massage on site-wide pages | measure after: 2026-08-13
- `src/pages/om-oss.astro` — content: rename TuiNa → Medicinsk Kinesisk Massage on site-wide pages | measure after: 2026-08-13
- `src/pages/presentkort.astro` — content: rename TuiNa → Medicinsk Kinesisk Massage on site-wide pages | measure after: 2026-08-13
<!-- WORK-LOG-END -->
