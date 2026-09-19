# GEO position history API — CHECKION v3

## Status
Accepted (Phase 1).

## Endpoint
`GET /api/projects/:id/geo-history` (`paths.routes.apiProjectGeoHistory(id)`)

## Query

| Param | Required | Notes |
|-------|----------|-------|
| `measurement` | no | `recall` \| `live` — default `recall` |
| `limit` | no | Max completed jobs to consider (default **30**, max **50**) |

## Response `200`
`GeoPositionHistoryResult` (`@checkion-v3/contracts`):

```json
{
  "projectId": "proj-demo-1",
  "measurement": "recall",
  "targetHost": "example.com",
  "modelIds": ["gpt-5.6-luna", "claude-sonnet-5"],
  "items": [
    {
      "queryText": "best widgets",
      "queryKey": "best widgets",
      "points": [
        {
          "recordedAt": "2026-09-01T12:00:00.000Z",
          "jobId": "geo-1",
          "positionsByModel": { "gpt-5.6-luna": 2 },
          "avgPosition": 2
        }
      ],
      "latestPosition": 2,
      "trend": "unknown"
    }
  ]
}
```

| Status | Body |
|--------|------|
| 200 | Result (possibly empty `items`) |
| 404 | `{ "error": "not_found" }` — unknown project |

## Auth
Same as other project reads: when Plexon auth is configured, require session / Bearer.

## Spec
Domain: `specs/domain/geo-position-history.md`
