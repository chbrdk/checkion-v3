# Scan run rename (WCAG + Domain) — CHECKION v3

## Status
Accepted.

## Purpose
Operators assign a **human name** to a single-page (WCAG) or deep Domain run — same pattern as GEO (`geo-job-rename.md`). Edit on the result magazine; the same title appears on the project Runs list.

## Surfaces

| Surface | Behaviour |
|---------|-----------|
| Single-scan magazine masthead | Shows `scan.title` when set; else H1 / path. **Rename** opens a Dialog |
| Domain magazine masthead | Shows `scan.title` when set; else host. **Rename** opens a Dialog |
| Project detail · Runs | List link text = custom title or compact URL |
| API | `PATCH /api/scans/:id` · `PATCH /api/domain-scans/:id` `{ title }` — see [`../api/scan-run-title.md`](../api/scan-run-title.md) |

## Rules
- Title is required after trim; max **120** characters (shared with GEO).
- Stored on the scan / domain summary (`title`); DB persistence via payload jsonb (`payload.scan.title` / `payload.domain.title`).
- Does not mutate URL, scores, or measurement.
- Re-run does not copy the custom title (new run gets a fresh default).

## Related
[`geo-job-rename.md`](./geo-job-rename.md) · [`edit-dialogs.md`](./edit-dialogs.md) · [`scan-result-workspace.md`](./scan-result-workspace.md)
