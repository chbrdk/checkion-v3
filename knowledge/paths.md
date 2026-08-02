# Paths — CHECKION v3

## Dev
- Web: `http://localhost:3007` (`paths.devPort`)
- Routes: only via `apps/web/lib/paths.ts`
- Runtime env helpers: `apps/web/lib/runtime-config.ts`

## Staging (Coolify)
- Public: `https://checkion-v3.projects-a.plygrnd.tech` (`URL_CHECKION_V3`)
- plexon-v3: `https://plexon-v3.projects-a.plygrnd.tech`
- Attach runbook: `knowledge/staging-coolify.md`
- Image: root `Dockerfile` clones sibling `chbrdk/msqdx-ui` into `/workspace/msqdx-ui` (same layout as local `GITHUB/checkion-v3` + `GITHUB/msqdx-ui`)
- Entrypoint: `scripts/docker-entrypoint.sh` (optional drizzle push; AUTH_SECRET required only when Plexon auth configured)

## Env
| Key | Purpose |
|-----|---------|
| `NEXT_PLEXON_BASE_URL` | plexon-v3 base (federation + health probe) |
| `NEXT_PUBLIC_CHECKION_URL` | Public checkion-v3 URL |
| `PLEXON_AUTH_URL` | plexon-v3 auth base for validate-credentials (often same as plexon base) |
| `PLEXON_SERVICE_SECRET` | Shared service secret for auth + federation |
| `NEXT_PUBLIC_PLEXON_REGISTER_URL` | Optional public Plexon register page |
| `AUTH_SECRET` | NextAuth JWT secret (≥32 chars; required when Plexon auth configured in Docker) |
| `DATABASE_URL` | Product Postgres; when unset, stores use in-memory fixtures. Also enables live scans unless `CHECKION_LIVE_SCANS=0` |
| `CHECKION_LIVE_SCANS` | `1` force live Puppeteer pipeline; `0` force fixture synthesize |
| `CHECKION_FEDERATION_MODE` | `dummy` (default) or `live` |
| `PLEXON_DEMO_OWNER_USER_ID` | Fallback owner for origin registration without session |
| `PLEXON_DEMO_COMPANY_ID` | Fallback company for origin registration without session |

## Auth
Login `/login` · NextAuth `/api/auth/*` · Plexon `validate-credentials` — see `specs/domain/plexon-federation.md`.

## Federation
Contract id: `2026-05-plexon-federation-v3` — live wiring accepted; keep `dummy` for fixture-only local / Staging Shell.

## GEO routes
- Magazine: `/geo/:id/overview` · `/queries` (Placement nav deferred; legacy `/placement` redirects to Queries)
- Queries deep-link: `/geo/:id/queries?q=<prompt>&model=<modelId>` (`paths.routes.geoQueriesPrompt`)
- Live LLM job launch: **deferred** (see `knowledge/dummy-data-mode.md`)

## Share
Public landing: `/share/[token]` · API `/api/share`

## DS
Sibling `file:../../../msqdx-ui/packages/{ui,ui-tokens}` + barrels `lib/msqdx-ui*.ts`. Docker build clones the same sibling tree (see `Dockerfile`).
