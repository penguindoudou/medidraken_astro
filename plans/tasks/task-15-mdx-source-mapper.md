# Task 15: Add .mdx support to mapUrlToSourceFile

**Status:** ✅ Done

## Problem

`action-plan.js` maps a ranking URL to its source file via `mapUrlToSourceFile()`. It only checks for `.astro` files and `.md` content collection files:

```js
const candidates = [
  path.join(pagesRoot, stripped + '.astro'),
  path.join(pagesRoot, stripped, 'index.astro'),
];

// Fallback for /artiklar/ slugs:
const mdPath = path.resolve(cwd, 'src/content/artiklar', slug + '.md');
```

If a page is built from a `.mdx` file — either in `src/pages/` or `src/content/artiklar/` — `mapUrlToSourceFile()` returns `null`. The action plan output shows:

```
Source file: (not found)
```

This is a silent gap. The user sees the action plan but has no direct path to the file they need to edit.

## What to change

**File:** `scripts/gsc/action-plan.js`

### In the `candidates` array — add `.mdx` variants

```js
const candidates = [
  path.join(pagesRoot, stripped + '.astro'),
  path.join(pagesRoot, stripped + '.mdx'),         // ← add
  path.join(pagesRoot, stripped, 'index.astro'),
  path.join(pagesRoot, stripped, 'index.mdx'),     // ← add
];
```

### In the `/artiklar/` fallback — check `.mdx` too

```js
if (stripped.startsWith('artiklar/')) {
  const slug = stripped.replace('artiklar/', '');

  const mdPath  = path.resolve(cwd, 'src/content/artiklar', slug + '.md');
  if (fs.existsSync(mdPath))  return path.relative(cwd, mdPath);

  const mdxPath = path.resolve(cwd, 'src/content/artiklar', slug + '.mdx');  // ← add
  if (fs.existsSync(mdxPath)) return path.relative(cwd, mdxPath);            // ← add
}
```

## Acceptance criteria

1. `mapUrlToSourceFile('/artiklar/some-slug')` returns the correct path when `src/content/artiklar/some-slug.mdx` exists and no `.md` exists.
2. `mapUrlToSourceFile('/some-page')` returns the correct path when `src/pages/some-page.mdx` exists and no `.astro` exists.
3. Existing `.astro` and `.md` lookups are unchanged — the `.astro` candidate is still tried first.
4. `npm run gsc:action-plan` produces output with a valid source file path for any `.mdx`-backed ranking URL.

## Verification

```bash
# Create a temporary .mdx test file to verify the lookup
touch src/content/artiklar/test-mdx-lookup.mdx

node -e "
import('./scripts/gsc/action-plan.js').then(m => {
  console.log(m.mapUrlToSourceFile('/artiklar/test-mdx-lookup'));
});
"
# Expected: src/content/artiklar/test-mdx-lookup.mdx

# Clean up
rm src/content/artiklar/test-mdx-lookup.mdx
```

## Notes

- This is a 4-line change. The function is already structured for multiple candidates — just extend the list.
- `.mdx` pages in `src/pages/` (not content collections) are less common in this project but still possible as the site grows.
- No changes needed to `generate-article-draft.js` — it always generates `.md` files and has its own output path logic.
