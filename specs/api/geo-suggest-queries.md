# GEO suggest-queries — CHECKION v3

## Status
Accepted (Phase 3 launch assist)

## Endpoint
`POST /api/geo/suggest-queries` (`paths.routes.apiGeoSuggestQueries`)

## Body
```json
{ "url": "https://example.com/", "existing": ["…"], "max": 4 }
```

| Field | Required | Notes |
|-------|----------|--------|
| `url` | yes | Target host / page for brand-derived prompts |
| `existing` | no | Current launch list — suggestions dedupe against these |
| `max` | no | 1–8, default 4 |

## Response
```json
{
  "suggestions": [{ "id": "fixture-1", "title": "…", "description": "…" }],
  "source": "fixture",
  "stubbed": true
}
```

| `source` | When |
|----------|------|
| `fixture` | No `OPENAI_API_KEY`, or OpenAI failure / empty parse — host-derived pool from `fixtureSuggestPool` |
| `openai` | Live OpenAI completion returned usable prompts |

## Auth
Same as other mutating GEO routes: when Plexon auth is configured, require session / Bearer.

## UI
`/scan` GEO compose → `GeoQueryList` **Suggest** dialog (Audion field-suggest composition).
