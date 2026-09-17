# GEO CSV export

**Date:** 2026-09-17 (rev: spreadsheet structure)  
**Specs:** `specs/domain/geo-csv-export.md` · `specs/api/geo-job-export-csv.md`

## What
Magazine topbar **Export CSV** → one row per query×model with placement + answer.

## Paths
| Kind | Value |
|------|--------|
| API | `GET /api/geo-jobs/:id/export` |
| paths helper | `paths.routes.apiGeoJobExportCsv(id)` |
| Builder | `apps/web/lib/geo-csv-export.ts` |
| UI | `GeoResultActions` |
| MCP | `checkion_v3.geo_job_export_csv` |

## Format (Excel DE)
- UTF-8 BOM + first line `sep=;`
- Field separator `;` (not `,`)
- List separator inside cells: ` | `
- Newlines flattened → one physical row per cell
- Column order: query / model / hit / citations / answer first; job + EEAT last

## Why not comma CSV
German Excel treats `,` CSV as a single column unless the user picks the wizard — exports looked “structureless”. Semicolon + `sep=;` opens as a real table.
