# GEO job rename — CHECKION v3

## Status
Accepted.

## Purpose
Operators assign a **human name** to a GEO run (not only the auto `GEO — host` default). Edit on the result magazine; the same `job.title` appears on the project Runs list.

## Surfaces

| Surface | Behaviour |
|---------|-----------|
| GEO overview / queries masthead | Shows `job.title` as the cover headline; **Rename** opens a Dialog |
| Project detail · GEO runs | List link text = `job.title` (already) |
| API | `PATCH /api/geo-jobs/:id` `{ title }` — see [`../api/geo-job-title.md`](../api/geo-job-title.md) |

## Rules
- Title is required after trim; max **120** characters.
- Does not mutate queries, models, or measurement.
- Re-run still clones the current title unless the operator renames the new job later.

## Related
[`geo-competitive-presence.md`](./geo-competitive-presence.md) · [`edit-dialogs.md`](./edit-dialogs.md)
