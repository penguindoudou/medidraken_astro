# SEO Fixes — Medidraken

Concrete website improvements identified from GSC analysis. One task per session.

> Pipeline tooling lives separately in `plans/tasks/`. This folder is for acting on what the tools find.

---

## Queue

| # | File | Status | Source | Description |
|---|------|--------|--------|-------------|
| 1 | [task-10-canonical-cleanup.md](task-10-canonical-cleanup.md) | ✅ Done | `gsc:alert` 2026-08-03 | Run `gsc:audit` + `gsc:cleanup` to resolve 4 cannibalization warnings |
| 2 | [task-11-html-ghost-redirects.md](task-11-html-ghost-redirects.md) | ✅ Done | `gsc:analyze` 2026-08-03 | Add 301 redirects for `.html` ghost pages and no-slash variants still indexed by Google |

---

## Workflow

Start each session by opening the top ⬜ Todo task. When done, mark it ✅ Done in this index.

After any change that affects a ranking page, run:
```bash
npm run gsc:request-index -- /the/changed/path/
npm run gsc:track -- --add "query" --page "/the/changed/path/" --note "what you did"
```
