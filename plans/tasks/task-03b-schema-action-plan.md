# Task 3b: Wire Schema Audit into `gsc:action-plan`

**Status:** ✅ Done  
**Depends on:** Task 3 (schema audit file must exist in `plans/gsc-data/`)

## What

Update `action-plan.js` so that when a `🟡 Push CTR` page has gaps in the latest schema audit, the action plan includes a concrete schema recommendation alongside the existing CTR instructions.

## Why

Right now, `action-plan.js` routes `🟡 Push CTR` entries to title/meta rewrites or content improvements — but the most impactful CTR lever for these pages is often missing `FAQPage` or `BreadcrumbList` schema, which produces visible SERP features without any ranking change. The action plan should surface this before sending you to rewrite content.

The header comment in `action-plan.js` already lists *"Flag missing schema for audit"* as a routing option — this task implements that path.

## What to build

Changes are limited to `scripts/gsc/action-plan.js` (and possibly `scripts/gsc/lib/classify.js` if schema routing logic belongs there).

### 1. Load the latest schema audit

Add a helper alongside `findLatestSnapshot()`:

```js
function findLatestSchemaAudit() {
  const dataDir = path.resolve(process.cwd(), 'plans/gsc-data');
  const files = fs.readdirSync(dataDir)
    .filter(f => f.startsWith('schema-audit-') && f.endsWith('.json'))
    .sort();
  if (files.length === 0) return null;
  return path.join(dataDir, files[files.length - 1]);
}
```

Return `null` silently if no audit file exists — do not error. The action plan works without it; schema data is additive.

### 2. Look up schema gaps for a ranking URL

```js
function schemaGapsForUrl(auditData, rankingUrl) {
  if (!auditData) return [];
  const targetPath = normalisePath(rankingUrl); // reuse existing normalisePath()
  const entry = auditData.pages.find(p => normalisePath(p.url) === targetPath);
  if (!entry) return [];
  return Object.entries(entry.schema)
    .filter(([, v]) => v.status === 'missing' || v.status === 'malformed')
    .map(([type, v]) => ({ type, status: v.status, reason: v.reason || null }));
}
```

### 3. Inject schema step into `🟡 Push CTR` action instructions

In `renderActionPlan()` (or wherever `routeAction()` output is assembled), after the existing instructions for `🟡 Push CTR` entries, append a schema block if gaps exist:

```
  ── Schema gaps on this page ──────────────────────────────────────────
  The following schema types are missing and would produce SERP rich results:

    ❌ FAQPage      → Add JSON-LD FAQPage block. For symptom/treatment pages,
                      use the SymptomFAQ component (auto-generates it).
                      For treatment detail pages, add manually — see akupunktur.astro
                      FAQ section as the source of Q&A content.

    ❌ BreadcrumbList → Add BreadcrumbList JSON-LD. Affects every page.
                        Use the URL path to build the item list.

  Schema audit: plans/gsc-data/schema-audit-2026-08-03.json
```

The `FAQPage` hint line should be chosen by page type, not hardcoded:
- `symptom_*` or `health_goal` → `"Use the SymptomFAQ component — it auto-generates FAQPage JSON-LD from its faqs prop."`
- `treatment_detail` or `treatment_index` → `"Add a FAQPage JSON-LD block manually — see akupunktur.astro for the FAQ accordion content to extract."`
- all other page types → generic: `"Add a FAQPage JSON-LD block."`

The `BreadcrumbList` hint is the same for all page types.

Only show this block for `🟡 Push CTR` entries — not for other tiers where schema is not the primary lever.

If no gaps exist for the page, show:

```
  ✅ Schema coverage: all expected types present
```

### 4. Schema gap count in multi-entry output (`--top N`)

When `--top N` is used, add a schema gap indicator to the single-line opportunity header:

```
  Opportunity 1 of 5  [🟡 Push CTR]  schema: 2 gaps
```

Gap count = number of schema types with status `missing` **or** `malformed` (both are actionable).

## Output example

```
══════════════════════════════════════════════════════════════════════════
  ACTION PLAN — "akupunktur nyköping"
══════════════════════════════════════════════════════════════════════════

  Tag:        🟡 Push CTR
  Position:   2.3
  CTR:        4.1%  (expected 15.8%, gap -74%)
  ...

  1. Rewrite the <title> to include a stronger call-to-action...
  2. Add a meta description that...

  ── Schema gaps on this page ──────────────────────────────────────────
  The following schema types are missing and would produce SERP rich results:

    ❌ FAQPage      → Add JSON-LD FAQPage block. The page has 4 FAQ accordion
                      items in the HTML — extract them into a FAQPage schema block
                      in the frontmatter, matching the pattern in SymptomFAQ.astro.

    ❌ BreadcrumbList → Add BreadcrumbList JSON-LD.

  Schema audit: plans/gsc-data/schema-audit-2026-08-03.json  (3 days ago)
  ──────────────────────────────────────────────────────────────────────

  ✅ Not recently tracked — signal is fresh
══════════════════════════════════════════════════════════════════════════
```

## Constraints

- If no schema audit file exists, action-plan output is unchanged. Do not degrade the existing experience.
- Do not change the action routing logic for non-`🟡 Push CTR` tiers.
- The schema block is informational — it does not replace the existing action instructions, it follows them.
- Show the audit file's age alongside its filename, and check whether any commits have been pushed to `main` since the audit was generated. Derive the audit date from the filename. Get the timestamp of the last pushed commit via:

  ```js
  execSync('git log origin/main -1 --format=%ct').toString().trim()
  ```

  Three possible states:

  **Commits pushed after the audit:**
  ```
    Schema audit: schema-audit-2026-07-15.json  (19 days ago)
    ⚠  New commits have been pushed since this audit was generated.
       If you changed any schema or page structure, re-audit to reflect those changes:
         1. npm run build
         2. npm run gsc:schema
  ```

  **No commits since the audit (up to date):**
  ```
    Schema audit: schema-audit-2026-07-28.json  (6 days ago)  ✓ no commits since audit
  ```

  **Local commits exist but not pushed (no deploy yet):**
  ```
    Schema audit: schema-audit-2026-07-28.json  (6 days ago)  ✓ no pushed commits since audit
  ```

  Detect unpushed commits via `git log origin/main..HEAD --oneline` — if output is non-empty, local commits exist but haven't been deployed, so no warning is needed.

  If `git` is unavailable or the command fails, fall back to passive display of the age only — do not error.
- The audit JSON now includes a top-level `warnings` array (see task 3 drift detection section). If the loaded audit has any warnings, append a single line at the end of the schema block:

  ```
    ⚠  Audit has script drift warnings — run npm run gsc:schema to review
  ```

  This nudges you to re-read the audit console output if something in the site has changed. Do not enumerate the warnings inline — that belongs in the audit output, not the action plan.

## Context files to read before implementing

- `scripts/gsc/action-plan.js` — understand `renderActionPlan()` and `routeAction()`, the stale-data block is the closest structural analogue to what this task adds
- `scripts/gsc/lib/classify.js` — understand `routeAction()` to decide whether schema routing belongs here or stays in action-plan.js
- `plans/gsc-data/schema-audit-YYYY-MM-DD.json` — the file produced by task 3; read a real one to confirm the structure matches expectations before implementing the lookup
