# Plexon federation — CHECKION v3

## Status
**Accepted** — live wiring available when `CHECKION_FEDERATION_MODE=live` and service secret configured. Default local / Staging Shell remains `dummy` (fixtures).

## Contract
`2026-05-plexon-federation-v3` against **plexon-v3 only**.

## Directions
| Direction | Endpoint | Notes |
|-----------|----------|-------|
| Plexon → CHECKION | `PUT/GET /api/platform/provisioning/projects/{id}` | Upsert / catalog via project-store (Postgres when `DATABASE_URL` set) |
| CHECKION → Plexon | `POST …/checkion-project-origin` via `registerCheckionProjectOnPlexon` | Called from `POST /api/projects` when live + owner/company available |

## Mode
- Default `paths.federationMode = dummy` — local CRUD / fixtures
- Override with `CHECKION_FEDERATION_MODE=live` + `PLEXON_SERVICE_SECRET` (+ `NEXT_PLEXON_BASE_URL`)
- `/api/federation/health` reports `deferred: false` when live and configured; probes plexon `/api/health`

## Auth (NextAuth + Plexon)
- NextAuth credentials provider validates against plexon `POST /api/auth/validate-credentials`
- Env: `PLEXON_AUTH_URL`, `PLEXON_SERVICE_SECRET`, `AUTH_SECRET` (≥32), optional `NEXT_PUBLIC_PLEXON_REGISTER_URL`
- Middleware requires login when Plexon auth is configured; public: `/login`, `/api/auth/*`, `/api/health`, `/api/federation/health`, `/api/platform/provisioning/*`, `/share/*`
- Local bypass (“Continue to app”) only when Plexon auth unset

## Env
See `knowledge/paths.md` and `knowledge/staging-coolify.md`.
