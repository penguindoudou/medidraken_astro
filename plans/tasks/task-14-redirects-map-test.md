# Task 14: Add test for redirects-map.js parsing

**Status:** ✅ Done

## Problem

`lib/redirects-map.js` parses `astro.config.mjs` with a regex to extract the redirects block. The file itself acknowledges the fragility:

> "If the config gains programmatic redirect entries (loops, spreads) this approach will need to be revisited."

There's currently no test for `loadRedirectsMap()`. Any refactor of `astro.config.mjs` — adding a comment inside the redirects block, wrapping entries in a spread, reformatting — can silently return an empty map. `audit-canonicalization.js` then classifies all known redirects as `mechanical_guess` instead of `known_redirect`, producing noisy output on every audit run.

## What to build

A simple test script at `scripts/gsc/test-redirects-map.js` that:

1. Calls `loadRedirectsMap()` against the real `astro.config.mjs`.
2. Asserts the map is not empty.
3. Asserts a known set of expected entries are present (spot-check 3–5 specific redirects that definitely exist).
4. Asserts no entry maps to an empty or non-string target.
5. Prints a pass/fail summary and exits non-zero on any failure.

### Example structure

```js
import { loadRedirectsMap } from './lib/redirects-map.js';

const map = loadRedirectsMap();
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ ${message}`);
    failed++;
  }
}

// Must have entries
assert(Object.keys(map).length > 0, `Map is non-empty (got ${Object.keys(map).length} entries)`);

// Spot-check known redirects — update these to match actual entries in astro.config.mjs
assert(map['/taiji.html'], 'Known redirect /taiji.html is present');
assert(map['/taiji.html']?.includes('medidraken.com'), '/taiji.html maps to a full URL');

// No empty targets
const emptyTargets = Object.entries(map).filter(([, v]) => !v || typeof v !== 'string');
assert(emptyTargets.length === 0, 'All targets are non-empty strings');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
```

### Add npm script

In `package.json`:

```json
"gsc:test:redirects": "node scripts/gsc/test-redirects-map.js"
```

## Acceptance criteria

1. `npm run gsc:test:redirects` passes against the current `astro.config.mjs`.
2. The test exits non-zero if `loadRedirectsMap()` returns an empty object.
3. The test exits non-zero if a known redirect entry is missing.
4. The spot-check entries match at least 3 real redirects found in `astro.config.mjs`.

## How to find real entries for the spot-checks

```bash
grep "':'" astro.config.mjs | head -10
# or
node -e "import('./scripts/gsc/lib/redirects-map.js').then(m => console.log(m.loadRedirectsMap()))"
```

## Notes

- This test is a canary, not a full parser test. Its job is to catch silent breakage after config changes.
- Keep the spot-check list short (3–5 entries) — it should be easy to update when redirects are intentionally removed.
- If `loadRedirectsMap()` itself needs a fix to parse the current config correctly, fix the parser first, then write the test.
