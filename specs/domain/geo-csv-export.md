# GEO CSV export — CHECKION v3

## Status
Accepted.

## Purpose
Let operators download the full GEO job corpus for spreadsheet analysis: every scanned **query × model** cell with answer text, citations, placement, and job-level presence / optional E-E-A-T columns.

## Surfaces

| Surface | Role |
|---------|------|
| Result topbar | **Export CSV** in `GeoResultActions` (next to Re-run) |
| API | `GET /api/geo-jobs/:id/export` — see [`../api/geo-job-export-csv.md`](../api/geo-job-export-csv.md) |

## Shape
One **flat CSV** (RFC 4180, UTF-8 with BOM for Excel):

- **One data row per `queryRuns[]` entry** (query × model cell).
- Job metadata, solo/field presence summary, and optional `eeat` scores are **repeated** on each row so a single sheet is self-contained.
- When `queryRuns` is empty (queued / failed shell), the file still has a **header row only**.

Does **not** invent a second project export or replace the Queries magazine dossier.

## Honesty
Export is a faithful dump of stored overview fields — same measurement layer as the job (`recall` | `live`). See [`geo-measurement-layers.md`](./geo-measurement-layers.md) and `knowledge/geo-measurement-honesty.md`.

## Related
- Competitive atoms: [`geo-competitive-presence.md`](./geo-competitive-presence.md)
- Cell insights columns: [`geo-answer-insights.md`](./geo-answer-insights.md)
