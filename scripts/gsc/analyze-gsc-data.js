import fs from 'node:fs';
import path from 'node:path';
import {
  EXPECTED_CTR, TAIL_CTR, NOISE_THRESHOLD, CTR_TOLERANCE,
  expectedCtr, ctrGap, opportunityScore, classifyQuery,
} from './lib/classify.js';

// ---------------------------------------------------------------------------

function normalizeUrl(url) {
  return url
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/$/, '');
}

// ---------------------------------------------------------------------------

const dataDir = path.resolve(process.cwd(), 'plans/gsc-data');
const files = fs.readdirSync(dataDir).filter(f => f.startsWith('gsc-keywords-') && f.endsWith('.json')).sort();

if (files.length === 0) {
  console.error('No GSC JSON files found in plans/gsc-data/');
  process.exit(1);
}

const targetFile = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(dataDir, files[files.length - 1]);

console.log(`\nAnalyzing: ${path.basename(targetFile)}\n`);

const rows = JSON.parse(fs.readFileSync(targetFile, 'utf8'));

// Roll up by query
const byQuery = {};

for (const row of rows) {
  const [query, url] = row.keys;
  if (!byQuery[query]) {
    byQuery[query] = { clicks: 0, impressions: 0, positions: [], pages: [] };
  }
  byQuery[query].clicks      += row.clicks;
  byQuery[query].impressions += row.impressions;
  byQuery[query].positions.push({ pos: row.position, imp: row.impressions });
  byQuery[query].pages.push(normalizeUrl(url));
}

// Compute weighted avg position, CTR, and classification for each query
const results = Object.entries(byQuery).map(([query, d]) => {
  const totalImpForPos = d.positions.reduce((s, p) => s + p.imp, 0);
  const weightedPos = totalImpForPos > 0
    ? d.positions.reduce((s, p) => s + p.pos * p.imp, 0) / totalImpForPos
    : d.positions.reduce((s, p) => s + p.pos, 0) / d.positions.length;

  const uniquePages = [...new Set(d.pages)];
  const avgPos      = Math.round(weightedPos * 10) / 10;
  const actualCtr   = d.impressions > 0 ? d.clicks / d.impressions : 0;
  const expCtr      = expectedCtr(avgPos);
  const gap         = ctrGap(actualCtr, avgPos);
  const oppScore    = opportunityScore(d.impressions, actualCtr, avgPos);
  const { tag, description } = classifyQuery(avgPos, actualCtr, d.impressions);

  return {
    query,
    clicks:       d.clicks,
    impressions:  d.impressions,
    avgPosition:  avgPos,
    actualCtr,
    expCtr,
    ctrGap:       gap,
    oppScore,
    tag,
    description,
    pageCount:    uniquePages.length,
    pages:        uniquePages,
  };
});

// Sort by opportunity score desc, then impressions desc as tiebreaker
results.sort((a, b) => b.oppScore - a.oppScore || b.impressions - a.impressions);

// ---------------------------------------------------------------------------
// Print ranked table
// ---------------------------------------------------------------------------
const W = { rank: 4, query: 36, tag: 16, opp: 5, imp: 6, clicks: 7, pos: 7, ctr: 8, gap: 7 };

const header =
  'Rank'.padEnd(W.rank)   + ' ' +
  'Query'.padEnd(W.query) + ' ' +
  'Tag'.padEnd(W.tag)     + ' ' +
  'Opp'.padStart(W.opp)   + ' ' +
  'Imp'.padStart(W.imp)   + ' ' +
  'Clicks'.padStart(W.clicks) + ' ' +
  'AvgPos'.padStart(W.pos)    + ' ' +
  'CTR%'.padStart(W.ctr)      + ' ' +
  'Gap%'.padStart(W.gap);

const separator = '─'.repeat(header.length);

console.log(header);
console.log(separator);

results.forEach((r, i) => {
  const ctrPct    = (r.actualCtr * 100).toFixed(1) + '%';
  const expPct    = (r.expCtr    * 100).toFixed(1) + '%';
  const gapSign   = r.ctrGap >= 0 ? '+' : '';
  const gapPct    = gapSign + (r.ctrGap * 100).toFixed(0) + '%';
  const canniFlag = r.pageCount > 1 ? ' ⚠' : '  ';

  // Strip emoji for column width calculation, pad based on plain text length,
  // then re-attach emoji so terminal renders it correctly.
  const tagPlain  = r.tag.replace(/\S\s/u, '  '); // rough: treat emoji as 2 chars
  const tagStr    = r.tag.padEnd(W.tag);

  const line =
    `${i + 1}.`.padEnd(W.rank)                      + ' ' +
    r.query.slice(0, W.query).padEnd(W.query)        + ' ' +
    tagStr                                            + ' ' +
    String(r.oppScore).padStart(W.opp)               + ' ' +
    String(r.impressions).padStart(W.imp)             + ' ' +
    String(r.clicks).padStart(W.clicks)               + ' ' +
    String(r.avgPosition).padStart(W.pos)             + ' ' +
    `${ctrPct}(${expPct})`.padStart(W.ctr + 6)       + ' ' +
    gapPct.padStart(W.gap)                            + canniFlag;

  console.log(line);

  if (r.pageCount > 1) {
    r.pages.forEach(p => console.log(`       → ${p}`));
  }
});

// ---------------------------------------------------------------------------
// Tier summary
// ---------------------------------------------------------------------------
const tagGroups = {};
for (const r of results) {
  if (!tagGroups[r.tag]) tagGroups[r.tag] = { count: 0, totalOpp: 0, totalImp: 0 };
  tagGroups[r.tag].count++;
  tagGroups[r.tag].totalOpp += r.oppScore;
  tagGroups[r.tag].totalImp += r.impressions;
}

const totalImp    = results.reduce((s, r) => s + r.impressions, 0);
const totalClicks = results.reduce((s, r) => s + r.clicks, 0);
const totalOpp    = results.reduce((s, r) => s + r.oppScore, 0);
const cannibalized = results.filter(r => r.pageCount > 1);

console.log('\n' + separator);
console.log('Tag breakdown:\n');

// Order tags by total opportunity desc
const tagOrder = Object.entries(tagGroups).sort((a, b) => b[1].totalOpp - a[1].totalOpp);

for (const [tag, g] of tagOrder) {
  const oppBar = '█'.repeat(Math.min(Math.round(g.totalOpp / Math.max(totalOpp, 1) * 20), 20));
  console.log(
    `  ${tag.padEnd(22)} ${String(g.count).padStart(3)} queries  ` +
    `opp +${String(g.totalOpp).padStart(4)} clicks  ${oppBar}`
  );
}

console.log('\n' + separator);
console.log(`Queries: ${results.length} | Impressions: ${totalImp} | Clicks: ${totalClicks} | Overall CTR: ${totalImp > 0 ? ((totalClicks / totalImp) * 100).toFixed(2) : 0}%`);
console.log(`Total opportunity: +${totalOpp} estimated clicks if CTR matches benchmark`);
console.log(`URL cannibalization (⚠): ${cannibalized.length} queries`);
