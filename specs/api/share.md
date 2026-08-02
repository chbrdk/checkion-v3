# API — Share

## Status
Accepted (Wave 4 / minimal)

## Endpoints
| Method | Path | Body / query | Response |
|--------|------|--------------|----------|
| POST | `/api/share` | `{ resourceType, resourceId }` | `ShareLink` (idempotent if exists) |
| GET | `/api/share?resourceType=&resourceId=` | | existing or 404 |
| GET | `/api/share/[token]` | | `{ share, overview }` public |
| DELETE | `/api/share/[token]` | | `{ ok: true }` |

Shapes in `@checkion-v3/contracts`. Fixture store until Postgres.
