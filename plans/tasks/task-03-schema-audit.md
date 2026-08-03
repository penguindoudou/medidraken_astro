# Task 3: Schema / Structured Data Audit Script

**Status:** ✅ Done

## What

A script that reads built HTML from `dist/`, parses all `<script type="application/ld+json">` blocks, and reports what structured data is present, missing, or invalid — per page — based on page-type rules grounded in the actual codebase.

## Why

The `🟡 Push CTR` tier (top 3, clicks below expected) is the classic signature of missing rich results. When Google shows your result with FAQ accordions, breadcrumbs, or business info, the listing takes up more visual space and signals credibility — lifting CTR without any ranking change.

Schema types relevant to Medidraken:
- `FAQPage` — accordion expands in SERP, taking 3–5× the space of a plain result. Highest CTR impact for symptom and treatment pages.
- `BreadcrumbList` — shows `/Symtom / Ryggont / Ischias` instead of raw URL. Universal quick-win, currently missing everywhere.
- `Service` — helps Google understand treatment and corporate page intent, can surface in service carousels.
- `Course` / `CourseInstance` — Google has a dedicated rich result for courses. Currently missing on all course pages.
- `BlogPosting` — already present on articles via `artiklar/[slug].astro`.

## What the codebase currently looks like

This was audited manually before writing this task. Key findings:

**What exists:**
- `BaseLayout.astro` injects `WebSite`, `Organization`, `MedicalBusiness` ×3 — but **only on the homepage** (`pathname === '/'`). Every other page gets zero schema from the layout.
- `SymptomFAQ.astro` component auto-generates `FAQPage` JSON-LD from its `faqs` prop. Any symptom page using this component gets it automatically.
- `behandling/index.astro` — has `FAQPage` (manually defined).
- `friskvardsbidrag.astro` — has `FAQPage` (manually defined).
- `symtom/rygg-landrygg/akut-ryggont.astro` — has `FAQPage` (manually defined, not via component).
- `artiklar/[slug].astro` — has `BlogPosting`.

**What is missing:**
- `behandling/akupunktur.astro` — has 4 Alpine.js FAQ accordions in the HTML but **no `FAQPage` JSON-LD**. Highest-value gap on the site.
- `behandling/medicinsk-kinesisk-massage.astro` — likely the same situation (not verified).
- `behandling/oljemassage.astro` — likely the same.
- All `/kurser/**` pages — no `Course` or `BreadcrumbList`.
- All `/na-dina-halsomal/**` pages — no schema despite FAQ-like content.
- All `/for-foretag/**` pages — no `Service` or `BreadcrumbList`.
- All `/upplevelser/**` pages — no schema.
- `BreadcrumbList` — missing on every page of the site.

## Page-type rules

The script determines page type by URL pattern. Expected schema per type:

| Page type | URL pattern | Expected schema types |
|---|---|---|
| Homepage | `/` | `WebSite`, `Organization`, `MedicalBusiness` |
| Treatment detail | `/behandling/{slug}` (not index) | `Service`, `FAQPage`, `BreadcrumbList` |
| Treatment index | `/behandling/` | `FAQPage`, `BreadcrumbList` |
| Symptom category | `/symtom/{category}/` (index only) | `FAQPage`, `BreadcrumbList` |
| Symptom detail | `/symtom/{category}/{slug}` | `FAQPage`, `BreadcrumbList` |
| Symptom standalone | `/symtom/{slug}` (flat, no category) | `FAQPage`, `BreadcrumbList` |
| Course index | `/kurser/` | `BreadcrumbList` |
| Course discipline index | `/kurser/{discipline}/` | `Course`, `BreadcrumbList` |
| Course detail | `/kurser/{discipline}/{slug}` | `Course`, `BreadcrumbList` |
| Health goal | `/na-dina-halsomal/**` | `FAQPage`, `BreadcrumbList` |
| Corporate | `/for-foretag/**` | `Service`, `BreadcrumbList` |
| Experiences | `/upplevelser/**` | `Service`, `BreadcrumbList` |
| Article | `/artiklar/{slug}` | `BlogPosting` |
| Other | everything else | *(no requirements — skip)* |

"Other" includes `/kontakt/`, `/om-oss/`, `/presentkort/`, `/friskvardsbidrag/`, `/legal/**`, `404`. These are not flagged as missing schema.

## Validation rules ("malformed" definition)

Presence alone is not enough. A schema block counts as valid only if:

