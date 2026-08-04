/**
 * test-redirects-map.js
 *
 * Canary test for loadRedirectsMap(). Catches silent parse breakage after
 * changes to astro.config.mjs (reformatting, comments inside the redirects
 * block, spread entries, etc.).
 *
 * Run: npm run gsc:test:redirects
 * Exits 1 on any failure.
 */

import { loadRedirectsMap } from '../lib/redirects-map.js';

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

console.log('— redirects-map canary —\n');

// 1. Map must not be empty
const entryCount = Object.keys(map).length;
assert(entryCount > 0, `Map is non-empty (got ${entryCount} entries)`);

// 2. Spot-check known redirect sources
const knownSources = [
  '/taiji.html',
  '/taiji',
  '/johannes.html',
  '/behandlingar.html',
  '/qigong',
];
for (const from of knownSources) {
  assert(from in map, `Known redirect source "${from}" is present`);
}

// 3. Spot-check known target values (full absolute URLs)
assert(
  map['/taiji.html'] === 'https://www.medidraken.com/kurser/tai-chi/',
  '/taiji.html → https://www.medidraken.com/kurser/tai-chi/',
);
assert(
  map['/johannes.html'] === 'https://www.medidraken.com/om-oss/',
  '/johannes.html → https://www.medidraken.com/om-oss/',
);
assert(
  map['/qigong'] === 'https://www.medidraken.com/kurser/medicinsk-qigong/',
  '/qigong → https://www.medidraken.com/kurser/medicinsk-qigong/',
);

// 4. All targets must be non-empty strings starting with https://
const badTargets = Object.entries(map).filter(
  ([, v]) => !v || typeof v !== 'string' || !v.startsWith('https://'),
);
assert(
  badTargets.length === 0,
  `All targets are non-empty https:// strings${
    badTargets.length > 0
      ? ` (bad entries: ${badTargets.map(([k]) => k).join(', ')})`
      : ''
  }`,
);

// 5. All targets end with a trailing slash (Astro trailingSlash: 'always')
const noTrailingSlash = Object.entries(map).filter(([, v]) => !v.endsWith('/'));
assert(
  noTrailingSlash.length === 0,
  `All targets end with a trailing slash${
    noTrailingSlash.length > 0
      ? ` (missing: ${noTrailingSlash.map(([k]) => k).join(', ')})`
      : ''
  }`,
);

// Summary
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
