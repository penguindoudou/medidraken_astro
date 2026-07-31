import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Expected CTR by position (industry benchmark averages for organic results).
// Source: aggregated studies (Sistrix, Backlinko, AWR). Used as baseline until
// we accumulate enough site-specific data to replace this table.
// Positions beyond 20 get a flat tail — they rarely drive meaningful CTR.
// ---------------------------------------------------------------------------
const EXPECTED_CTR = {
  1:  0.284,
  2:  0.152,
  3:  0.103,
  4:  0.073,
  5:  0.056,
  6:  0.044,
  7:  0.035,
  8:  0.029,
  9:  0.024,
  10: 0.020,
  11: 0.016,
  12: 0.014,
  13: 0.012,
  14: 0.011,
  15: 0.010,
  16: 0.009,
  17: 0.008,
  18: 0.007,
  19: 0.007,
  20: 0.006,
};

const TAIL_CTR = 0.004; // positions 21+

// Minimum impressions to be worth classifying (below this = noise)
const NOISE_THRESHOLD = 5;

// CTR tolerance band: if actual CTR is within this fraction of expected,
// we consider it "on track" rather than flagging it.
// e.g. 0.20 means ±20% of expected CTR is considered normal.
const CTR_TOLERANCE = 0.20;

// ---------------------------------------------------------------------------

function normalizeUrl(url) {
  return url
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/$/, '');
}

function expectedCtr(position) {
  const rounded = Math.round(position);
  return EXPECTED_CTR[rounded] ?? TAIL_CTR;
}

// CTR gap: how far actual CTR deviates from expected, as a fraction.
// Positive = over-performing, negative = under-performing.
function ctrGap(actualCtr, position) {
  const expected = expectedCtr(position);
  if (expected === 0) return 0;
  return (actualCtr - expected) / expected;
}

// Opportunity score: estimated additional clicks if CTR improved to expected.
// For under-performers: impressions × (expectedCtr - actualCtr).
// For winners: 0 — they're already doing well.
function opportunityScore(impressions, actualCtr, position) {
  const expected = expectedCtr(position);
  const gap = expected - actualCtr;
  return gap > 0 ? Math.round(impressions * gap) : 0;
}

// ---------------------------------------------------------------------------
// Action tag classification.
// Two inputs drive every tag: position band + CTR behaviour vs expected.
// ---------------------------------------------------------------------------
function classifyQuery(avgPosition, actualCtr, impressions) {
  if (impressions < NOISE_THRESHOLD) {
    return { tag: '⚫ Noise', description: 'Too few impressions to act on' };
  }

  const expected = expectedCtr(avgPosition);
  const gap = ctrGap(actualCtr, avgPosition);
  const underperforming = gap < -CTR_TOLERANCE;
  const overperforming  = gap >  CTR_TOLERANCE;
  const onTrack         = !underperforming && !overperforming;

  // Zero (or near-zero) clicks with real impressions — snippet is broken
  // regardless of position.
  if (actualCtr < 0.005 && impressions >= 20) {
    return { tag: '🔴 Snippet', description: 'Impressions with near-zero CTR — title/description broken' };
  }

  if (avgPosition <= 3) {
    if (underperforming) {
      // Ranking well but clicks are stolen or snippet is off
      return { tag: '🟡 Push CTR', description: 'Top position but CTR below expected — rich result or snippet mismatch' };
    }
    // On track or over-performing at top → protect
    return { tag: '🔵 Protect', description: 'Strong position and healthy CTR — monitor for drops' };
  }

  if (avgPosition <= 20) {
    if (underperforming) {
      // Middle of first page but clicks are low → title/meta fix
      return { tag: '🟢 Quick win', description: 'Good position, low CTR — improve title/meta description' };
    }
    if (overperforming) {
      // Punching above weight — worth pushing to top 3
      return { tag: '🌟 Gem', description: 'CTR above expected for this position — push ranking higher' };
    }
    // Normal CTR for position — needs ranking improvement
    return { tag: '🟠 Push rank', description: 'Normal CTR but ranking can improve — strengthen content' };
  }

  // Position 21+
  if (overperforming) {
    // Strong clicks despite deep position → high-potential, needs content work
    return { tag: '🌟 Gem', description: 'Surprising CTR for deep position — big upside with content investment' };
  }
  return { tag: '🟡 Content', description: 'Deep position — needs content depth and authority to climb' };
}

// ---------------------------------------------------------------------------

const dataDir = path.resolve(process.cwd(), 'plans/gsc-data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json')).sort();

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