- **`FAQPage`**: has `mainEntity` array with at least one entry; each entry has `@type: "Question"`, non-empty `name`, and `acceptedAnswer.text`.
- **`Service`**: has non-empty `name` field.
- **`Course`**: has non-empty `name` field.
- **`BreadcrumbList`**: has `itemListElement` array with at least two entries; each entry has `position`, `name`, and `item` (URL).
- **`BlogPosting`**: has `headline` and `datePublished`.
- **`MedicalBusiness`**: has `name`, `address`, and `openingHoursSpecification`.

A block that parses as valid JSON but fails these checks is reported as `malformed`, not `missing`.

## What to build

**File:** `scripts/gsc/audit-schema.js`  
**npm script:** `gsc:schema`

### Data source

Default: read HTML from `dist/`. No network requests.  
Flag `--live` fetches from the live site instead (slower, requires site to be up). The base URL for `--live` mode is `https://medidraken.com` — hardcoded constant at the top of the file.

```
npm run gsc:schema          # reads dist/
npm run gsc:schema -- --live  # fetches live pages
```

If `dist/` doesn't exist and `--live` is not set, exit with a clear error: `"Run npm run build first, or use --live"`.

### Page discovery

When reading `dist/`: glob `dist/**/*.html`. Derive URL path from file path using this normalization:

- `index.html` files: strip the filename and trailing-slash-normalize → `dist/symtom/ischias/index.html` → `/symtom/ischias/`
- Non-index `.html` files: strip the `.html` extension → `dist/presentkort.html` → `/presentkort/` (add trailing slash for consistency)

Astro's default output doesn't produce non-index `.html` files, so this case is unlikely in practice — but handle it so the script doesn't break if an old file ends up in `dist/` or the build config changes.

### Logic per page

1. Determine page type from URL pattern (see rules table above).
2. If page type is "Other", skip — do not include in report.
3. Parse all `<script type="application/ld+json">` blocks. Collect the `@type` of each (handle both single objects and arrays).
4. For each expected schema type: check presence, then validate if present.
5. Classify each expected type as: `ok` | `missing` | `malformed`.

### Output

Save to `plans/gsc-data/schema-audit-YYYY-MM-DD.json`.

#### Top-level structure

```json
{
  "generated": "2026-08-03T04:00:00Z",
  "summary": {
    "total_pages_audited": 42,
    "pages_fully_covered": 5,
    "pages_with_gaps": 37,
    "missing_by_type": {
      "FAQPage": 18,
      "BreadcrumbList": 41,
      "Service": 8,
      "Course": 6
    }
  },
  "pages": [ ... ]
}
```

#### Per-page entry

```json
{
  "url": "/behandling/akupunktur/",
  "page_type": "treatment_detail",
  "found_types": ["Service"],
  "schema": {
    "Service":       { "status": "ok" },
    "FAQPage":       { "status": "missing" },
    "BreadcrumbList":{ "status": "missing" }
  }
}
```

When status is `malformed`, include a `reason` field:

```json
"FAQPage": { "status": "malformed", "reason": "mainEntity is empty" }
```

### Console output

Print a human-readable summary after saving the JSON:

```
Schema audit — 2026-08-03
─────────────────────────────────────────
Pages audited:        42
Fully covered:         5
Pages with gaps:      37

Missing schema (by type):
  BreadcrumbList      41 pages  ← universal gap
  FAQPage             18 pages
  Service              8 pages
  Course               6 pages

Top priority gaps (FAQPage missing on treatment/symptom pages):
  /behandling/akupunktur/
  /behandling/medicinsk-kinesisk-massage/
  ...

Report saved → plans/gsc-data/schema-audit-2026-08-03.json
```

The "Top priority gaps" list: filter pages where `FAQPage` is `missing` or `malformed` **and** page type is one of `treatment_detail`, `treatment_index`, `symptom_category`, `symptom_detail`, `symptom_standalone`, or `health_goal`. Sort alphabetically by URL. Cap at 10 entries; if more exist, append `  … and N more` on the last line.

## Drift detection — warnings that tell you when the script needs updating

The script should detect and surface three conditions that mean the page-type rules or validation logic are out of sync with the actual site. These are printed after the main summary and included in the JSON output under a top-level `warnings` array.

### 1. Unknown top-level sections

When a page is discovered whose URL doesn't match any known pattern (and would fall through to "Other"), check whether its top-level segment is a new section you've never seen before. If so, warn once per unknown section — not once per page.

