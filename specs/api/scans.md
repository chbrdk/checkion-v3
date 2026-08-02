# API — Scans

## Status
Accepted (Phase 1) · Correlation fields **spec-only** until AUDION ↔ CHECKION single-scan trigger ships (`specs/domain/audion-journey-scan-trigger.md`)

## Endpoints
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/scans?projectId=` | List |
| POST | `/api/scans` | `{ projectId, mode, url, … }` → `ScanSummary` 201 |
| GET | `/api/scans/:id` | Summary |
| GET | `/api/scans/:id/overview` | Light overview payload |
| GET | `/api/scans/:id/issues` | `{ items: IssueSummary[] }` |
| GET | `/api/scans/:id/scores` | `{ items: ScoreCard[] }` |

See also `specs/api/domain-scan-payload.md`.

## POST body
| Field | Required | Notes |
|-------|----------|-------|
| `projectId` | yes | CHECKION project id |
| `mode` | yes | `single` \| `deep` — AUDION journey handoff **must** use `single` |
| `url` | yes | Page to scan |
| `waitForCompletion` | no | Boolean; existing |
| `platformProjectId` | no | Plexon Collection id (correlation; implement with trigger wave) |
| `audionRunId` | no | AUDION Chat/Studies run id (correlation) |
| `stepUrl` | no | Explored step URL when distinct from `url` |

## Auth
When Plexon auth is configured: session **or** `Authorization: Bearer checkion_…` (`specs/api/tokens.md`).  
Service secret is **not** accepted on this route (provisioning only).

## Deep-link (UI, not API)
`/scan?projectId=&mode=single&url=` — see domain trigger spec.
