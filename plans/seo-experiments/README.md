# SEO Experiment Log — Medidraken

Track on-page SEO changes driven by GSC data. Each experiment records the baseline
state, what changed, why, and the performance delta — so we can make data-backed
decisions and roll back if results don't improve.

---

## How It Works

**One file per page.** Named after the page slug.

Each file contains:
- **Baseline** — GSC metrics at the time of the change (snapshot from the GSC JSON)
- **Experiment** — what was changed, git commit reference, date
- **Notes** — hypothesis and reasoning
- **Results** — GSC metrics measured ~4 weeks after the change

### Rollback

Every experiment records the git commit hash of the file **before** the change.

```bash
# View what the page looked like before
git show <baseline-commit>:src/pages/path/to/page.astro

# Roll back just this one file
git checkout <baseline-commit> -- src/pages/path/to/page.astro
```

---

## Measuring Results

Pull a fresh GSC export from `scripts/gsc/fetch-gsc-queries.js` and compare:
- Target query impressions & position
- CTR
- Total page clicks

Minimum wait before measuring: **28 days** (GSC data lag + ranking stabilization).
Ideally measure at 28 days and again at 56 days.

---

## Experiment Files

| File | Page | Last Experiment | Status |
| :--- | :--- | :--- | :--- |
| [minska-stress-hitta-inre-lugn.md](./minska-stress-hitta-inre-lugn.md) | `/na-dina-halsomal/minska-stress-hitta-inre-lugn/` | 2026-07-30 | ⏳ Measuring |
| [spanningshuvudvark-stresshuvudvark.md](./spanningshuvudvark-stresshuvudvark.md) | `/symtom/huvudvark/spanningshuvudvark-stresshuvudvark/` | 2026-07-30 | ⏳ Measuring |
| [stark-fokus-mental-styrka.md](./stark-fokus-mental-styrka.md) | `/na-dina-halsomal/stark-fokus-mental-styrka/` | 2026-07-30 | ⏳ Measuring |
