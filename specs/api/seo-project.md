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
| POST | `/keywords/suggest` | Research seeds via Market Suggest Research Agent — `{ locale?, seedHint? }` → `{ keywords[], brief?, agent?, model, stubbed }` |
| GET | `/domain` | Latest domain snapshot (+ ranked keywords) |
| POST | `/domain` | `{ action: 'refresh' }` — DataForSEO → snapshot |
| GET | `/backlinks` | Latest + history |
| POST | `/backlinks` | `{ action: 'refresh' }` |
| GET | `/rank-configs` | List configs |
| POST | `/rank-configs` | Create `{ domain, keywords[], schedule?, locationCode? }` |
| POST | `/rank-configs/suggest` | Rank track-set via Research Agent (saved Research short-circuit if ≥5 clean) |
| GET | `/rank-configs/:configId` | Config + keywords + latest run/snapshots |
| POST | `/rank-configs/:configId/refresh` | Queue/run rank check |
| GET | `/competitors` | Latest Field SERP-overlap snapshot (`latest`) |
| POST | `/competitors` | `{ keywords[] }` — SERP overlap → persist snapshot |
| POST | `/competitors/suggest` | Field keywords via Market Suggest Research Agent — `{ locale?, seedHint? }` → `{ keywords[], brief?, agent?, model, stubbed }` |
| GET | `/gsc` | Status + latest performance snapshot (live when OAuth connected) |
| POST | `/gsc` | `{ action: 'refresh'\|'disconnect', siteUrl? }` — refresh Search Analytics → snapshot; or disconnect |
| GET | `/gsc/oauth/start` | Redirect URL / `{ authorizeUrl }` for Google `webmasters.readonly` |
| GET | `/gsc/oauth/callback` | OAuth code exchange → store connection (project-bound) |

Common: responses include `source`, `stubbed`, `fetchedAt` where market data is returned.

## Errors
`400` invalid_body · `401` · `403` · `404` · `429` cost_soft_cap · `502` vendor_error
