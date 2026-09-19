# GEO position history

**Date:** 2026-09-19  
**Specs:** `specs/domain/geo-position-history.md` · `specs/api/geo-position-history.md`

## Phase 1
- Soft match: project + measurement + normalized query text.
- API: `GET /api/projects/:id/geo-history` (`paths.routes.apiProjectGeoHistory`).
- UI: project chapter (`paths.routes.projectGeoHistory`) + magazine teaser; charts via `@msqdx/ui` `SeriesChart`.
- Builder helpers: `normalizeGeoQueryKey`, `buildGeoPositionHistory`, `geoHistoryTeaserSeries`.

## Code
| Piece | Path |
|-------|------|
| Builder | `apps/web/lib/geo/position-history.ts` |
| API | `apps/web/app/api/projects/[id]/geo-history/route.ts` |
| Project UI | `GeoHistoryChapter` in project panels |
| Magazine | teaser on GEO overview |

## Phase 2
Hard lineage (`parentJobId` / `seriesId`) — documented in domain spec only until implemented.
