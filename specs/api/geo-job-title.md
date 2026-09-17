# GEO job title (rename) — CHECKION v3

## Status
Accepted.

## Endpoint
`PATCH /api/geo-jobs/:id` (`paths.routes.apiGeoJobDetail(id)`)

## Body
```json
{ "title": "Vaillant live — Wärmepumpe Q3" }
```

| Field | Required | Notes |
|-------|----------|--------|
| `title` | yes | Trimmed; 1–120 chars |

## Response
| Status | Body |
|--------|------|
| 200 | Full `GeoOverview` (updated `job.title`) |
| 400 | `{ "error": "invalid_title" }` |
| 404 | `{ "error": "not_found" }` |

## Auth
Same as other mutating GEO routes: when Plexon auth is configured, require session / Bearer.

## Spec
Domain: `specs/domain/geo-job-rename.md`
