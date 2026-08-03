/**
 * lib/classify.js
 *
 * Single source of truth for all GSC classification logic.
 * Pure functions only — no filesystem access, no I/O.
 *
 * Imported by:
 *   scripts/gsc/action-plan.js
 *   scripts/gsc/test-action-plan.js
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const EXPECTED_CTR = {
  1:  0.284, 2:  0.152, 3:  0.103, 4:  0.073, 5:  0.056,
  6:  0.044, 7:  0.035, 8:  0.029, 9:  0.024, 10: 0.020,
  11: 0.016, 12: 0.014, 13: 0.012, 14: 0.011, 15: 0.010,
  16: 0.009, 17: 0.008, 18: 0.007, 19: 0.007, 20: 0.006,
};

export const TAIL_CTR        = 0.004;
export const NOISE_THRESHOLD = 5;
export const CTR_TOLERANCE   = 0.20;

// Priority order for auto-selection.
// Tiers by position band:
//   1–3  : 🔵 Protect | 🟡 Push CTR | 🔴 Snippet
//   4–10 : 🟢 Quick win | 🌟 Gem | 🟠 Push rank
//   11–20: 🟠 Push rank+ | 🌟 Gem | 🟠 Push rank
//   21+  : 🟡 Content | ⚫ Noise
export const TIER_PRIORITY = [
  '🟢 Quick win',
  '🌟 Gem',
  '🟡 Push CTR',
  '🔴 Snippet',
  '🟠 Push rank+',
  '🟠 Push rank',
  '🟡 Content',
  '🔵 Protect',
  '⚫ Noise',
];

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

export function expectedCtr(position) {
  return EXPECTED_CTR[Math.round(position)] ?? TAIL_CTR;
}

export function ctrGap(actualCtr, position) {
  const expected = expectedCtr(position);
  return expected === 0 ? 0 : (actualCtr - expected) / expected;
}

export function opportunityScore(impressions, actualCtr, position) {
  const gap = expectedCtr(position) - actualCtr;
  return gap > 0 ? Math.round(impressions * gap) : 0;
}

export function classifyQuery(avgPosition, actualCtr, impressions) {
  if (impressions < NOISE_THRESHOLD) {
    return { tag: '⚫ Noise', description: 'Too few impressions to act on' };
  }

  const gap             = ctrGap(actualCtr, avgPosition);
  const underperforming = gap < -CTR_TOLERANCE;
  const overperforming  = gap >  CTR_TOLERANCE;

  // Near-zero CTR guard: only applies when the position is good enough that
  // 0.5% CTR is genuinely anomalous. At position 21+ the expected CTR is already
  // near or below 0.5%, so a low raw CTR there is normal — don't misclassify it.
  if (actualCtr < 0.005 && impressions >= 20 && avgPosition <= 20) {
    return { tag: '🔴 Snippet', description: 'Impressions with near-zero CTR — title/description broken' };
  }

  if (avgPosition <= 3) {
    if (underperforming) {
      return { tag: '🟡 Push CTR', description: 'Top position but CTR below expected — rich result or snippet mismatch' };
    }
    return { tag: '🔵 Protect', description: 'Strong position and healthy CTR — monitor for drops' };
  }

  // Positions 4–10: close enough to top that a better snippet alone can lift CTR meaningfully.
  if (avgPosition <= 10) {
    if (underperforming) {
      return { tag: '🟢 Quick win', description: 'Good position, low CTR — improve title/meta description' };
    }
    if (overperforming) {
      return { tag: '🌟 Gem', description: 'CTR above expected for this position — push ranking higher' };
    }
    return { tag: '🟠 Push rank', description: 'Normal CTR but ranking can improve — strengthen content' };
  }

  // Positions 11–20: on page 1 but marginal — low CTR here usually means both
  // the snippet and the content need work; snippet-only is not enough.
  if (avgPosition <= 20) {
    if (underperforming) {
      return { tag: '🟠 Push rank+', description: 'Page 1 but marginal — deepen content and fix snippet together' };
    }
    if (overperforming) {
      return { tag: '🌟 Gem', description: 'Surprising CTR for this position — big upside with content investment' };
    }
    return { tag: '🟠 Push rank', description: 'Normal CTR but ranking can improve — strengthen content' };
  }

  if (overperforming) {
    return { tag: '🌟 Gem', description: 'Surprising CTR for deep position — big upside with content investment' };
  }
  return { tag: '🟡 Content', description: 'Deep position — needs content depth and authority to climb' };
}

/**
 * Routes a classified query entry to a concrete action.
 *
 * @param {object} entry  — enriched query row (avgPosition, actualCtr, tag, pages, query)
 * @returns {{ type: string, label: string, instructions: string[] }}
 */
