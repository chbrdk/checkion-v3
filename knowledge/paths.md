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

## Env
| Key | Purpose |
|-----|---------|
| `NEXT_PLEXON_BASE_URL` | plexon-v3 base (staging URL in Coolify) |
| `NEXT_PUBLIC_CHECKION_URL` | Public checkion-v3 URL |
| `PLEXON_SERVICE_SECRET` | Shared service secret (unused while federation deferred) |
| `CHECKION_FEDERATION_MODE` | Keep `dummy` for fixtures / Staging Shell |
| `PLEXON_DEMO_OWNER_USER_ID` | Parked for later origin registration |
| `PLEXON_DEMO_COMPANY_ID` | Parked for later origin registration |

## Federation
Contract id: `2026-05-plexon-federation-v3` — **deferred** (see `specs/domain/plexon-federation.md`).
Local / Staging Shell focus: projects, single/domain scans, GEO fixtures.

## GEO routes
- Magazine: `/geo/:id/overview` · `/queries` (Placement nav deferred; legacy `/placement` redirects to Queries)
- Queries deep-link: `/geo/:id/queries?q=<prompt>&model=<modelId>` (`paths.routes.geoQueriesPrompt`)
- Live LLM job launch: **deferred** (see `knowledge/dummy-data-mode.md`)

## Share
Public landing: `/share/[token]` · API `/api/share`

## DS
Sibling `file:../../../msqdx-ui/packages/{ui,ui-tokens}` + barrels `lib/msqdx-ui*.ts`. Docker build clones the same sibling tree (see `Dockerfile`).
