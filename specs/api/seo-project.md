# SEO Project APIs — CHECKION v3

## Status
Accepted — supersedes loose `/api/seo-market/*` one-shots for product UI/MCP.

Base: `/api/projects/:projectId/seo`. Auth + Access Model B on project.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/overview` | KPIs: latest domain snapshot, latest backlinks, active rank configs summary |
| GET | `/keywords` | Saved keywords + metrics |
| POST | `/keywords` | `{ action: 'save'\|'research'\|'hydrate', keywords?, seed?, … }` |
| GET | `/domain` | Latest domain snapshot (+ ranked keywords) |
| POST | `/domain` | `{ action: 'refresh' }` — DataForSEO → snapshot |
| GET | `/backlinks` | Latest + history |
| POST | `/backlinks` | `{ action: 'refresh' }` |
| GET | `/rank-configs` | List configs |
| POST | `/rank-configs` | Create `{ domain, keywords[], schedule?, locationCode? }` |
| GET | `/rank-configs/:configId` | Config + keywords + latest run/snapshots |
| POST | `/rank-configs/:configId/refresh` | Queue/run rank check |
| POST | `/competitors` | `{ keywords[] }` — SERP overlap (may use saved keywords) |
| POST | `/competitors/suggest` | Field smart keyword suggestions via OpenRouter Qwen — `{ locale?, seedHint? }` → `{ keywords[], model, stubbed }` |
| GET | `/gsc` | Status + stub/fixture performance |

Common: responses include `source`, `stubbed`, `fetchedAt` where market data is returned.

## Errors
`400` invalid_body · `401` · `403` · `404` · `429` cost_soft_cap · `502` vendor_error
