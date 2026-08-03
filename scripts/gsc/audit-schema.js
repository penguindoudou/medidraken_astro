/**
 * audit-schema.js
 *
 * Fetches every page from the live site via its sitemap and reports which
 * structured data (JSON-LD) is present, missing, or malformed — per page —
 * based on URL-pattern rules grounded in the actual Medidraken site structure.
 *
 * Usage:
 *   node scripts/gsc/audit-schema.js
 *   npm run gsc:schema
 *
 * Output: plans/gsc-data/schema-audit-YYYY-MM-DD.json
 */

import fs from 'node:fs';
import path from 'node:path';

// ─── Constants ────────────────────────────────────────────────────────────────

const LIVE_BASE_URL = 'https://www.medidraken.com';
const OUTPUT_DIR = path.resolve(process.cwd(), 'plans/gsc-data');

// Top-level sections that are known to the script's page-type rules.
const KNOWN_SECTIONS = new Set([
  'behandling',
  'symtom',
  'kurser',
  'na-dina-halsomal',
  'for-foretag',
  'upplevelser',
  'artiklar',
  'legal',
]);

// Single-page slugs at the root level that don't need schema coverage.
const KNOWN_SINGLE_PAGE_SLUGS = new Set([
  'presentkort',
  'friskvardsbidrag',
  'om-oss',
  'kontakt',
  '404',
  'index',
  '',
]);

// Schema types the validator has rules for (suppresses "unvalidated" warnings).
const KNOWN_SCHEMA_TYPES = new Set([
  'FAQPage',
  'BreadcrumbList',
  'Service',
  'Course',
  'BlogPosting',
  'MedicalBusiness',
  'WebSite',
  'Organization',
  'WebPage',
]);

// ─── Page-type detection ──────────────────────────────────────────────────────

/**
 * Determine the page type from a normalised URL path.
 * Returns one of the type keys in PAGE_RULES, or 'other'.
 *
 * @param {string} urlPath  e.g. "/behandling/akupunktur/"
 * @returns {string}
 */
function getPageType(urlPath) {
  // Strip leading/trailing slashes for segment splitting, but keep the
  // original for exact-match checks.
  const p = urlPath.replace(/^\/|\/$/g, '');
  const parts = p.split('/').filter(Boolean);

  // Homepage
  if (p === '' || p === 'index') return 'homepage';

  const [seg0, seg1, seg2] = parts;

  // /behandling/
  if (seg0 === 'behandling') {
    if (!seg1) return 'treatment_index';
    return 'treatment_detail';
  }

  // /symtom/
  if (seg0 === 'symtom') {
    if (!seg1) return 'other';                         // /symtom/ index — skip
    if (!seg2) {
      // /symtom/{slug}  — could be a category index or a standalone
      // We treat them uniformly: both need FAQPage + BreadcrumbList.
      // Distinguish by checking if there's a further level; but since we're
      // classifying one URL at a time we use the two-segment form as
      // "symptom_standalone" and the three-segment form as "symptom_detail".
      return 'symptom_standalone';
    }
    // /symtom/{category}/{slug}
    if (seg2 && !parts[3]) {
      // If seg2 is "index" it's the category index
      return seg2 === 'index' ? 'symptom_category' : 'symptom_detail';
    }
  }

  // /kurser/
  if (seg0 === 'kurser') {
    if (!seg1) return 'course_index';
    if (!seg2) return 'course_discipline_index';
    return 'course_detail';
  }

  // /na-dina-halsomal/
  if (seg0 === 'na-dina-halsomal') {
    if (!seg1) return 'other';   // index — skip
    return 'health_goal';
  }

  // /for-foretag/
  if (seg0 === 'for-foretag') {
    if (!seg1) return 'other';   // index — skip
    return 'corporate';
  }

  // /upplevelser/
  if (seg0 === 'upplevelser') {
    if (!seg1) return 'other';   // index — skip
    return 'experience';
  }

  // /artiklar/
  if (seg0 === 'artiklar') {
    if (!seg1) return 'other';   // index — skip
    return 'article';
  }

  return 'other';
}

