/**
 * action-plan.js
 *
 * Decision layer: takes a query (or auto-selects the top opportunity from the
 * latest snapshot) and outputs a concrete, specific action — not just a tier tag.
 *
 * Routes to the right type of fix before any content work begins:
 *   - Rewrite title/meta on an existing page
 *   - Deepen existing page content
 *   - Expand existing page or write a supporting article
 *   - Create a new page/article (delegates to gsc:draft)
 *   - Consolidate cannibalized pages
 *   - Flag missing schema for audit
 *
 * Usage:
 *   # Auto-select the top opportunity from the latest snapshot
 *   node scripts/gsc/action-plan.js
 *
 *   # Target a specific keyword
 *   node scripts/gsc/action-plan.js --keyword "massage nyköping"
 *
 *   # Use a specific snapshot file
 *   node scripts/gsc/action-plan.js --snapshot plans/gsc-data/gsc-keywords-2026-07-31.json
 *
 *   # Show top N opportunities instead of just one
 *   node scripts/gsc/action-plan.js --top 5
 *
 * npm script:
 *   npm run gsc:action-plan
 *   npm run gsc:action-plan -- --keyword "massage nyköping"
 *   npm run gsc:action-plan -- --top 5
 *
 * ⚠️  STALE DATA CAVEAT
 * This script acts on GSC data to make content decisions. GSC lags up to 2
 * weeks behind live content changes. Before acting on any recommendation,
 * manually check plans/gsc-tracked.json — if the target page was recently
 * updated, the signal may already be outdated.
 */

import fs             from 'node:fs';
import path           from 'node:path';
import { execSync }   from 'node:child_process';
import {
  TIER_PRIORITY,
  expectedCtr,
  opportunityScore,
  classifyQuery,
  routeAction,
} from './lib/classify.js';

// ---------------------------------------------------------------------------
// URL → source file mapper
//
// Takes a normalized ranking URL (no protocol/domain) and maps it to the
// corresponding .astro file under src/pages/.
// ---------------------------------------------------------------------------

