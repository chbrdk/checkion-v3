# GEO CSV export — CHECKION v3

## Status
Accepted.

## Purpose
Let operators download the GEO job corpus as a **spreadsheet-ready** table: one row per scanned **query × model** cell, with placement, citations, and answer text.

## Surfaces

| Surface | Role |
|---------|------|
| Result topbar | **Export CSV** in `GeoResultActions` (next to Re-run) |
| API | `GET /api/geo-jobs/:id/export` — see [`../api/geo-job-export-csv.md`](../api/geo-job-export-csv.md) |

## Shape
One flat CSV tuned for Excel (DE):

- **`;` delimiter** + leading `sep=;` hint (comma dumps into one column in German Excel).
- **One physical row per `queryRuns[]` entry** — newlines in answers are flattened to spaces.
- **Analysis columns first** (query / model / hit / position / citations / answer); thin job + EEAT context last.
- When `queryRuns` is empty, file has `sep=;` + header only.

Does **not** invent a second project export or replace the Queries magazine dossier.

## Honesty
Export is a faithful dump of stored overview fields — same measurement layer as the job (`recall` | `live`). See [`geo-measurement-layers.md`](./geo-measurement-layers.md) and `knowledge/geo-measurement-honesty.md`.

## Related
- Competitive atoms: [`geo-competitive-presence.md`](./geo-competitive-presence.md)
- Cell insights columns: [`geo-answer-insights.md`](./geo-answer-insights.md)
