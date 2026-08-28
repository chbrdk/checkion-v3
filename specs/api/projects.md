# API — Projects

## Status
Accepted (Phase 1 + local CRUD · live origin when federation configured)

## Endpoints
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/projects` | `{ items: ProjectSummary[] }` |
| GET | `/api/projects?platformProjectId=` | Capability by collection id → `ProjectDetail` |
| POST | `/api/projects` | `CreateProjectInput` → `ProjectDetail` 201 |
| GET | `/api/projects/:id` | `ProjectDetail` |
| PATCH | `/api/projects/:id` | `UpdateProjectInput` → `ProjectDetail` |
| POST | `/api/projects/:id/archive` | Archive Collection via Plexon when bound; local `status: archived` → `ProjectDetail` |
| DELETE | `/api/projects/:id` | **Alias of archive** (204) — no hard-delete of Collection mirrors |

## Archive (global)
When `CHECKION_FEDERATION_MODE=live` and the project has a real Collection UUID, archive calls Plexon `PATCH /api/platform/provisioning/projects/:platformProjectId` with service secret + `X-Plexon-User-Id` (`{ status: 'archived' }`). Fan-out upserts archived to sibling products. Unbound / dummy: local archive only. Restore via Plexon hub. Scans stay on the archived project (not reassigned to Unassigned).

Hard-delete of local rows remains store/ops only (`deleteProject`) — not exposed from product UI.

Shapes: `@checkion-v3/contracts`. Postgres when `DATABASE_URL`; else in-memory fixtures.