function mapUrlToSourceFile(rankingUrl) {
  if (!rankingUrl) return null;

  // Strip protocol and domain if present.
  // Handles: https://domain.com/path, //domain.com/path, domain.com/path
  let urlPath = rankingUrl
    .replace(/^https?:\/\/[^/]+/, '')   // remove https://domain.com
    .replace(/^\/\/[^/]+/, '')          // remove //domain.com
    .replace(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/|$)/, '/') // bare domain.com/path → /path
    .replace(/\/$/, '');               // strip trailing slash

  if (!urlPath || urlPath === '') urlPath = '/';

  const pagesRoot = path.resolve(process.cwd(), 'src/pages');

  // / → index.astro
  if (urlPath === '/') {
    return 'src/pages/index.astro';
  }

  // Try direct candidates in order:
  //   /foo/bar → src/pages/foo/bar.astro
  //   /foo/bar → src/pages/foo/bar/index.astro
  const stripped = urlPath.replace(/^\//, '');
  const candidates = [
    path.join(pagesRoot, stripped + '.astro'),
    path.join(pagesRoot, stripped + '.mdx'),
    path.join(pagesRoot, stripped, 'index.astro'),
    path.join(pagesRoot, stripped, 'index.mdx'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return path.relative(process.cwd(), candidate);
    }
  }

  // Fallback: content collection article slug
  // /artiklar/foo → src/content/artiklar/foo.md
  if (stripped.startsWith('artiklar/')) {
    const slug = stripped.replace('artiklar/', '');
    const mdPath = path.resolve(process.cwd(), 'src/content/artiklar', slug + '.md');
    if (fs.existsSync(mdPath)) {
      return path.relative(process.cwd(), mdPath);
    }
    const mdxPath = path.resolve(process.cwd(), 'src/content/artiklar', slug + '.mdx');
    if (fs.existsSync(mdxPath)) {
      return path.relative(process.cwd(), mdxPath);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Data loading (mirrors generate-article-draft.js)
// ---------------------------------------------------------------------------

function normalizeUrl(url) {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

function loadSnapshot(snapshotPath) {
  const raw     = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
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

function findLatestSchemaAudit() {
  const dataDir = path.resolve(process.cwd(), 'plans/gsc-data');
  if (!fs.existsSync(dataDir)) return null;
  const files = fs.readdirSync(dataDir)
    .filter(f => f.startsWith('schema-audit-') && f.endsWith('.json'))
    .sort();
  if (files.length === 0) return null;
  return path.join(dataDir, files[files.length - 1]);
}

/** Load the latest schema audit JSON, or null if none found / unreadable. */
function loadSchemaAudit() {
  const auditPath = findLatestSchemaAudit();
  if (!auditPath) return null;
  try {
    return { data: JSON.parse(fs.readFileSync(auditPath, 'utf8')), filePath: auditPath };
  } catch (_) {
    return null;
  }
}

/**
 * Return gap entries (missing or malformed schema types) for a given ranking URL.
 * @returns {Array<{ type: string, status: string, reason: string|null }>}
 */
function schemaGapsForUrl(auditData, rankingUrl) {
  if (!auditData) return [];
  const targetPath = normalisePath(rankingUrl);
  const entry = auditData.pages.find(p => normalisePath(p.url) === targetPath);
  if (!entry) return [];
  return Object.entries(entry.schema)
    .filter(([, v]) => v.status === 'missing' || v.status === 'malformed')
    .map(([type, v]) => ({ type, status: v.status, reason: v.reason || null }));
}

/**
 * Return the page_type string from the audit for a given ranking URL, or null.
 */
function pageTypeForUrl(auditData, rankingUrl) {
  if (!auditData) return null;
  const targetPath = normalisePath(rankingUrl);
  const entry = auditData.pages.find(p => normalisePath(p.url) === targetPath);
  return entry ? entry.page_type : null;
}

/** Derive a human-friendly "N days ago" string from a YYYY-MM-DD date. */
function daysAgoLabel(dateStr) {
  // dateStr is like "schema-audit-2026-08-03.json" or a bare "2026-08-03"
  const match = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
  if (!match) return '';
  const auditDate = new Date(match[1]);
  const today     = new Date();
  today.setHours(0, 0, 0, 0);
  auditDate.setHours(0, 0, 0, 0);
  const days = Math.round((today - auditDate) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

/**
 * Get the Unix timestamp (seconds) of the last pushed commit on origin/main.
 * Returns null if git is unavailable or the command fails.
 */
function lastPushedCommitTs() {
  try {
    const out = execSync('git log origin/main -1 --format=%ct', { stdio: ['pipe', 'pipe', 'pipe'] })
      .toString().trim();
    const ts = parseInt(out, 10);
    return isNaN(ts) ? null : ts;
  } catch (_) {
    return null;
  }
}

/**
 * Check whether there are local commits not yet pushed to origin/main.
 * Returns true if unpushed commits exist, false otherwise (or if git unavailable).
 */
function hasUnpushedCommits() {
  try {
    const out = execSync('git log origin/main..HEAD --oneline', { stdio: ['pipe', 'pipe', 'pipe'] })
      .toString().trim();
    return out.length > 0;
  } catch (_) {
    return false;
  }
}

/**
 * Render the schema block for a 🟡 Push CTR entry.
 * Returns a string (possibly empty string if no audit data and page has no gaps).
 */
function schemaBlock(auditEntry, rankingUrl) {
  const { data: auditData, filePath } = auditEntry;
  const fileName  = path.basename(filePath);
  const ageLabel  = daysAgoLabel(fileName);
  const gaps      = schemaGapsForUrl(auditData, rankingUrl);
  const pageType  = pageTypeForUrl(auditData, rankingUrl);
  const hasWarnings = Array.isArray(auditData.warnings) && auditData.warnings.length > 0;

  // Build the audit freshness line + git warning
  let freshnessLine = `  Schema audit: ${fileName}  (${ageLabel})`;
  let gitWarnLines  = '';

  const pushedTs = lastPushedCommitTs();
  if (pushedTs !== null) {
    // Derive audit date midnight UTC from filename
    const match = fileName.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) {
      const auditMidnightTs = Math.floor(new Date(match[1] + 'T00:00:00Z').getTime() / 1000);
      if (pushedTs > auditMidnightTs) {
        // Commits pushed after audit
        const unpushed = hasUnpushedCommits();
        if (!unpushed) {
          gitWarnLines = [
            `  ⚠  New commits have been pushed since this audit was generated.`,
            `     If you changed any schema or page structure, re-audit to reflect those changes:`,
            `       1. npm run build`,
            `       2. npm run gsc:schema`,
          ].join('\n');
        }
      } else {
        // Audit is up to date — check for local-only commits
        const unpushed = hasUnpushedCommits();
        if (unpushed) {
          freshnessLine += `  ✓ no pushed commits since audit`;
        } else {
          freshnessLine += `  ✓ no commits since audit`;
        }
      }
    }
  }

  const divider = `  ── Schema gaps on this page ${'─'.repeat(42)}`;
  const divEnd  = `  ${'─'.repeat(70)}`;

  const lines = [];
  lines.push(`\n${divider}`);

  const foundInAudit = pageType !== null;

  if (!foundInAudit) {
    lines.push(`  ℹ  Page not found in audit — run npm run gsc:schema to include it`);
  } else if (gaps.length === 0) {
    lines.push(`  ✅ Schema coverage: all expected types present`);
  } else {
    lines.push(`  The following schema types are missing and would produce SERP rich results:\n`);
    for (const gap of gaps) {
      const icon = gap.status === 'malformed' ? '⚠' : '❌';
      const hint = schemaTypeHint(gap.type, pageType);
      const statusLabel = gap.status === 'malformed' ? `malformed` : null;
      const reasonStr   = gap.reason ? ` (${gap.reason})` : '';
      const label = statusLabel ? `${icon} ${gap.type} [${statusLabel}${reasonStr}]` : `${icon} ${gap.type}`;
      // Pad type label to 18 chars for alignment
      const paddedLabel = label.padEnd(24);
      lines.push(`    ${paddedLabel}→ ${hint}`);
      lines.push('');
    }
  }

  lines.push(freshnessLine);
  if (gitWarnLines) lines.push(gitWarnLines);
  if (hasWarnings) {
    lines.push(`  ⚠  Audit has script drift warnings — run npm run gsc:schema to review`);
  }
  lines.push(divEnd);

  return lines.join('\n');
}

/**
 * Return a contextual hint string for a given schema type and page type.
 */
function schemaTypeHint(schemaType, pageType) {
  if (schemaType === 'FAQPage') {
    if (pageType === 'symptom_category' || pageType === 'symptom_detail' ||
        pageType === 'symptom_standalone' || pageType === 'health_goal') {
      return 'Use the SymptomFAQ component — it auto-generates FAQPage JSON-LD from its faqs prop.';
    }
    if (pageType === 'treatment_detail' || pageType === 'treatment_index') {
      return 'Add a FAQPage JSON-LD block manually — see akupunktur.astro for the FAQ accordion content to extract.';
    }
    return 'Add a FAQPage JSON-LD block.';
  }
  if (schemaType === 'BreadcrumbList') {
    return 'Add BreadcrumbList JSON-LD. Use the URL path to build the item list.';
  }
  if (schemaType === 'Service') {
    return 'Add a Service JSON-LD block with name, description, and provider fields.';
  }
  if (schemaType === 'Course') {
    return 'Add a Course JSON-LD block with name, description, and provider fields.';
  }
  return `Add a ${schemaType} JSON-LD block.`;
}

function parseArgs(argv) {
  const args = { top: 1 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--keyword'  && argv[i + 1]) { args.keyword  = argv[++i]; continue; }
    if (argv[i] === '--snapshot' && argv[i + 1]) { args.snapshot = argv[++i]; continue; }
    if (argv[i] === '--top'      && argv[i + 1]) { args.top = parseInt(argv[++i], 10) || 1; continue; }
  }
  return args;
}

function pickQuery(results, keyword) {
  if (keyword) {
    const kw = keyword.toLowerCase();
    const match = results.find(r => r.query.toLowerCase() === kw);
    if (!match) {
      const partial = results.filter(r => r.query.toLowerCase().includes(kw));
      if (partial.length === 0) {
        console.error(`Keyword "${keyword}" not found in snapshot.`);
        console.error('Available queries (sample):');
        results.slice(0, 10).forEach(r => console.error(`  ${r.query}`));
        process.exit(1);
      }
      return partial.sort((a, b) => b.oppScore - a.oppScore);
    }
    return [match];
  }

  // Auto-select: cannibalized queries first (they are high-priority regardless of tier),
  // then fall through the normal TIER_PRIORITY order for the remaining entries.
  const cannibalized    = results.filter(r => r.pages.length > 1).sort((a, b) => b.oppScore - a.oppScore);
  const nonCannibalized = results.filter(r => r.pages.length <= 1);

  const tierCandidates = [];
  for (const tier of TIER_PRIORITY) {
    const inTier = nonCannibalized.filter(r => r.tag === tier).sort((a, b) => b.oppScore - a.oppScore);
    tierCandidates.push(...inTier);
  }

  const ordered = [...cannibalized, ...tierCandidates];
  if (ordered.length > 0) return ordered;

  return [results[0]];
}

// ---------------------------------------------------------------------------
// Stale-data check
// ---------------------------------------------------------------------------

const WORK_LOG_FILE     = path.resolve(process.cwd(), 'plans/work-log.md');
const WORK_LOG_START    = '<!-- WORK-LOG-START -->';
const WORK_LOG_END      = '<!-- WORK-LOG-END -->';

const WORK_LOG_SOFT_DAYS  = 3;    // days before soft reminder kicks in
const WORK_LOG_STALE_DAYS = 14;   // days before hard warning

const TRACKED_FILE      = path.resolve(process.cwd(), 'plans/gsc-tracked.json');
const STALE_DAYS        = 14;   // GSC lag ceiling
const STALE_DAYS_STRONG = 7;    // "definitely stale" threshold

/**
 * Check how recently the work-log was updated and print a reminder if it
 * appears stale. Reads the most recent ## YYYY-MM-DD heading inside the
 * WORK-LOG-START / WORK-LOG-END block.
 *
 * - ≤ WORK_LOG_SOFT_DAYS  → silent
 * - 4–(WORK_LOG_STALE_DAYS-1) days → soft reminder
 * - ≥ WORK_LOG_STALE_DAYS or missing/empty → hard warning
 */
function workLogFreshnessCheck() {
  try {
    if (!fs.existsSync(WORK_LOG_FILE)) {
      console.log(`\n⚠️  Work-log is missing — stale-data checks may be unreliable. Run: npm run gsc:log`);
      return;
    }

    const content  = fs.readFileSync(WORK_LOG_FILE, 'utf8');
    const startIdx = content.indexOf(WORK_LOG_START);
    const endIdx   = content.indexOf(WORK_LOG_END);

    if (startIdx === -1 || endIdx === -1) {
      console.log(`\n⚠️  Work-log is missing — stale-data checks may be unreliable. Run: npm run gsc:log`);
      return;
    }

    const block = content.slice(startIdx + WORK_LOG_START.length, endIdx);

    // Find the most recent ## YYYY-MM-DD heading
    const dateRe    = /^##\s+(\d{4}-\d{2}-\d{2})/gm;
    let latestDate  = null;
    let m;
    while ((m = dateRe.exec(block)) !== null) {
      if (!latestDate || m[1] > latestDate) latestDate = m[1];
    }

    if (!latestDate) {
      console.log(`\n⚠️  Work-log is empty — stale-data checks may be unreliable. Run: npm run gsc:log`);
      return;
    }

    const today   = new Date();
    today.setHours(0, 0, 0, 0);
    const logDate = new Date(latestDate + 'T00:00:00Z');
    logDate.setHours(0, 0, 0, 0);
    const daysAgo = Math.round((today - logDate) / (1000 * 60 * 60 * 24));

    if (daysAgo <= WORK_LOG_SOFT_DAYS) return;  // fresh — silent

    if (daysAgo >= WORK_LOG_STALE_DAYS) {
      console.log(`\n⚠️  Work-log is ${daysAgo} days old — stale-data checks may be unreliable. Run: npm run gsc:log`);
    } else {
      console.log(`\nℹ  Work-log last updated ${daysAgo} days ago — run npm run gsc:log if you've pushed content changes since then`);
    }
  } catch (_) {
    // Don't crash the rest of the output on a freshness-check failure
  }
}

/**
 * Load all work-log entries from plans/work-log.md.
 * Returns an array of { file, measureAfter } objects, or [] if the file is
 * missing or unparseable.
 *
 * Entry format (inside WORK-LOG-START / WORK-LOG-END anchors):
 *   - `src/pages/foo.astro` — some commit message | measure after: YYYY-MM-DD
 */
function loadWorkLog() {
  try {
    if (!fs.existsSync(WORK_LOG_FILE)) return [];
    const content = fs.readFileSync(WORK_LOG_FILE, 'utf8');

    const startIdx = content.indexOf(WORK_LOG_START);
    const endIdx   = content.indexOf(WORK_LOG_END);
    if (startIdx === -1 || endIdx === -1) return [];

    const block   = content.slice(startIdx + WORK_LOG_START.length, endIdx);
    const entries = [];

    // Match lines like: - `src/pages/foo.astro` — … | measure after: YYYY-MM-DD
    const lineRe = /^-\s+`([^`]+)`[^|]+\|\s*measure after:\s*(\d{4}-\d{2}-\d{2})/gm;
    let m;
    while ((m = lineRe.exec(block)) !== null) {
      entries.push({ file: m[1], measureAfter: m[2] });
    }

    return entries;
  } catch (_) {
    return [];
  }
}

/**
 * Check the work-log for a measure-after warning on the given source file.
 *
 * @param {string|null} sourceFile  e.g. "src/pages/foo.astro"
 * @returns {string|null}  A warning line if the measure-after date is in the
 *   future, otherwise null (no warning).
 */
function workLogCheck(sourceFile) {
  if (!sourceFile) return null;

  const entries = loadWorkLog();
  if (entries.length === 0) return null;

  // The work-log may have multiple entries for the same file (multiple commits).
  // Use the most recent measure-after date — i.e. the latest date string
  // (ISO dates sort lexicographically).
  const matches = entries.filter(e => e.file === sourceFile);
  if (matches.length === 0) return null;

  const latest = matches.reduce((a, b) =>
    a.measureAfter > b.measureAfter ? a : b
  );

  const today       = new Date();
  today.setHours(0, 0, 0, 0);
  const measureDate = new Date(latest.measureAfter + 'T00:00:00Z');

  if (measureDate <= today) return null;   // date has passed — signal is fresh

  const daysLeft = Math.ceil((measureDate - today) / (1000 * 60 * 60 * 24));
  const dayWord  = daysLeft === 1 ? 'day' : 'days';

  return (
    `  ⚠️  Work-log: this file was recently committed — GSC data is stale\n` +
    `     File:          ${sourceFile}\n` +
    `     Measure after: ${latest.measureAfter}  (${daysLeft} ${dayWord} remaining)\n` +
    `     Wait until that date before treating this query's signal as actionable.`
  );
}

/** Load the tracked entries array, or [] on any failure. */
function loadTrackedEntries() {
  try {
    if (!fs.existsSync(TRACKED_FILE)) return [];
    const data = JSON.parse(fs.readFileSync(TRACKED_FILE, 'utf8'));
    return Array.isArray(data.tracked) ? data.tracked : [];
  } catch (_) {
    return [];
  }
}

/** Normalise a URL or URL path to a bare path with no trailing slash.
 *  Handles: https://domain.com/path, //domain.com/path, /path, bare domain.com/path */
function normalisePath(url) {
  if (!url) return '';
  let s = url
    .replace(/^https?:\/\/[^/]+/, '')   // https://domain.com/path → /path
    .replace(/^\/\/[^/]+/, '')          // //domain.com/path → /path
    .replace(/\/$/, '');               // strip trailing slash

  // Bare domain (no leading slash after above): domain.com/path → /path, domain.com → /
  if (!s.startsWith('/')) {
    s = s.replace(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, '');
    if (!s) s = '/';
  }
  return s || '/';
}

/** Return a stale-data status line for a given ranking URL. */
function staleDataLine(rankingUrl) {
  const tracked = loadTrackedEntries();

  // Empty file or file doesn't exist → fall back to static message
  if (tracked.length === 0) {
    return [
      `  ⚠️  STALE DATA CHECK`,
      `  Before acting, check plans/gsc-tracked.json to confirm this page has`,
      `  not been recently updated. GSC data lags up to 2 weeks behind live changes.`,
    ].join('\n');
  }

  const targetPath = normalisePath(rankingUrl);

  const match = tracked.find(t => normalisePath(t.page) === targetPath);

  if (!match) {
    return `  ✅ Not recently tracked — signal is fresh`;
  }

  // Calculate how many days ago the entry was tracked
  const trackedDate = new Date(match.date);
  const today       = new Date();
  today.setHours(0, 0, 0, 0);
  trackedDate.setHours(0, 0, 0, 0);
  const daysAgo = Math.round((today - trackedDate) / (1000 * 60 * 60 * 24));

  if (daysAgo >= STALE_DAYS) {
    return `  ✅ Not recently tracked — signal is fresh (last tracked ${daysAgo} days ago)`;
  }

  const noteStr = match.action ? `\n     Note: ${match.action}` : '';

  if (daysAgo < STALE_DAYS_STRONG) {
    return (
      `  ⚠️  Tracked today or this week — signal is definitely stale\n` +
      `     Last tracked ${daysAgo === 0 ? 'today' : `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`} (${match.date}) — GSC has not had time to reflect this change yet.` +
      noteStr
    );
  }

  return (
    `  ⚠️  Last tracked ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago — GSC may not reflect this change yet\n` +
    `     Updated on ${match.date} — allow up to ${STALE_DAYS} days for GSC data to catch up.` +
    noteStr
  );
}

// ---------------------------------------------------------------------------
// Output renderer
// ---------------------------------------------------------------------------

const HR = '─'.repeat(72);

function renderActionPlan(entry, index, total, auditEntry) {
  const action     = routeAction(entry);
  const sourceFile = mapUrlToSourceFile(entry.pages[0]);
  const ctrPct     = (entry.actualCtr * 100).toFixed(1) + '%';
  const expCtrPct  = (entry.expCtr    * 100).toFixed(1) + '%';
  const gapSign    = entry.actualCtr >= entry.expCtr ? '+' : '';
  const gapPct     = gapSign + (((entry.actualCtr - entry.expCtr) / (entry.expCtr || 1)) * 100).toFixed(0) + '%';

  // Schema gaps for this URL (used in header and block)
  const isPushCtr = entry.tag === '🟡 Push CTR';
  const rankingUrl = entry.pages[0] || '';
  const gaps = (isPushCtr && auditEntry)
    ? schemaGapsForUrl(auditEntry.data, rankingUrl)
    : [];

  const lines = [];

  if (total > 1) {
    lines.push(`\n${HR}`);
    // Header line with optional schema gap count
    let headerLine = `  Opportunity ${index + 1} of ${total}  [${entry.tag}]`;
    if (isPushCtr && auditEntry && gaps.length > 0) {
      headerLine += `  schema: ${gaps.length} gap${gaps.length !== 1 ? 's' : ''}`;
    }
    lines.push(headerLine);
  }

  lines.push(`\n${'═'.repeat(72)}`);
  lines.push(`  ACTION PLAN — "${entry.query}"`);
  lines.push(`${'═'.repeat(72)}\n`);

  // GSC signal summary
  lines.push(`  Tag:        ${entry.tag}`);
  lines.push(`  Position:   ${entry.avgPosition}`);
  lines.push(`  CTR:        ${ctrPct}  (expected ${expCtrPct}, gap ${gapPct})`);
  lines.push(`  Impressions:${String(entry.impressions).padStart(6)}   Clicks: ${entry.clicks}`);
  lines.push(`  Opp score:  +${entry.oppScore} estimated clicks if CTR reaches benchmark`);

  if (entry.pages.length > 0) {
    lines.push(`\n  Ranking URL${entry.pages.length > 1 ? 's' : ''}:`);
    entry.pages.forEach(p => lines.push(`    → ${p}`));
  }

  if (sourceFile) {
    lines.push(`\n  Source file: ${sourceFile}`);
  } else if (entry.pages.length > 0) {
    lines.push(`\n  Source file: (not found — URL may map to a content collection or external page)`);
  }

  // Action
  lines.push(`\n  ┌─ ACTION ─────────────────────────────────────────────────────────┐`);
  lines.push(`  │  ${action.label.padEnd(67)}│`);
  lines.push(`  └──────────────────────────────────────────────────────────────────┘\n`);

  action.instructions.forEach((step, i) => {
    // Multi-line steps (contain \n)
    const subLines = step.split('\n');
    subLines.forEach((sub, si) => {
      const prefix = (si === 0) ? `  ${String(i + 1).padStart(2)}. ` : `      `;
      lines.push(prefix + sub);
    });
  });

  // Schema block — only for 🟡 Push CTR entries, and only when audit data is available
  if (isPushCtr && auditEntry) {
    lines.push(schemaBlock(auditEntry, rankingUrl));
  }

  // Stale data check (live lookup against gsc-tracked.json)
  lines.push(`\n${staleDataLine(entry.pages[0])}`);

  // Work-log check — catches stale pages not yet in gsc-tracked.json
  const wlWarning = workLogCheck(sourceFile);
  if (wlWarning) {
    lines.push(`\n${wlWarning}`);
  }

  lines.push(`\n${'═'.repeat(72)}`);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const args = parseArgs(process.argv.slice(2));

const snapshotPath = args.snapshot
  ? path.resolve(process.cwd(), args.snapshot)
  : findLatestSnapshot();

if (!fs.existsSync(snapshotPath)) {
  console.error(`Snapshot not found: ${snapshotPath}`);
  process.exit(1);
}

console.log(`\nLoading snapshot: ${path.basename(snapshotPath)}`);

const results    = loadSnapshot(snapshotPath);
const auditEntry = loadSchemaAudit();  // null if no audit file exists
const selected = pickQuery(results, args.keyword);
const take     = args.keyword ? selected : selected.slice(0, args.top);

workLogFreshnessCheck();

take.forEach((entry, i) => {
  console.log(renderActionPlan(entry, i, take.length, auditEntry));
});

if (!args.keyword && selected.length > args.top) {
  console.log(`\n  (${selected.length - args.top} more opportunities available — run with --top N to see more)\n`);
}
