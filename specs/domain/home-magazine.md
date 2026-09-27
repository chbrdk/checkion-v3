# Home magazine — CHECKION v3

## Status
Accepted (Phase 1) — recent-first editorial magazine on `/`

## Goal
Replace the Panel / demo-snapshot home with one magazine composition: brand cover, **three numbered run lists** (Singles · Deep · GEO), launch CTAs, and a short project strip.

## Composition (`HomeMagazine` / `checkion-magazine--home`)
Full stage width (no 52rem cap). Spine — not stacked `Panel` dashboards:

1. **Cover** — large **CHECKION** wordmark only (no lede, no cover CTAs)
2. **01 · Launch** — three CTA tiles (`checkion-capability-tile` look): **Single** · **Deep** · **GEO** → `scanLaunch({ mode })`
3. **02 · Runs** — three equal columns (`checkion-home-run-columns`), each a numbered `checkion-project-run-list` with score `data-tone`:
   - **Singles** — recent completed/failed page scans (`ScanSummary`); link `/results/:id/overview`
   - **Deep scans** — domain corpus jobs; link `/domain/:id/overview`
   - **GEO runs** — always show the column; EmptyState when empty; link `/geo/:id/overview`
   - **Paging** — each column shows **6** rows first (`RUN_COLUMN_PAGE_SIZE`); **Show more** reveals the next 6 up to a **24**-row window (`RUN_COLUMN_WINDOW`). Server fetch stays a short teaser window (≤40), not the full scan corpus.
   - **URL titles** — run list titles (`checkion-project-run-list__title`) MUST stay within the column: wrap long host/path strings (`overflow-wrap: anywhere`) and scale type with the column (`cqi`), never overflow horizontally.
4. **03 · Projects** — five most recent collections (`lastScanAt`, then name) as read-only `checkion-collection-card` tiles (Open only — no edit/delete on home)

## Score bands
Shared helper `scoreTone` in `lib/scan-display.ts`:

| Band | Score | Tone | Color |
|------|-------|------|-------|
| Green | ≥ 80 | `pos` | `--ok` |
| Yellow | ≥ 60 | `low` | `--warn` |
| Orange | ≥ 40 | `mid` | `--caution` |
| Red | &lt; 40 | `neg` | `--danger` |
| Muted | null | `default` | muted |

## Data
- Viewer-scoped: `listProjectsForViewer` · `listScansForViewer` · `listDomainScansForViewer` · `listGeoJobsForViewer` (Access Model B — `specs/domain/access-model-b-visibility.md`)
- Never load unfiltered `listScans` / `listDomainScans` / `listGeoJobs` on home
- No new API fields

## UI primitives (`@msqdx/ui`)
`Button` · `EmptyState` · `Text`  
App composition for magazine chrome (`checkion-home-*`), run lists, launch tiles, and collection-card markup. Cover is brand wordmark only. Do not invent a parallel ScoreBand card in app code. Home stays a server component — do not pull client hub `ProjectCollectionCard`.

## Drop / reshape
- Demo snapshot copy, Explore deferred link list, Sample shares as home spine
- EntityCard / Grid “Latest runs” gallery (replaced by three list columns)
- Corpus pulse / `LedeStrip` on home (counts live on project workspace)
- Shares remain reachable via share routes / results

## Related
- Shell: `app-shell.md`
- Project magazine pattern: `project-workspace.md`
- Launch magazine: `scan-modes.md`