Detection: collect the top-level path segment from every page classified as "Other" (e.g., `/retreats/something` → `retreats`). Cross-reference against the known sections hardcoded in the script: `behandling`, `symtom`, `kurser`, `na-dina-halsomal`, `for-foretag`, `upplevelser`, `artiklar`, `legal`. Any segment not in that list and not a known single-page slug (e.g., `presentkort`, `friskvardsbidrag`, `om-oss`, `kontakt`) is an unknown section.

Console output:
```
⚠  Unknown top-level sections found — update page-type rules if these need schema:
   /retreats/        (3 pages skipped)
   /program/         (1 page skipped)
```

JSON:
```json
{ "type": "unknown_section", "segment": "retreats", "pages_skipped": 3 }
```

### 2. Unrecognised schema types in the HTML

When parsing `<script type="application/ld+json">` blocks, collect any `@type` value that the validator has no rule for (i.e., not in: `FAQPage`, `BreadcrumbList`, `Service`, `Course`, `BlogPosting`, `MedicalBusiness`, `WebSite`, `Organization`, `WebPage`). Warn once per unknown type across the whole run.

Note: `Question` and `Answer` are child items nested inside `FAQPage` blocks — they will never appear as a top-level `@type` in a JSON-LD script tag, so they are not in this allowlist.

This catches the case where you've added a new schema type (e.g., `Event`, `Product`) but the audit script doesn't know how to validate it, so it will never flag it as malformed.

Console output:
```
⚠  Unrecognised schema types found in HTML — add validation rules if needed:
   Event             (found on 2 pages)
   LocalBusiness     (found on 1 page)
```

JSON:
```json
{ "type": "unvalidated_schema_type", "schema_type": "Event", "page_count": 2 }
```

### 3. Pages in a known section that are expected to have schema but have zero JSON-LD blocks at all

This is already covered by the `missing` status on each expected type. No extra warning needed — it appears in the normal per-page output.

### Warnings in the JSON output

Add a top-level `warnings` array alongside `summary` and `pages`:

```json
{
  "generated": "...",
  "summary": { ... },
  "warnings": [
    { "type": "unknown_section", "segment": "retreats", "pages_skipped": 3 },
    { "type": "unvalidated_schema_type", "schema_type": "Event", "page_count": 2 }
  ],
  "pages": [ ... ]
}
```

If there are no warnings, `warnings` is an empty array — always present so consumers can check `data.warnings.length` without a null guard.

### Console placement

Print the warnings block between the missing-schema counts and the "Top priority gaps" section:

```
Schema audit — 2026-08-03
─────────────────────────────────────────
Pages audited:        42
Fully covered:         5
Pages with gaps:      37

Missing schema (by type):
  BreadcrumbList      41 pages
  FAQPage             18 pages
  Service              8 pages
  Course               6 pages

⚠  Script drift warnings:
   Unknown section /retreats/ — 3 pages skipped (update page-type rules if schema is needed)
   Unrecognised schema type "Event" found on 2 pages (add a validation rule)

Top priority gaps (FAQPage missing on treatment/symptom pages):
  /behandling/akupunktur/
  ...
```

If there are no warnings, omit the warnings block entirely from the console output.

---

## Integration with `gsc:action-plan`

This task produces the audit file. Wiring it into `action-plan.js` is task 3b — kept separate so this script can be built and verified independently.

The handoff contract this task must satisfy for 3b to work:

- The JSON output must include a `pages` array at the top level, where each entry has `url` (normalized path, e.g. `/behandling/akupunktur/`) and `schema` (object keyed by type, value `{ "status": "ok"|"missing"|"malformed" }`).
- The filename pattern must be `schema-audit-YYYY-MM-DD.json` in `plans/gsc-data/` so 3b can glob for the latest file the same way action-plan finds snapshots.
- The `summary.missing_by_type` object must exist so 3b can surface a quick count without re-scanning the pages array.

## Context files to read before implementing

- `src/layouts/BaseLayout.astro` — understand the homepage-only injection pattern
- `src/components/symptom/SymptomFAQ.astro` — background only: understand that FAQPage JSON-LD is injected by the component at build time, so the audit script will find it as a normal `<script type="application/ld+json">` block. No special handling needed — treat it identically to manually written JSON-LD.
- `src/pages/behandling/akupunktur.astro` — the highest-priority gap: FAQ section in HTML but no JSON-LD
- `scripts/gsc/audit-canonicalization.js` — existing audit script; match its file structure, dist-reading pattern, and output conventions
