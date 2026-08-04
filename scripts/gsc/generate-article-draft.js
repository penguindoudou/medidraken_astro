/**
 * generate-article-draft.js
 *
 * Generates a Medidraken article draft (.md) pre-filled with real GSC data.
 *
 * Usage:
 *   # Auto-select the highest-priority quick win from the latest snapshot
 *   node scripts/gsc/generate-article-draft.js
 *
 *   # Target a specific keyword
 *   node scripts/gsc/generate-article-draft.js --keyword "massage nyköping"
 *
 *   # Use a specific snapshot file
 *   node scripts/gsc/generate-article-draft.js --snapshot plans/gsc-data/gsc-keywords-2026-07-31.json
 *
 *   # Combine
 *   node scripts/gsc/generate-article-draft.js --snapshot plans/gsc-data/foo.json --keyword "akupunktur"
 *
 * npm script:
 *   npm run gsc:draft -- --keyword "massage nyköping"
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  EXPECTED_CTR, TAIL_CTR, NOISE_THRESHOLD, CTR_TOLERANCE,
  expectedCtr, ctrGap, opportunityScore, classifyQuery,
  TIER_PRIORITY,
} from './lib/classify.js';

// ---------------------------------------------------------------------------
// Angle suggestions per tier
// Maps to actionable editorial direction embedded in the draft.
// ---------------------------------------------------------------------------

const ANGLE_BY_TAG = {
  '🟢 Quick win':  'Klickar väntar — fokusera på att skriva ett mer lockande title-tag och meta-beskrivning för sökordet. Innehållet är tillräckligt bra, men sidan syns inte attraktivt i sökresultaten.',
  '🟡 Push CTR':   'Sidan rankar högt men tappar klick. Kontrollera om det finns en featured snippet som stjäl trafik, eller om title/meta kan göras mer övertygande och specifik.',
  '🟠 Push rank':  'CTR är normal för positionen men sidan behöver klättra. Fördjupa innehållet, lägg till fler relaterade begrepp och komplettera med interna länkningar från starka sidor.',
  '🌟 Gem':        'Sidan lockar fler klick än förväntat trots sin position — hög potential. Investera i att stärka auktoriteten: fler backlinks, mer djupgående innehåll och kompletterande sektioner.',
  '🔵 Protect':    'Stark position och bra CTR. Prioritering: bevaka sidan mot drop, lägg till FAQ-schema eller strukturerad data, och säkerställ att UX och laddningstid är optimal.',
  '🔴 Snippet':    'Sidan visas men ingen klickar. Skriv om title-taggen och meta-beskrivningen — de ska vara konkreta, svara på sökavsikten och skilja sig från konkurrenterna.',
  '🟡 Content':    'Sidan är djupt rankad och behöver grundläggande innehållslyftet: djupare täckning av ämnet, fler relevanta sektioner och bättre intern länkstruktur.',
  '⚫ Noise':       'För lite data för att agera. Bevaka om sidan samlar fler intryck kommande månader.',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

function normalizeUrl(url) {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--keyword'  && argv[i + 1]) { args.keyword  = argv[++i]; continue; }
    if (argv[i] === '--snapshot' && argv[i + 1]) { args.snapshot = argv[++i]; continue; }
  }
  return args;
}

// ---------------------------------------------------------------------------
// GSC data loading + roll-up (same logic as analyze-gsc-data.js)
// ---------------------------------------------------------------------------

function loadSnapshot(snapshotPath) {
  const raw  = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  const byQuery = {};

  for (const row of raw) {
    const [query, url] = row.keys;
    if (!byQuery[query]) {
      byQuery[query] = { clicks: 0, impressions: 0, positions: [], pages: [] };
    }
    byQuery[query].clicks      += row.clicks;
    byQuery[query].impressions += row.impressions;
    byQuery[query].positions.push({ pos: row.position, imp: row.impressions });
    byQuery[query].pages.push(normalizeUrl(url));
  }

  return Object.entries(byQuery).map(([query, d]) => {
    const totalImpForPos = d.positions.reduce((s, p) => s + p.imp, 0);
    const weightedPos    = totalImpForPos > 0
      ? d.positions.reduce((s, p) => s + p.pos * p.imp, 0) / totalImpForPos
      : d.positions.reduce((s, p) => s + p.pos, 0) / d.positions.length;

    const avgPos    = Math.round(weightedPos * 10) / 10;
    const actualCtr = d.impressions > 0 ? d.clicks / d.impressions : 0;
    const expCtr    = expectedCtr(avgPos);
    const oppScore  = opportunityScore(d.impressions, actualCtr, avgPos);
    const { tag, description } = classifyQuery(avgPos, actualCtr, d.impressions);

    return {
      query,
      clicks:      d.clicks,
      impressions: d.impressions,
      avgPosition: avgPos,
      actualCtr,
      expCtr,
      oppScore,
      tag,
      description,
      pages: [...new Set(d.pages)],
    };
  });
}

function findLatestSnapshot() {
  const dataDir = path.resolve(process.cwd(), 'plans/gsc-data');
  if (!fs.existsSync(dataDir)) {
    console.error(`GSC data directory not found: ${dataDir}`);
    process.exit(1);
  }
  const files = fs.readdirSync(dataDir)
    .filter(f => f.startsWith('gsc-keywords') && f.endsWith('.json'))
    .sort();
  if (files.length === 0) {
    console.error('No gsc-keywords-*.json files found in plans/gsc-data/');
    process.exit(1);
  }
  return path.join(dataDir, files[files.length - 1]);
}

function pickQuery(results, keyword) {
  if (keyword) {
    const kw = keyword.toLowerCase();
    const match = results.find(r => r.query.toLowerCase() === kw);
    if (!match) {
      // Partial match fallback
      const partial = results.filter(r => r.query.toLowerCase().includes(kw));
      if (partial.length === 0) {
        console.error(`Keyword "${keyword}" not found in snapshot.`);
        console.error('Available queries (sample):');
        results.slice(0, 10).forEach(r => console.error(`  ${r.query}`));
        process.exit(1);
      }
      if (partial.length === 1) return partial[0];
      // Among partials, pick highest opportunity
      return partial.sort((a, b) => b.oppScore - a.oppScore)[0];
    }
    return match;
  }

  // Auto-select: highest-priority tier, then highest oppScore within that tier
  for (const tier of TIER_PRIORITY) {
    const inTier = results.filter(r => r.tag === tier).sort((a, b) => b.oppScore - a.oppScore);
    if (inTier.length > 0) return inTier[0];
  }

  // Should never reach here
  return results[0];
}

// ---------------------------------------------------------------------------
// Draft template builder
// ---------------------------------------------------------------------------

function buildDraft(entry, snapshotFile) {
  const dateStr  = new Date().toISOString().split('T')[0];
  const slug     = slugify(entry.query);
  const angle    = ANGLE_BY_TAG[entry.tag] ?? 'Analysera sökordsdata och välj vinkel baserat på innehållsbehovet.';

  const ctrPct    = (entry.actualCtr * 100).toFixed(1) + '%';
  const expCtrPct = (entry.expCtr    * 100).toFixed(1) + '%';
  const gapSign   = entry.actualCtr >= entry.expCtr ? '+' : '';
  const gapPct    = gapSign + (((entry.actualCtr - entry.expCtr) / entry.expCtr) * 100).toFixed(0) + '%';
  const mainPage  = entry.pages[0] ?? '(okänd)';

  const content = `---
title: "${entry.query}"
description: ""
pubDate: ${dateStr}
author: "Medidraken"
tags: []
focusKeywords: ["${entry.query}"]
draft: true
---

<!--
  ╔══════════════════════════════════════════════════════════════════════════╗
  ║  GSC DATA  —  ${path.basename(snapshotFile).padEnd(58)} ║
  ╠══════════════════════════════════════════════════════════════════════════╣
  ║  Keyword:     ${entry.query.padEnd(58)} ║
  ║  Tag:         ${entry.tag.padEnd(58)} ║
  ║  Impressions: ${String(entry.impressions).padEnd(58)} ║
  ║  Clicks:      ${String(entry.clicks).padEnd(58)} ║
  ║  Avg position:${String(entry.avgPosition).padEnd(58)} ║
  ║  CTR:         ${(ctrPct + ' (expected ' + expCtrPct + ', gap ' + gapPct + ')').padEnd(58)} ║
  ║  Opp score:   ${('+' + entry.oppScore + ' estimated clicks if CTR reaches benchmark').padEnd(58)} ║
  ║  Ranking URL: ${mainPage.padEnd(58)} ║
  ╠══════════════════════════════════════════════════════════════════════════╣
  ║  SUGGESTED ANGLE                                                         ║
  ╚══════════════════════════════════════════════════════════════════════════╝

  ${angle}

  ACTION: ${entry.description}
-->

<!-- TODO: Write a compelling title tag and meta description targeting "${entry.query}" -->

Intro text highlighting the core topic of **${entry.query}** with a focus on Traditionell Kinesisk Medicin (TCM) och helhetshälsa.

## Vad säger Traditionell Kinesisk Medicin (TCM)?

Beskriv orsakerna ur ett TCM-perspektiv (t.ex. obalans i organ, blockerad Qi eller blodcirkulation).

- **Orsak 1**: Blockering i meridianer.
- **Orsak 2**: Yttre faktorer som kyla, fukt eller stress.

## Hur behandlas detta med Akupunktur, Tui Na och Qigong?

1. **Akupunktur**: Återställer balans och minskar smärta.
2. **Tui Na-massage**: Mjukar upp djup muskelspänning.
3. **Medicinsk Qigong**: Stärker kroppens egen läkningsförmåga och minskar stress.

## Vad kan du göra själv i vardagen?

- Praktiska tips och mjuka rörelser.
- Andningsövningar och kostråd enligt TCM.

---

### Boka behandling eller delta i kurs i Nyköping

- [Läs mer om våra behandlingar inom akupunktur & massage](/behandling)
- [Utforska våra kurser i medicinsk Qigong och Tai Chi](/kurser/medicinsk-qigong)
- [Kontakta Medidraken för personlig rådgivning](/kontakt)
`;

  return { slug, content };
}

// ---------------------------------------------------------------------------
// Export (keeps the original public API intact for any existing callers)
// ---------------------------------------------------------------------------

export function createArticleTemplate({ title, description, focusKeywords = [], tags = [] }) {
  const dateStr = new Date().toISOString().split('T')[0];
  const slug = slugify(title);

  const keywordsString = focusKeywords.map((k) => `"${k}"`).join(', ');
  const tagsString     = tags.map((t) => `"${t}"`).join(', ');

  const content = `---
title: "${title}"
description: "${description}"
pubDate: ${dateStr}
author: "Medidraken"
tags: [${tagsString}]
focusKeywords: [${keywordsString}]
draft: true
---

Intro text highlighting the core topic of **${title}** med fokus på Traditionell Kinesisk Medicin (TCM) och helhetshälsa.

## Vad säger Traditionell Kinesisk Medicin (TCM)?

Beskriv orsakerna ur ett TCM-perspektiv (t.ex. obalans i organ, blockerad Qi eller blodcirkulation).

- **Orsak 1**: Blockering i meridianer.
- **Orsak 2**: Yttre faktorer som kyla, fukt eller stress.

## Hur behandlas detta med Akupunktur, Tui Na och Qigong?

1. **Akupunktur**: Återställer balans och minskar smärta.
2. **Tui Na-massage**: Mjukar upp djup muskelspänning.
3. **Medicinsk Qigong**: Stärker kroppens egen läkningsförmåga och minskar stress.

## Vad kan du göra själv i vardagen?

- Praktiska tips och mjuka rörelser.
- Andningsövningar och kostråd enligt TCM.

---

### Boka behandling eller delta i kurs i Nyköping

- [Läs mer om våra behandlingar inom akupunktur & massage](/behandling)
- [Utforska våra kurser i medicinsk Qigong och Tai Chi](/kurser/medicinsk-qigong)
- [Kontakta Medidraken för personlig rådgivning](/kontakt)
`;

  const articlesDir = path.resolve(process.cwd(), 'src/content/artiklar');
  if (!fs.existsSync(articlesDir)) fs.mkdirSync(articlesDir, { recursive: true });

  const filePath = path.join(articlesDir, `${slug}.md`);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Created draft article template: ${filePath}`);
  return filePath;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (process.argv[1] && process.argv[1].endsWith('generate-article-draft.js')) {
  const args = parseArgs(process.argv.slice(2));

  // Resolve snapshot
  const snapshotPath = args.snapshot
    ? path.resolve(process.cwd(), args.snapshot)
    : findLatestSnapshot();

  if (!fs.existsSync(snapshotPath)) {
    console.error(`Snapshot not found: ${snapshotPath}`);
    process.exit(1);
  }

  console.log(`\nLoading snapshot: ${path.basename(snapshotPath)}`);

  const results = loadSnapshot(snapshotPath);
  const entry   = pickQuery(results, args.keyword);

  console.log(`\nSelected query:  "${entry.query}"`);
  console.log(`Tag:             ${entry.tag}`);
  console.log(`Impressions:     ${entry.impressions}`);
  console.log(`Clicks:          ${entry.clicks}`);
  console.log(`Avg position:    ${entry.avgPosition}`);
  console.log(`CTR:             ${(entry.actualCtr * 100).toFixed(1)}% (expected ${(entry.expCtr * 100).toFixed(1)}%)`);
  console.log(`Opp score:       +${entry.oppScore} estimated clicks`);
  if (entry.pages.length > 0) {
    console.log(`Ranking URL:     ${entry.pages[0]}`);
  }

  const { slug, content } = buildDraft(entry, snapshotPath);

  const articlesDir = path.resolve(process.cwd(), 'src/content/artiklar');
  if (!fs.existsSync(articlesDir)) fs.mkdirSync(articlesDir, { recursive: true });

  const outPath = path.join(articlesDir, `${slug}.md`);
  fs.writeFileSync(outPath, content, 'utf8');

  console.log(`\nDraft created: ${outPath}`);
  console.log('\nNext step: open the file, review the GSC data block at the top, and write the content.\n');
}
