# GEO suggest-queries — CHECKION v3

## Status
Accepted (Phase 3 launch assist; Phase 6 brand context)

## Endpoint
`POST /api/geo/suggest-queries` (`paths.routes.apiGeoSuggestQueries`)

## Body
```json
{
  "url": "https://example.com/",
  "companyName": "Acme",
  "project": { "name": "Acme Collection", "domain": "acme.example" },
  "existing": ["…"],
  "max": 4
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `url` | one of url / companyName | Target host / page for brand-derived prompts |
| `companyName` | one of url / companyName | Explicit brand when URL is missing or to override host-derived brand |
| `project` | no | Optional `{ name?, domain? }` from the selected Collection — feeds smarter Suggest copy |
| `existing` | no | Current launch list — suggestions dedupe against these |
| `max` | no | 1–8, default 4 |

Validation: reject `400 invalid_body` when both `url` and `companyName` are empty/whitespace.

When only `companyName` is set, the server derives a normalized citation URL (`urlFromCompanyName`) for host helpers while preferring the company string as the brand in prompts.

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
| `fixture` | No `OPENAI_API_KEY`, or OpenAI failure / empty parse — host/brand-derived pool from `fixtureSuggestPool` |
| `openai` | Live OpenAI completion returned usable prompts |

## Auth
Same as other mutating GEO routes: when Plexon auth is configured, require session / Bearer.

## UI
`/scan` GEO compose → `GeoQueryList` **Suggest** dialog (Audion field-suggest composition). Passes the visible URL, Company name, and selected project context.