/**
 * Expected schema types per page type.
 * @type {Record<string, string[]>}
 */
const PAGE_RULES = {
  homepage:                 ['WebSite', 'Organization', 'MedicalBusiness'],
  treatment_index:          ['FAQPage', 'BreadcrumbList'],
  treatment_detail:         ['Service', 'FAQPage', 'BreadcrumbList'],
  symptom_category:         ['FAQPage', 'BreadcrumbList'],
  symptom_detail:           ['FAQPage', 'BreadcrumbList'],
  symptom_standalone:       ['FAQPage', 'BreadcrumbList'],
  course_index:             ['BreadcrumbList'],
  course_discipline_index:  ['Course', 'BreadcrumbList'],
  course_detail:            ['Course', 'BreadcrumbList'],
  health_goal:              ['FAQPage', 'BreadcrumbList'],
  corporate:                ['Service', 'BreadcrumbList'],
  experience:               ['Service', 'BreadcrumbList'],
  article:                  ['BlogPosting'],
};

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate a parsed schema object against type-specific rules.
 * Returns null if valid, or a reason string if malformed.
 *
 * @param {string} type
 * @param {object} obj
 * @returns {string|null}
 */
function validate(type, obj) {
  switch (type) {
    case 'FAQPage': {
      if (!Array.isArray(obj.mainEntity) || obj.mainEntity.length === 0) {
        return 'mainEntity is empty or missing';
      }
      for (const entry of obj.mainEntity) {
        if (entry['@type'] !== 'Question') {
          return `mainEntity entry has @type "${entry['@type']}" instead of "Question"`;
        }
        if (!entry.name || typeof entry.name !== 'string' || !entry.name.trim()) {
          return 'mainEntity entry has empty or missing name';
        }
        if (
          !entry.acceptedAnswer ||
          !entry.acceptedAnswer.text ||
          typeof entry.acceptedAnswer.text !== 'string' ||
          !entry.acceptedAnswer.text.trim()
        ) {
          return 'mainEntity entry has empty or missing acceptedAnswer.text';
        }
      }
      return null;
    }

    case 'Service': {
      if (!obj.name || typeof obj.name !== 'string' || !obj.name.trim()) {
        return 'name field is empty or missing';
      }
      return null;
    }

    case 'Course': {
      if (!obj.name || typeof obj.name !== 'string' || !obj.name.trim()) {
        return 'name field is empty or missing';
      }
      return null;
    }

    case 'BreadcrumbList': {
      if (!Array.isArray(obj.itemListElement) || obj.itemListElement.length < 2) {
        return 'itemListElement must have at least 2 entries';
      }
      for (const entry of obj.itemListElement) {
        if (entry.position == null) return 'itemListElement entry missing position';
        if (!entry.name || typeof entry.name !== 'string' || !entry.name.trim()) {
          return 'itemListElement entry has empty or missing name';
        }
        if (!entry.item || typeof entry.item !== 'string' || !entry.item.trim()) {
          return 'itemListElement entry has empty or missing item (URL)';
        }
      }
      return null;
    }

    case 'BlogPosting': {
      if (!obj.headline || typeof obj.headline !== 'string' || !obj.headline.trim()) {
        return 'headline is empty or missing';
      }
      if (
        !obj.datePublished ||
        typeof obj.datePublished !== 'string' ||
        !obj.datePublished.trim()
      ) {
        return 'datePublished is empty or missing';
      }
      return null;
    }

    case 'MedicalBusiness': {
      if (!obj.name || typeof obj.name !== 'string' || !obj.name.trim()) {
        return 'name field is empty or missing';
      }
      if (!obj.address) return 'address is missing';
      if (!obj.openingHoursSpecification) return 'openingHoursSpecification is missing';
      return null;
    }

    default:
      // Types we know exist but don't validate (WebSite, Organization, WebPage, etc.)
      return null;
  }
}

