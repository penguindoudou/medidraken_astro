/**
 * redirects-map.js
 *
 * Parses the `redirects` block from astro.config.mjs and returns a flat map:
 *   { '/old-path': 'https://www.medidraken.com/new-path/' }
 *
 * This is the single source of truth for known redirects. audit-canonicalization.js
 * uses it so toCanonical() never has to guess for paths that are already mapped.
 *
 * Why text-parsing instead of a dynamic import?
 *   astro.config.mjs imports Astro internals and build-time plugins. Importing it
 *   directly in a plain Node script pulls in the entire Astro build pipeline.
 *   A regex parse of the redirects literal is simpler and reliable for this project's
 *   config format. If the config gains programmatic redirect entries (loops, spreads)
 *   this approach will need to be revisited.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SITE_ORIGIN = 'https://www.medidraken.com';

/**
 * Load and parse redirects from astro.config.mjs.
 *
 * @returns {Record<string, string>} Map of { '/from-path': 'https://www.medidraken.com/to-path/' }
 */
export function loadRedirectsMap() {
  const configPath = resolve(process.cwd(), 'astro.config.mjs');
  let configText;
  try {
    configText = readFileSync(configPath, 'utf8');
  } catch {
    console.warn('[redirects-map] Could not read astro.config.mjs — no known redirects loaded.');
    return {};
  }

  // Extract the contents of the redirects: { ... } block.
  // Handles single-line comments inside the block.
  const match = configText.match(/redirects\s*:\s*\{([^}]+)\}/s);
  if (!match) {
    console.warn('[redirects-map] No redirects block found in astro.config.mjs.');
    return {};
  }

  const entries = {};
  // Match  'from': 'to'  or  "from": "to"  pairs, ignoring comment lines
  const pairRe = /^\s*['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/gm;
  let m;
  while ((m = pairRe.exec(match[1])) !== null) {
    const from = m[1];  // e.g. '/taiji.html'
    let to   = m[2];  // e.g. '/kurser/tai-chi/'

    // Normalise: ensure full absolute URL
    if (!to.startsWith('http')) {
      to = SITE_ORIGIN + (to.startsWith('/') ? to : '/' + to);
    }
    // Ensure trailing slash (matches Astro trailingSlash: 'always')
    if (!to.endsWith('/')) to += '/';

    entries[from] = to;
  }

  return entries;
}
