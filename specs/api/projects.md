# API — Projects

## Status
Accepted (Phase 1 + local CRUD)

## Endpoints
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/projects` | `{ items: ProjectSummary[] }` |
| GET | `/api/projects?platformProjectId=` | Capability by collection id → `ProjectDetail` |
| POST | `/api/projects` | `CreateProjectInput` → `ProjectDetail` 201 (local fixture only) |
| GET | `/api/projects/:id` | `ProjectDetail` |
| PATCH | `/api/projects/:id` | `UpdateProjectInput` → `ProjectDetail` |
| DELETE | `/api/projects/:id` | 204 — scans reassigned to `proj-unassigned` |

Plexon origin on create is **deferred** (`specs/domain/plexon-federation.md`).

Shapes: `@checkion-v3/contracts`. Fixture store until product Postgres.
