# GEO job rename

**Date:** 2026-09-17  
**Specs:** `specs/domain/geo-job-rename.md` · `specs/api/geo-job-title.md`

## Behaviour
- Cover masthead shows `job.title` (not the fixed “Where answer engines place you” line).
- **Rename** → Dialog → `PATCH /api/geo-jobs/:id` `{ title }` (1–120 chars).
- Project detail GEO runs list already links with `job.title`.

## Code
| Piece | Path |
|-------|------|
| Normalize | `apps/web/lib/job-title.ts` (via `geo-job-title.ts` re-export) |
| Store | `updateGeoJobTitle` in `geo-store` / `dbUpdateGeoJobTitle` |
| UI | `GeoTitleEditor` → shared `JobTitleEditor` |

## Related
WCAG / Domain rename: `knowledge/scan-run-rename.md`
