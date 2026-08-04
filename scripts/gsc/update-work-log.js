/**
 * update-work-log.js
 *
 * Reads recent git commits, extracts changed content files (.astro, .md, .mdx),
 * and prepends new entries to plans/work-log.md between the
 * <!-- WORK-LOG-START --> / <!-- WORK-LOG-END --> anchors.
 *
 * Only processes commits not already present in the work-log (deduplication by
 * commit hash stored in a comment on each date-group header).
 *
 * Usage:
 *   npm run gsc:log                              # last 30 commits (14-day measure window)
 *   npm run gsc:log -- --since 2026-07-01        # commits since a date
 *   npm run gsc:log -- --n 50                    # last N commits
 *   npm run gsc:log -- --dry-run                 # print what would be added, no write
 *   npm run gsc:log -- --measure-days 7          # use 7-day window instead of default 14
 */

import fs            from 'node:fs';
import path          from 'node:path';
import { execSync }  from 'node:child_process';

// ─── Config ───────────────────────────────────────────────────────────────────

const WORK_LOG      = path.resolve(process.cwd(), 'plans/work-log.md');
const ANCHOR_START  = '<!-- WORK-LOG-START -->';
const ANCHOR_END    = '<!-- WORK-LOG-END -->';

/** File extensions treated as content changes worth logging. */
const CONTENT_EXTS  = new Set(['.astro', '.md', '.mdx']);

/** Paths to skip even if they match CONTENT_EXTS (plans, scripts, etc.). */
const SKIP_PREFIXES = [
  'plans/',
  'scripts/',
  'src/layouts/',
  'src/components/',
  'src/styles/',
];

// ─── CLI args ──────────────────────────────────────────────────────────────────

const rawArgs = process.argv.slice(2);

function getFlag(name) {
  const i = rawArgs.indexOf(`--${name}`);
  return i !== -1 ? (rawArgs[i + 1] ?? null) : null;
}
function hasFlag(name) { return rawArgs.includes(`--${name}`); }

const DRY_RUN = hasFlag('dry-run');
const SINCE   = getFlag('since');        // e.g. "2026-07-01"
const N       = parseInt(getFlag('n') ?? '30', 10);

/** Days to add to the push date for the "measure after" date. Override with --measure-days. */
const MEASURE_DAYS  = parseInt(getFlag('measure-days') ?? '14', 10);

if (isNaN(MEASURE_DAYS) || MEASURE_DAYS < 1 || MEASURE_DAYS > 90) {
  console.error('--measure-days must be a number between 1 and 90');
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isContentFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!CONTENT_EXTS.has(ext)) return false;
  // .md / .mdx files must live under src/ — root-level docs (README, CHANGELOG, etc.) have no GSC relevance
  if (ext === '.md' || ext === '.mdx') {
    if (!filePath.startsWith('src/')) return false;
  }
  return !SKIP_PREFIXES.some(prefix => filePath.startsWith(prefix));
}

// ─── Git helpers ──────────────────────────────────────────────────────────────

/**
 * Returns an array of commit objects:
 *   { hash, date, subject, files: string[] }
 */
function getCommits() {
  // Build the git log command
  const limit  = SINCE ? '' : `-${N}`;
  const sinceFlag = SINCE ? `--since="${SINCE}"` : '';

  // Get commit metadata: hash|date|subject
  const metaCmd = `git log ${limit} ${sinceFlag} --pretty=format:"%H|%as|%s"`.trim();
  const metaOut = execSync(metaCmd, { encoding: 'utf8' }).trim();

  if (!metaOut) return [];

  const commits = [];

  for (const line of metaOut.split('\n')) {
    const [hash, date, ...subjectParts] = line.split('|');
    const subject = subjectParts.join('|').trim();

    // Get files changed in this commit
    const filesOut = execSync(
      `git show --name-only --format="" ${hash}`,
      { encoding: 'utf8' }
    ).trim();

    const files = filesOut
      .split('\n')
      .map(f => f.trim())
      .filter(f => f && isContentFile(f));

    commits.push({ hash, date, subject, files });
  }

  return commits;
}

// ─── Work-log helpers ─────────────────────────────────────────────────────────

function readWorkLog() {
  if (!fs.existsSync(WORK_LOG)) {
    console.error(`❌ ${WORK_LOG} not found. Create it first.`);
    process.exit(1);
  }
  return fs.readFileSync(WORK_LOG, 'utf8');
}