export function routeAction(entry) {
  const { avgPosition, actualCtr, tag, pages } = entry;
  const isCannibalized = pages.length > 1;

  // Cannibalization takes priority regardless of tier
  if (isCannibalized) {
    return {
      type: 'consolidate',
      label: 'Consolidate cannibalized pages',
      instructions: [
        `${pages.length} URLs compete for the same query. Pick the strongest one as canonical.`,
        `Competing pages:\n${pages.map(p => `  → ${p}`).join('\n')}`,
        'Set <link rel="canonical"> on the weaker pages pointing to the chosen canonical.',
        'Add internal links from the weaker pages to the canonical to pass authority.',
        'Run `npm run gsc:cleanup` after deciding which page to keep.',
        '⚠️  Do not delete pages before updating canonicals — Google needs to crawl the change.',
      ],
    };
  }

  // Good position (4–10) with low CTR → snippet/title rewrite only
  if (avgPosition >= 4 && avgPosition <= 10 && tag === '🟢 Quick win') {
    return {
      type: 'rewrite-snippet',
      label: 'Rewrite title tag + meta description',
      instructions: [
        'The page ranks well but the snippet is not attracting clicks.',
        'Open the target file (shown below) and update the <title> and <meta name="description">.',
        'Title: include the exact keyword, keep under 60 characters, lead with the benefit.',
        'Meta: 140–155 chars, answer the implied question, include a soft CTA or differentiator.',
        'Avoid generic phrases like "Vi erbjuder" — be specific about what the user gets.',
        '⚠️  Do NOT rewrite the page body yet — the ranking is healthy, only the snippet needs work.',
      ],
    };
  }

  // 🔴 Snippet: near-zero CTR despite impressions → broken snippet
  if (tag === '🔴 Snippet') {
    return {
      type: 'fix-snippet',
      label: 'Fix broken title tag + meta description',
      instructions: [
        'The page receives impressions but almost no clicks — the snippet is broken or irrelevant.',
        'Check Google Search Console manually: are there any manual actions or rich result errors?',
        'Rewrite <title>: must match search intent, include the keyword, be under 60 characters.',
        'Rewrite <meta name="description">: 140–155 chars, directly answer the query, include a hook.',
        'After publishing, use GSC URL Inspection to request re-indexing.',
      ],
    };
  }

  // 🟡 Push CTR at top position → possible featured snippet stealing clicks or schema missing
  if (tag === '🟡 Push CTR') {
    return {
      type: 'push-ctr',
      label: 'Fix snippet + check for schema gap',
      instructions: [
        'The page holds a top position but CTR is below benchmark — a rich result may be stealing clicks.',
        'Search for the keyword in an incognito window and check if a featured snippet appears above your result.',
        'If a competitor holds the featured snippet: restructure a section as a clear Q&A or numbered list to compete.',
        'Check if FAQ schema or HowTo schema is missing — run `npm run gsc:analyze` and look for 🟡 Push CTR pages.',
        'Also rewrite the meta description to be more compelling and action-oriented.',
      ],
    };
  }

  // Position 11–20, low CTR → snippet AND content both need work
  if (avgPosition >= 11 && avgPosition <= 20 && tag === '🟠 Push rank+') {
    return {
      type: 'push-rank-and-snippet',
      label: 'Deepen content + rewrite snippet',
      instructions: [
        `The page sits at position ${avgPosition} with CTR below benchmark — both ranking and snippet need work.`,
        'Step 1 — Fix the snippet (quick win while content work happens):',
        '  • Rewrite <title>: keyword first, under 60 chars, lead with the user benefit.',
        '  • Rewrite <meta name="description">: 140–155 chars, answer the implied question, add a soft CTA.',
        'Step 2 — Deepen the content to climb out of the 11–20 band:',
        '  • Identify what the top 3 ranking pages cover that yours does not — add those sections.',
        '  • Expand thin H2 sections to at least 150 words each.',
        '  • Add 2–3 internal links FROM strong pages (behandling, symtom index) TO this page.',
        '  • Add a FAQ section targeting "People also ask" variants for this query.',
        'Do both steps — snippet alone will not move a position-11–20 page meaningfully.',
      ],
    };
  }

  // Position 4–20, normal CTR → deepen content to climb ranking
  if (avgPosition >= 4 && avgPosition <= 20 && tag === '🟠 Push rank') {
    return {
      type: 'deepen-content',
      label: 'Deepen existing page content',
      instructions: [
        'CTR is normal for this position but the page needs to climb to generate meaningful traffic.',
        'Identify what the top 3 ranking pages cover that yours does not — add those sections.',
        'Expand thin sections: each H2 should have at least 150 words and cover the sub-topic fully.',
        'Add 2–3 internal links FROM strong pages (behandling, symtom index) TO this page.',
        'Check if any related queries cluster around this page — if so, add them as FAQ anchors.',
        'Do not change the URL or <title> — only add/expand body content.',
      ],
    };
  }

  // Position 21+ → expand page or write supporting article + internal link
  if (avgPosition > 20 && (tag === '🟡 Content' || tag === '🟠 Push rank')) {
    return {
      type: 'expand-or-support',
      label: 'Expand page or write a supporting article',
      instructions: [
        `The page sits at position ${avgPosition} — deep enough that ranking improvement requires real content investment.`,
        'Option A — Expand the existing page:',
        '  • Add 2–4 new sections covering related sub-topics and long-tail variants.',
        '  • Minimum target: 800–1200 words total if page is currently thin.',
        '  • Add FAQ section with questions that match "People also ask" for this query.',
        'Option B — Write a supporting article (pillar/cluster strategy):',
        '  • Run `npm run gsc:draft -- --keyword "..."` to generate a pre-filled draft.',
        '  • Link back to this page with exact-match anchor text from the new article.',
        '  • Link TO the new article from the existing page.',
        'Choose Option A if the existing page has clear room to grow.',
        'Choose Option B if the page is already substantial and the query deserves its own URL.',
      ],
    };
  }

  // 🌟 Gem — punching above weight, push to top 3
  if (tag === '🌟 Gem') {
    return {
      type: 'push-ranking',
      label: 'Push ranking higher — Gem page',
      instructions: [
        'This page converts clicks above average for its position — it has real ranking potential.',
        'Add internal links from your 3 highest-authority pages (behandling index, homepage, symtom index).',
        'Deepen the content: add sections covering related long-tail queries, case examples, or FAQ.',
        'Improve page experience signals: ensure LCP < 2.5s, no layout shifts, mobile-friendly.',
        'Consider adding structured data (FAQ or Article schema) to improve SERP appearance.',
        'Target: push from current position to top 5 — each position gained multiplies clicks significantly.',
      ],
    };
  }

  // 🔵 Protect — strong position, healthy CTR
  if (tag === '🔵 Protect') {
    return {
      type: 'protect',
      label: 'Monitor and protect existing ranking',
      instructions: [
        'This page ranks well with healthy CTR — no immediate content work needed.',
        'Add to monitoring: run `npm run gsc:track` to track this query week-over-week.',
        'Protect against drops: ensure the page has no duplicate content issues or thin sections.',
        'Consider adding FAQ schema to defend the snippet against competitors.',
        'No content changes recommended — focus effort elsewhere.',
      ],
    };
  }

  // Not ranking / noise → new page or article
  return {
    type: 'new-content',
    label: 'Create new page or article',
    instructions: [
      'No meaningful ranking signal for this query — a new or significantly expanded page is needed.',
      `Run: npm run gsc:draft -- --keyword "${entry.query}"`,
      'This generates a pre-filled Markdown draft in src/content/artiklar/.',
      'After writing, add internal links to the new article from at least 2 existing relevant pages.',
      'Submit for indexing after publishing: npm run gsc:request-index',
    ],
  };
}
