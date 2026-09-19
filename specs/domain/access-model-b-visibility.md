# Access Model B — resource visibility (CHECKION)

**Status:** Accepted — 2026-09-19  
**Companions:** `plexon-v3/specs/domain/collection-projects.md` invariant 5 · `plexon-v3/knowledge/access-model-b-project-visibility.md` · `plexon-federation.md` · `home-magazine.md`

## Rule

A signed-in user may see a Collection capability project and its **dependent runs** only when:

1. They are the local `ownerPlexonUserId`, **or**
2. The project's `platformProjectId` is in Plexon `accessible-collections` for that user (creator / Collection assignment / legacy product assignment).

Company membership alone does **not** grant visibility.

## Applies to

| Resource | List | Detail |
|----------|------|--------|
| Projects | `listProjectsForViewer` | `viewerCanAccessProject` |
| Page scans (`ScanSummary`) | `listScansForViewer` | via parent project |
| Domain / deep scans | `listDomainScansForViewer` | via parent project |
| GEO jobs | `listGeoJobsForViewer` | via parent project |

Home magazine (`/`) must load viewer-scoped run lists only.

## APIs

- `GET /api/scans`, `/api/domain-scans`, `/api/geo-jobs` — require auth when Plexon auth is configured; return only viewer-visible items.
- `GET/PATCH/DELETE` scan (and nested overview/issues/…) — 401 without user; 403/404 when project not accessible.
- Project workspace SSR — `notFound()` when viewer cannot access the project.
- Provisioning service routes (`/api/platform/provisioning/*`) stay service-secret authenticated (unchanged).

## Plexon directory

`fetchAccessiblePlatformProjectIds` must page `nextCursor` (cap pages) so visibility is not truncated at the first 50 Collections.

## Done when

1. Home / list APIs never return a colleague's run for an inaccessible project.
2. Direct URLs to foreign projects/scans fail closed.
3. Unit + smoke tests cover filter and API gating.
4. Spec inventory includes this file.