/** Extract hashes already recorded inside the WORK-LOG block. */
function extractKnownHashes(content) {
  const start = content.indexOf(ANCHOR_START);
  const end   = content.indexOf(ANCHOR_END);
  if (start === -1 || end === -1) return new Set();

  const block = content.slice(start, end);
  // Hashes are stored as <!-- hash:abc123def456 --> comments
  const hashRe = /<!-- hash:([0-9a-f]{40}) -->/g;
  const known  = new Set();
  let m;
  while ((m = hashRe.exec(block)) !== null) {
    known.add(m[1]);
  }
  return known;
}

/**
 * Build the new markdown block to insert, grouped by date (newest first).
 * Returns null if nothing new.
 */
function buildNewBlock(commits, knownHashes) {
  // Filter to only new commits that actually touched content files
  const newCommits = commits.filter(
    c => !knownHashes.has(c.hash) && c.files.length > 0
  );

  if (newCommits.length === 0) return null;

  // Group by date
  const byDate = new Map();
  for (const c of newCommits) {
    if (!byDate.has(c.date)) byDate.set(c.date, []);
    byDate.get(c.date).push(c);
  }

  // Sort dates newest first
  const sortedDates = [...byDate.keys()].sort((a, b) => b.localeCompare(a));

  // measure-after is based on push/deploy date, not commit date
  const today = new Date().toISOString().slice(0, 10);
  const measureAfter = addDays(today, MEASURE_DAYS);

  const lines = [];
  for (const date of sortedDates) {
    lines.push(`## ${date}`);

    for (const c of byDate.get(date)) {
      lines.push(`<!-- hash:${c.hash} -->`);
      if (c.files.length === 1) {
        // Single-file commit — flat line, unchanged format
        lines.push(`- \`${c.files[0]}\` — ${c.subject} | measure after: ${measureAfter}`);
      } else {
        // Multi-file commit — subject as header, files indented below
        lines.push(`- [${c.subject}] | measure after: ${measureAfter}`);
        for (const file of c.files) {
          lines.push(`  - \`${file}\``);
        }
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function run() {
  console.log('\n📋 Updating work-log...\n');

  const commits = getCommits();
  console.log(`Found ${commits.length} commit(s) in range.`);

  const content     = readWorkLog();
  const knownHashes = extractKnownHashes(content);
  console.log(`Already logged: ${knownHashes.size} commit hash(es).\n`);

  const newBlock = buildNewBlock(commits, knownHashes);

  if (!newBlock) {
    console.log('✅ Nothing new to add — work-log is up to date.\n');
    return;
  }

  // Count new entries
  const newCommitsCount = commits.filter(
    c => !knownHashes.has(c.hash) && c.files.length > 0
  ).length;
  console.log(`New commits with content changes: ${newCommitsCount}`);

  if (DRY_RUN) {
    console.log('\n─── DRY RUN — would insert ──────────────────────────────────────────\n');
    console.log(newBlock);
    console.log('─────────────────────────────────────────────────────────────────────\n');
    console.log('(Run without --dry-run to write.)\n');
    return;
  }

  // Insert new block just after ANCHOR_START
  const startIdx = content.indexOf(ANCHOR_START);
  const endIdx   = content.indexOf(ANCHOR_END);

  if (startIdx === -1 || endIdx === -1) {
    console.error(`❌ Anchors not found in ${WORK_LOG}.`);
    console.error('   Expected: <!-- WORK-LOG-START --> and <!-- WORK-LOG-END -->');
    process.exit(1);
  }

  const before = content.slice(0, startIdx + ANCHOR_START.length);
  const after  = content.slice(endIdx);

  // Get existing content between anchors (trim leading newline)
  const existing = content.slice(startIdx + ANCHOR_START.length, endIdx).replace(/^\n/, '');

  const updated = before + '\n' + newBlock + (existing ? existing : '') + after;

  fs.writeFileSync(WORK_LOG, updated, 'utf8');

  console.log(`\n✅ Work-log updated: ${WORK_LOG}\n`);
  console.log('─── Added ───────────────────────────────────────────────────────────\n');
  console.log(newBlock);
  console.log('─────────────────────────────────────────────────────────────────────');
  console.log('\n⚠️  Remember: wait until the "measure after" date before treating');
  console.log('   GSC data for these pages as actionable.\n');
}

run();
