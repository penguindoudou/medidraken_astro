import fs from 'node:fs';
import path from 'node:path';

// Normalize URL: strip http/https, trailing slash, www prefix for dedup purposes
function normalizeUrl(url) {
  return url
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/$/, '');
}

const dataDir = path.resolve(process.cwd(), 'plans/gsc-data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json')).sort();

if (files.length === 0) {
  console.error('No GSC JSON files found in plans/gsc-data/');
  process.exit(1);
}

// Use latest file by default, or pass filename as arg
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
  byQuery[query].clicks += row.clicks;
  byQuery[query].impressions += row.impressions;
  byQuery[query].positions.push({ pos: row.position, imp: row.impressions });
  byQuery[query].pages.push(normalizeUrl(url));
}

// Compute weighted avg position and deduplicate pages
const results = Object.entries(byQuery).map(([query, d]) => {
  const totalImpForPos = d.positions.reduce((s, p) => s + p.imp, 0);
  const weightedPos = totalImpForPos > 0
    ? d.positions.reduce((s, p) => s + p.pos * p.imp, 0) / totalImpForPos
    : d.positions.reduce((s, p) => s + p.pos, 0) / d.positions.length;

  const uniquePages = [...new Set(d.pages)];

  return {
    query,
    clicks: d.clicks,
    impressions: d.impressions,
    avgPosition: Math.round(weightedPos * 10) / 10,
    pageCount: uniquePages.length,
    pages: uniquePages,
  };
});

// Sort by impressions desc
results.sort((a, b) => b.impressions - a.impressions);

// --- Print ranked table ---
const W = { rank: 4, query: 38, imp: 6, clicks: 7, pos: 7, pages: 5 };
const header =
  'Rank'.padEnd(W.rank) + ' ' +
  'Query'.padEnd(W.query) + ' ' +
  'Imp'.padStart(W.imp) + ' ' +
  'Clicks'.padStart(W.clicks) + ' ' +
  'AvgPos'.padStart(W.pos) + ' ' +
  'URLs'.padStart(W.pages);

console.log(header);
console.log('─'.repeat(header.length));

results.forEach((r, i) => {
  const flag = r.pageCount > 1 ? ' ⚠' : '  ';
  const line =
    `${i + 1}.`.padEnd(W.rank) + ' ' +
    r.query.slice(0, W.query).padEnd(W.query) + ' ' +
    String(r.impressions).padStart(W.imp) + ' ' +
    String(r.clicks).padStart(W.clicks) + ' ' +
    String(r.avgPosition).padStart(W.pos) + ' ' +
    String(r.pageCount).padStart(W.pages) + flag;
  console.log(line);

  // Print pages for cannibalized queries
  if (r.pageCount > 1) {
    r.pages.forEach(p => console.log(`       → ${p}`));
  }
});

// --- Summary ---
const totalImp = results.reduce((s, r) => s + r.impressions, 0);
const totalClicks = results.reduce((s, r) => s + r.clicks, 0);
const cannibalized = results.filter(r => r.pageCount > 1);

console.log('\n' + '─'.repeat(header.length));
console.log(`Total queries: ${results.length} | Total impressions: ${totalImp} | Total clicks: ${totalClicks}`);
console.log(`Queries with URL cannibalization (⚠): ${cannibalized.length}`);
console.log(`Overall CTR: ${totalImp > 0 ? ((totalClicks / totalImp) * 100).toFixed(2) : 0}%`);
