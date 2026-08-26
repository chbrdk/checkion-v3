# Home magazine — CHECKION v3

## Status
Accepted (Phase 1) — recent-first editorial magazine on `/`

## Goal
Replace the Panel / demo-snapshot home with one magazine composition: brand cover, **three numbered run lists** (Singles · Deep · GEO), launch CTAs, and a short project strip.

## Composition (`HomeMagazine` / `checkion-magazine--home`)
Full stage width (no 52rem cap). Spine — not stacked `Panel` dashboards:

1. **Cover** — CHECKION as hero · short product lede · primary CTA **New scan** · ghost Projects (comfortable top padding under the rail)
2. **01 · Launch** — three CTA tiles (`checkion-capability-tile` look): **Single** · **Deep** · **GEO** → `scanLaunch({ mode })`
3. **02 · Runs** — three equal columns (`checkion-home-run-columns`), each a numbered `checkion-project-run-list` with score `data-tone`:
   - **Singles** — recent completed/failed page scans (`ScanSummary`), ~6–8; link `/results/:id/overview`
   - **Deep scans** — domain corpus jobs; link `/domain/:id/overview`
   - **GEO runs** — always show the column; EmptyState when empty; link `/geo/:id/overview`
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
- `listProjects` · `listScans` · `listDomainScans` · `listGeoJobs` (existing fixture/DB stores)
- No new API fields

## UI primitives (`@msqdx/ui`)
`Button` · `EmptyState` · `Text`  
App composition for magazine chrome (`checkion-home-*`), run lists, launch tiles, and collection-card markup. Do not invent a parallel ScoreBand card in app code. Home stays a server component — do not pull client hub `ProjectCollectionCard`.

## Drop / reshape
- Demo snapshot copy, Explore deferred link list, Sample shares as home spine
- EntityCard / Grid “Latest runs” gallery (replaced by three list columns)
- Corpus pulse / `LedeStrip` on home (counts live on project workspace)
- Shares remain reachable via share routes / results

## Related
- Shell: `app-shell.md`
- Project magazine pattern: `project-workspace.md`
- Launch magazine: `scan-modes.md`