// ─── JSON-LD extraction ───────────────────────────────────────────────────────

/**
 * Extract all JSON-LD blocks from an HTML string.
 * Returns an array of parsed objects (may include nested arrays, which are
 * expanded to a flat list of objects).
 *
 * @param {string} html
 * @returns {object[]}
 */
function extractJsonLd(html) {
  const results = [];
  const RE = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = RE.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) {
        results.push(...parsed);
      } else {
        results.push(parsed);
      }
    } catch {
      // Silently skip malformed JSON — it will show up as missing anyway.
    }
  }

  return results;
}

/**
 * Collect all @type values from a list of JSON-LD objects.
 * Handles both string "@type" and array "@type".
 *
 * @param {object[]} blocks
 * @returns {string[]}  de-duplicated list of top-level types
 */
function collectTypes(blocks) {
  const types = new Set();
  for (const block of blocks) {
    const t = block['@type'];
    if (!t) continue;
    if (Array.isArray(t)) {
      for (const s of t) types.add(String(s));
    } else {
      types.add(String(t));
    }
  }
  return [...types];
}

/**
 * Find the first JSON-LD object whose @type matches `type`.
 *
 * @param {object[]} blocks
 * @param {string} type
 * @returns {object|null}
 */
function findBlock(blocks, type) {
  for (const block of blocks) {
    const t = block['@type'];
    if (!t) continue;
    if (Array.isArray(t) ? t.includes(type) : t === type) return block;
  }
  return null;
}

// ─── Page discovery ───────────────────────────────────────────────────────────

/**
 * Discover all pages by fetching from the live site via its sitemap.
 * @returns {Promise<Array<{url: string, html: string}>>}
 */
async function discoverPages() {
  // Fetch sitemap index, then any sub-sitemaps, to collect all page URLs.
  let urls = [];

  try {
    const sitemapUrl = `${LIVE_BASE_URL}/sitemap-index.xml`;
    const res = await fetch(sitemapUrl);
    const text = await res.text();

    const sitemapLocRe = /<loc>(https?:\/\/[^<]+)<\/loc>/g;
    let m;
    const sitemapUrls = [];

    while ((m = sitemapLocRe.exec(text)) !== null) {
      const loc = m[1].trim();
      if (loc.endsWith('.xml')) {
        sitemapUrls.push(loc);
      } else {
        urls.push(loc);
      }
    }

    for (const subSitemapUrl of sitemapUrls) {
      try {
        const r = await fetch(subSitemapUrl);
        const t = await r.text();
        const re = /<loc>(https?:\/\/[^<]+)<\/loc>/g;
        let mm;
        while ((mm = re.exec(t)) !== null) {
          const loc = mm[1].trim();
          if (!loc.endsWith('.xml')) urls.push(loc);
        }
      } catch {
        // skip failed sub-sitemap
      }
    }
  } catch (err) {
    console.error(`Failed to fetch sitemap from ${LIVE_BASE_URL}: ${err.message}`);
    process.exit(1);
  }

  if (urls.length === 0) {
    console.error('No URLs found in sitemap. Is the site up?');
    process.exit(1);
  }

  // Fetch each page and normalise the URL to a path.
  const pages = [];
  for (const fullUrl of urls) {
    let urlPath;
    try {
      const u = new URL(fullUrl);
      urlPath = u.pathname;
      if (!urlPath.endsWith('/')) urlPath += '/';
    } catch {
      continue;
    }

    try {
      process.stdout.write(`  Fetching ${fullUrl} …\r`);
      const res = await fetch(fullUrl, {
        headers: { 'User-Agent': 'medidraken-schema-audit/1.0' },
      });
      if (!res.ok) {
        console.warn(`  SKIP ${fullUrl} — HTTP ${res.status}`);
        continue;
      }
      const html = await res.text();
      pages.push({ url: urlPath, html });
    } catch (err) {
      console.warn(`  SKIP ${fullUrl} — ${err.message}`);
    }
  }

  process.stdout.write('\n');
  return pages;
}

