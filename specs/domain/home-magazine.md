# Home magazine — CHECKION v3

## Status
Accepted (Phase 1) — recent-first editorial magazine on `/`

## Goal
Replace the Panel / demo-snapshot home with one magazine composition: brand cover, corpus pulse, and a **multi-column gallery of latest runs** with score color bands and direct links into result magazines.

## Composition (`HomeMagazine` / `checkion-magazine--home`)
Full stage width (no 52rem cap). Spine — not stacked `Panel` dashboards:

1. **Cover** — CHECKION as hero · short product lede · primary CTA **New scan** · ghost Projects / Results
2. **01 · Pulse** — `LedeStrip` / `Lede` counts: Projects · Scans · Deep · GEO
3. **02 · Latest runs** (primary) — multi-column `@msqdx/ui` `Grid` + `EntityCard` tiles for recent completed singles **and** deep domain runs (union sorted by `completedAt`, ~8–12). Each tile: mode chip · compact URL · score with `data-tone` · link to `/results/:id/overview` or `/domain/:id/overview`
4. **03 · Deep scans** — numbered `checkion-project-run-list` for domain corpus jobs (parity with project workspace)
5. **04 · GEO runs** — short run list when jobs exist; empty → omit chapter

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
`EntityCard` · `Grid` · `Button` · `Chip` · `EmptyState` · `Lede` / `LedeStrip` · `Text`  
App composition only for magazine chrome (`checkion-home-*`). Do not invent a parallel ScoreBand card in app code.

## Drop / reshape
- Demo snapshot copy, Explore deferred link list, Sample shares as home spine
- Shares remain reachable via share routes / results

## Related
- Shell: `app-shell.md`
- Project magazine pattern: `project-workspace.md`
- Launch magazine: `scan-modes.md`
