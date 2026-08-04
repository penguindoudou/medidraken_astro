#!/usr/bin/env node
/**
 * prune-snapshots.js
 *
 * Prunes old gsc-keywords-*.json snapshots from plans/gsc-data/.
 *
 * Keep set = (N most recent by filename) ∪ (any file dated YYYY-MM-01)
 * Delete set = all gsc-keywords-*.json NOT in the keep set
 *
 * Runs as dry-run by default.  Pass --confirm to actually delete.
 * Pass --keep N to override the default of 12 kept files.
 *
 * Usage:
 *   node scripts/gsc/prune-snapshots.js              # dry run
 *   node scripts/gsc/prune-snapshots.js --confirm    # delete
 *   node scripts/gsc/prune-snapshots.js --keep 8     # keep only 8 most recent
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const DATA_DIR    = path.resolve(__dirname, '../../plans/gsc-data');
const FILE_GLOB   = /^gsc-keywords-(.+)\.json$/;

// Parse CLI args
const args       = process.argv.slice(2);
const DRY_RUN    = !args.includes('--confirm');
const KEEP_INDEX = args.indexOf('--keep');
const KEEP_N     = KEEP_INDEX !== -1 ? parseInt(args[KEEP_INDEX + 1], 10) : 12;

if (Number.isNaN(KEEP_N) || KEEP_N < 1) {
  console.error('Error: --keep requires a positive integer.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the date portion from a snapshot filename.
 * Handles both:
 *   gsc-keywords-2026-07-31.json          → "2026-07-31"
 *   gsc-keywords-2026-08-04-015747.json   → "2026-08-04"  (timestamp suffix stripped)
 *
 * Returns null if the filename doesn't match the expected pattern.
 */
function extractDate(filename) {
  const match = filename.match(/^gsc-keywords-(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Given the full list of snapshot filenames (sorted ascending),
 * returns a Set of the earliest file per calendar month.
 * e.g. if July has 2026-07-03 and 2026-07-31, only 2026-07-03 is kept.
 */
function monthlyCheckpoints(files) {
  const seen = new Map(); // "YYYY-MM" → first filename encountered
  for (const f of files) {
    const dateStr = extractDate(f);
    if (!dateStr) continue;
    const month = dateStr.slice(0, 7); // "YYYY-MM"
    if (!seen.has(month)) seen.set(month, f);
  }
  return new Set(seen.values());
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  // 1. Collect all gsc-keywords-*.json files
  let allFiles;
  try {
    allFiles = fs.readdirSync(DATA_DIR)
      .filter(f => FILE_GLOB.test(f))
      .sort(); // lexicographic = chronological for YYYY-MM-DD prefixes
  } catch (err) {
    console.error(`Error reading data directory: ${DATA_DIR}\n${err.message}`);
    process.exit(1);
  }

  if (allFiles.length === 0) {
    console.log('No gsc-keywords-*.json files found. Nothing to prune.');
    return;
  }

  // 2. Build keep set
  //    a) N most recent (last N when sorted ascending)
  const nMostRecent = new Set(allFiles.slice(-KEEP_N));

  //    b) Earliest fetch per calendar month (monthly checkpoints)
  const monthlyCheckpointSet = monthlyCheckpoints(allFiles);

  const keepSet = new Set([...nMostRecent, ...monthlyCheckpointSet]);

  // 3. Delete set = everything not in keepSet
  const toDelete = allFiles.filter(f => !keepSet.has(f));

  // 4. Report
  const label = DRY_RUN ? '[DRY RUN] ' : '';

  console.log(`\n${label}gsc:prune — snapshot pruner`);
  console.log(`  Data dir : ${DATA_DIR}`);
  console.log(`  Total    : ${allFiles.length} gsc-keywords-*.json files`);
  console.log(`  Keep N   : ${KEEP_N} most recent`);
  console.log(`  Keep set : ${keepSet.size} files (${nMostRecent.size} recent + ${monthlyCheckpointSet.size} monthly checkpoints)\n`);

  if (toDelete.length === 0) {
    console.log('✅  Nothing to prune — all files are in the keep set.');
    return;
  }

  console.log(`Files that ${DRY_RUN ? 'would be' : 'will be'} deleted (${toDelete.length}):`);
  for (const f of toDelete) {
    const dateStr = extractDate(f) ?? '?';
    console.log(`  🗑  ${f}  (${dateStr})`);
  }

  console.log('\nFiles that will be kept:');
  for (const f of [...keepSet].sort()) {
    const tag = monthlyCheckpointSet.has(f) && !nMostRecent.has(f)
      ? '  📅 monthly checkpoint'
      : '';
    console.log(`  ✅  ${f}${tag}`);
  }

  // 5. Execute (if not dry run)
  if (DRY_RUN) {
    console.log('\n⚠️  Dry run — nothing deleted.');
    console.log('   Run `npm run gsc:prune:run` to actually delete.');
    return;
  }

  let deleted = 0;
  let errors  = 0;

  for (const f of toDelete) {
    const fullPath = path.join(DATA_DIR, f);
    try {
      fs.unlinkSync(fullPath);
      console.log(`  ✔  Deleted: ${f}`);
      deleted++;
    } catch (err) {
      console.error(`  ✖  Failed to delete ${f}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nDone. Deleted ${deleted} file(s).${errors > 0 ? ` ${errors} error(s).` : ''}`);

  if (errors > 0) {
    process.exit(1);
  }
}

main();