// ─── Drift detection helpers ──────────────────────────────────────────────────

/**
 * Given a URL that was classified as "other", return its top-level segment or
 * null if it's a known single-page slug.
 *
 * @param {string} urlPath
 * @returns {string|null}
 */
function getUnknownTopLevelSegment(urlPath) {
  const p = urlPath.replace(/^\/|\/$/g, '');
  const parts = p.split('/').filter(Boolean);
  if (parts.length === 0) return null;                 // homepage handled above

  const seg0 = parts[0];
  if (KNOWN_SECTIONS.has(seg0)) return null;           // known section
  if (KNOWN_SINGLE_PAGE_SLUGS.has(seg0)) return null;  // known single page
  return seg0;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // ── Discover pages ──────────────────────────────────────────────────────────

  console.log(`\nFetching live pages from ${LIVE_BASE_URL} …`);

  const pages = await discoverPages();

  if (pages.length === 0) {
    console.error('No pages found. Check that the site is up.');
    process.exit(1);
  }

  // ── Process each page ────────────────────────────────────────────────────────

  const auditedPages = [];

  // For drift detection
  /** @type {Map<string, number>} unknown top-level segment → page count */
  const unknownSections = new Map();
  /** @type {Map<string, number>} unrecognised schema type → page count */
  const unvalidatedTypes = new Map();

  for (const { url, html } of pages) {
    const pageType = getPageType(url);

    // ── Drift: unknown sections ──────────────────────────────────────────────
    if (pageType === 'other') {
      const seg = getUnknownTopLevelSegment(url);
      if (seg) {
        unknownSections.set(seg, (unknownSections.get(seg) ?? 0) + 1);
      }
      continue; // skip "other" pages from schema audit
    }

    const expectedTypes = PAGE_RULES[pageType] ?? [];
    const blocks = extractJsonLd(html);
    const foundTypes = collectTypes(blocks);

    // ── Drift: unvalidated schema types ─────────────────────────────────────
    for (const t of foundTypes) {
      if (!KNOWN_SCHEMA_TYPES.has(t)) {
        unvalidatedTypes.set(t, (unvalidatedTypes.get(t) ?? 0) + 1);
      }
    }

    // ── Per-type status ──────────────────────────────────────────────────────
    /** @type {Record<string, {status: string, reason?: string}>} */
    const schema = {};

    for (const type of expectedTypes) {
      if (!foundTypes.includes(type)) {
        schema[type] = { status: 'missing' };
        continue;
      }
      const block = findBlock(blocks, type);
      const reason = validate(type, block);
      if (reason) {
        schema[type] = { status: 'malformed', reason };
      } else {
        schema[type] = { status: 'ok' };
      }
    }

    auditedPages.push({
      url,
      page_type: pageType,
      found_types: foundTypes,
      schema,
    });
  }

  // ── Summary stats ────────────────────────────────────────────────────────────

  const totalPages = auditedPages.length;
  let fullyCovered = 0;

  /** @type {Record<string, number>} type → count of pages missing it */
  const missingByType = {};

  for (const page of auditedPages) {
    const statuses = Object.values(page.schema).map((s) => s.status);
    const hasGap = statuses.some((s) => s === 'missing' || s === 'malformed');
    if (!hasGap) fullyCovered++;

    for (const [type, info] of Object.entries(page.schema)) {
      if (info.status === 'missing' || info.status === 'malformed') {
        missingByType[type] = (missingByType[type] ?? 0) + 1;
      }
    }
  }

  const pagesWithGaps = totalPages - fullyCovered;

  // Sort missingByType descending
  const sortedMissing = Object.fromEntries(
    Object.entries(missingByType).sort(([, a], [, b]) => b - a)
  );

  // ── Warnings ────────────────────────────────────────────────────────────────

  /** @type {Array<object>} */
  const warnings = [];

  for (const [segment, pagesSkipped] of [...unknownSections.entries()].sort()) {
    warnings.push({ type: 'unknown_section', segment, pages_skipped: pagesSkipped });
  }

  for (const [schemaType, pageCount] of [...unvalidatedTypes.entries()].sort()) {
    warnings.push({ type: 'unvalidated_schema_type', schema_type: schemaType, page_count: pageCount });
  }

  // ── Top priority gaps ────────────────────────────────────────────────────────

  const priorityTypes = new Set([
    'treatment_detail',
    'treatment_index',
    'symptom_category',
    'symptom_detail',
    'symptom_standalone',
    'health_goal',
  ]);

  const topPriorityGaps = auditedPages
    .filter(
      (p) =>
        priorityTypes.has(p.page_type) &&
        p.schema['FAQPage'] &&
        (p.schema['FAQPage'].status === 'missing' || p.schema['FAQPage'].status === 'malformed')
    )
    .map((p) => p.url)
    .sort();

  // ── Build JSON output ────────────────────────────────────────────────────────

  const today = new Date().toISOString().split('T')[0];

  const report = {
    generated: new Date().toISOString(),
    summary: {
      total_pages_audited: totalPages,
      pages_fully_covered: fullyCovered,
      pages_with_gaps: pagesWithGaps,
      missing_by_type: sortedMissing,
    },
    warnings,
    pages: auditedPages,
  };

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const outputFile = path.join(OUTPUT_DIR, `schema-audit-${today}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));

  // ── Console output ───────────────────────────────────────────────────────────

  const LINE = '─'.repeat(41);

  console.log(`\nSchema audit — ${today}`);
  console.log(LINE);
  console.log(`Pages audited:        ${String(totalPages).padStart(3)}`);
  console.log(`Fully covered:        ${String(fullyCovered).padStart(3)}`);
  console.log(`Pages with gaps:      ${String(pagesWithGaps).padStart(3)}`);

  if (Object.keys(sortedMissing).length > 0) {
    console.log('\nMissing schema (by type):');
    const maxLen = Math.max(...Object.keys(sortedMissing).map((t) => t.length));
    for (const [type, count] of Object.entries(sortedMissing)) {
      const note = count === totalPages ? '  ← universal gap' : '';
      console.log(`  ${type.padEnd(maxLen + 2)}${String(count).padStart(3)} pages${note}`);
    }
  } else {
    console.log('\n✅  All audited pages are fully covered with schema.');
  }

  // Warnings block (only if there are warnings)
  if (warnings.length > 0) {
    console.log('\n⚠  Script drift warnings:');
    for (const w of warnings) {
      if (w.type === 'unknown_section') {
        console.log(
          `   Unknown section /${w.segment}/ — ${w.pages_skipped} page${w.pages_skipped !== 1 ? 's' : ''} skipped (update page-type rules if schema is needed)`
        );
      } else if (w.type === 'unvalidated_schema_type') {
        console.log(
          `   Unrecognised schema type "${w.schema_type}" found on ${w.page_count} page${w.page_count !== 1 ? 's' : ''} (add a validation rule)`
        );
      }
    }
  }

  // Top priority gaps
  if (topPriorityGaps.length > 0) {
    const MAX_SHOWN = 10;
    console.log('\nTop priority gaps (FAQPage missing on treatment/symptom/health-goal pages):');
    const shown = topPriorityGaps.slice(0, MAX_SHOWN);
    for (const u of shown) {
      console.log(`  ${u}`);
    }
    if (topPriorityGaps.length > MAX_SHOWN) {
      console.log(`  … and ${topPriorityGaps.length - MAX_SHOWN} more`);
    }
  }

  console.log(`\nReport saved → ${outputFile}\n`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
