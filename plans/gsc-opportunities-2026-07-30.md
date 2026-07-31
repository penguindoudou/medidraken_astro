# GSC Opportunities — 2026-07-30 Snapshot

Derived from `gsc-keywords-2026-07-30.json` using the opportunity classifier.
100 queries · 483 impressions · 9 clicks · 1.86% overall CTR

Prioritized by estimated impact (potential clicks recovered + strategic value).

---

## P1 — Fix "massage oxelösund" title/meta (🟡 Push CTR)

**Position:** 2.3 · **CTR:** 6.4% · **Expected:** ~15% · **Gap:** -58% · **Est. gain:** ~4 clicks

You're ranking second — the position is already won. But CTR is less than half of what position 2 should deliver. Something is suppressing clicks: either a map pack or featured result sits above you, or the title/description isn't compelling.

**Actions:**
1. Search "massage oxelösund" in incognito to see the actual SERP and what's above you.
2. Rewrite the title tag and meta description on the serving page (homepage) — make the value proposition and location explicit.

---

## P2 — Resolve cannibalization + fix snippets for "akupunktur nyköping" and "tai chi" (🔴 Snippet)

Both: ~34 impressions, 0 clicks. Legacy HTML pages are still indexed and splitting authority.

**"akupunktur nyköping"** — 3 cannibalizing URLs: homepage, `johannes.html`, `/behandling/akupunktur`
**"tai chi"** — 3 cannibalizing URLs: homepage, `taiji.html`, `/kurser/tai-chi`

**Actions:**
1. Ensure `johannes.html` and `taiji.html` 301-redirect to their canonical Astro replacements (or add `noindex` if not yet redirected).
2. Rewrite title and meta description on `/behandling/akupunktur` and `/kurser/tai-chi` — include city name, clear value proposition, strong reason to click.
3. Submit updated URLs via `gsc:request-index` after changes.

---

## P3 — Consolidate "tai chi nyköping" to unlock a gem (🌟 Gem)

**Position:** 29 · **CTR:** 5.0% · **Expected for pos 29:** ~0.4% · **Gap:** +1150%

This query punches 12× above expected CTR for its depth — real intent, real clicks. But it's fragmented across **11 URLs**, so no single page accumulates enough authority to rank higher.

**Actions:**
1. Audit the 11 cannibalizing URLs — most are tangential (corporate pages, health goals) that don't genuinely serve "tai chi nyköping" intent.
2. Remove or tone down references to tai chi on pages where it's incidental.
3. Strengthen `/kurser/tai-chi` as the single target: local signals, structured data, internal links from related pages pointing to it.
4. Submit `/kurser/tai-chi` via `gsc:request-index` after changes.

---

## P4 — Title/meta rewrites for zero-click quick wins (🟢 Quick win)

Five pages ranking in position 5–19 with 5–18 impressions each and 0 clicks. Content is there, position is there — snippet is the only problem.

| Query | Position | Impressions | Likely page |
|---|---|---|---|
| akupunktur mot utbrändhet | 18.6 | 18 | `/symtom/utbrandhet-trotthet` or `/na-dina-halsomal` |
| stresshuvudvärk | 9.1 | 18 | `/symtom/huvudvark/spanningshuvudvark-stresshuvudvark` |
| höftbesvär | 14.6 | 16 | `/symtom/ledvark-idrottsskador/ont-i-hofter` |
| mental fokus | 7.2 | 12 | `/na-dina-halsomal/stark-fokus-mental-styrka` |
| tuina massage | 5.8 | 5 | `/behandling/medicinsk-kinesisk-massage` |

**Action:** Review and rewrite title tags and meta descriptions on each page. Lean into the specific symptom or benefit in the title, not just the category.

---

## P5 — Content depth: "stresshantering nyköping" cluster (🟡 Content + cannibalization)

**Position:** 33 · **Impressions:** 40 · **Clicks:** 0 · Split across 3 pages.

High-intent local query with real volume for a small site. Google sees the topic but doesn't trust the depth yet.

**Actions:**
1. Designate `/na-dina-halsomal/minska-stress-hitta-inre-lugn` as the canonical target for stress-related local search.
2. Add local signals to that page (city name, practice context).
3. Deepen the content — more specific treatment descriptions, client outcomes, what a session looks like.
4. Ensure the other two cannibalizing pages don't compete directly (adjust their meta, add canonical if needed).

---

## Background note

Total snapshot volume is small (483 impressions). Most of the 100 queries sit in ⚫ Noise (1–4 impressions) — not worth acting on individually, but useful as a baseline. Run `gsc:compare` after making P1–P3 changes to measure movement in the next snapshot.
