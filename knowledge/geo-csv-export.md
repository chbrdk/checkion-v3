# GEO CSV export

**Date:** 2026-09-17  
**Specs:** `specs/domain/geo-csv-export.md` · `specs/api/geo-job-export-csv.md`

## What
Magazine topbar **Export CSV** downloads every `queryRun` (query × model) with answer text, citations, placement, presence summary, and optional E-E-A-T columns.

## Paths
| Kind | Value |
|------|--------|
| API | `GET /api/geo-jobs/:id/export` |
| paths helper | `paths.routes.apiGeoJobExportCsv(id)` |
| Builder | `apps/web/lib/geo-csv-export.ts` |
| UI | `GeoResultActions` |
| MCP | `checkion_v3.geo_job_export_csv` |

## Format notes
- RFC 4180, CRLF, UTF-8 **BOM** on the wire (`EF BB BF`) for Excel.
- Formula-injection guard: cells starting with `= + - @` get a leading `'`.
- One row per cell; empty `queryRuns` → header only.
