# API — Scans

## Status
Accepted (Phase 1)

## Endpoints
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/scans?projectId=` | List |
| POST | `/api/scans` | `{ projectId, mode, url }` → `ScanSummary` 201 |
| GET | `/api/scans/:id` | Summary |
| GET | `/api/scans/:id/overview` | Light overview payload |
| GET | `/api/scans/:id/issues` | `{ items: IssueSummary[] }` |
| GET | `/api/scans/:id/scores` | `{ items: ScoreCard[] }` |

See also `specs/api/domain-scan-payload.md`.
