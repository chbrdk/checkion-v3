# Paths — CHECKION v3

## Dev
- Web: `http://localhost:3007` (`paths.devPort`)
- Routes: only via `apps/web/lib/paths.ts`
- Runtime env helpers: `apps/web/lib/runtime-config.ts`

## Staging (Coolify)
- Public: `https://checkion-v3.projects-a.plygrnd.tech` (`URL_CHECKION_V3`)
- plexon-v3: `https://plexon-v3.projects-a.plygrnd.tech`
- Attach runbook: `knowledge/staging-coolify.md`
- **Operator (after smoke):** on **plexon-v3** Coolify set `NEXT_PUBLIC_CHECKION_URL=https://checkion-v3.projects-a.plygrnd.tech` so Collection dashboard / registry deep-links target v3 (do not leave prod `checkion.projects-a…`). See `plexon-v3/knowledge/coolify-v3-staging-runbook.md` §4.3 Wave B note.
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
| `DATABASE_URL` | Product Postgres; when unset, stores use in-memory fixtures. Also enables live scans / live GEO unless the matching `CHECKION_LIVE_*=0` flag is set |
| `CHECKION_LIVE_SCANS` | `1` force live Puppeteer pipeline; `0` force fixture synthesize |
| `CHECKION_LIVE_GEO` | `1` force live GEO LLM pipeline; `0` force fixture synthesize |
| `PUPPETEER_CACHE_DIR` | Docker runner: `/opt/puppeteer` (Chrome installed at image build). Optional local override |
| `PUPPETEER_EXECUTABLE_PATH` | Optional; only if using system Chromium instead of Puppeteer-bundled Chrome |
| `PUPPETEER_SKIP_DOWNLOAD` | Image builder skips npm Chrome download; runner installs via `npx puppeteer browsers install chrome`. Do not set `true` in Coolify for the Docker build |
| `OPENAI_API_KEY` | Required for live GEO LLM stages + queryRuns |
| `OPENAI_MODEL` | Optional default model (default `gpt-5.4-nano`) |
| `CHECKION_FEDERATION_MODE` | `dummy` (default) or `live` |
| `PLEXON_DEMO_OWNER_USER_ID` | Fallback owner for origin registration without session |
| `PLEXON_DEMO_COMPANY_ID` | Fallback company for origin registration without session |

## Auth
Login `/login` · NextAuth `/api/auth/*` · Plexon `validate-credentials` — see `specs/domain/plexon-federation.md`.

## Federation
Contract id: `2026-05-plexon-federation-v3` — live wiring accepted; keep `dummy` for fixture-only local / Staging Shell.

## Central launch (`/scan`)
- Route: `/scan` (`paths.routes.scan`) — capability-first magazine form (`ScanLaunchForm`): **SEO · GEO · WCAG**
- Primary tiles: SEO · GEO · WCAG; WCAG reveals secondary **Quick single** · **Deep scan** (`ToggleGroup`)
- Deep-link helper: `paths.routes.scanLaunch({ projectId, mode: 'seo'|'geo'|'single'|'deep', url, … })`
- Modes:
  - `mode=seo` → `POST /api/domain-scans` → `/domain/:id/overview` (SEO coverage chapter)
  - `mode=geo` → `POST /api/geo-jobs` → `/geo/:id/overview` (visible URL and/or company name + Project; Project defaults empty — select / create, or auto-create on submit when omitted; optional `companyName` on GEO body — see `scan-modes.md`)
  - `mode=single` → WCAG Quick single → `POST /api/scans` → `/results/:id/overview`
  - `mode=deep` → WCAG Deep scan → `POST /api/scans` (+ domain payload) → `/results/:id/overview`
- Spec: `specs/domain/scan-modes.md`

## GEO routes
- Launch: `/scan?mode=geo` (canonical create entry; index `/geo` catalogs finished jobs)
- Magazine: `/geo/:id/overview` · `/queries` (Placement nav deferred; legacy `/placement` redirects to Queries)
- Queries deep-link: `/geo/:id/queries?q=<prompt>&model=<modelId>` (`paths.routes.geoQueriesPrompt`)
- Suggest (launch): `POST /api/geo/suggest-queries` (`paths.routes.apiGeoSuggestQueries`) — body `{ url?, companyName?, project?, projectId?, platformProjectId?, knowledge?, existing?, max? }`; server pulls Collection Knowledge Pack in live federation when Collection bound; fixture pool without `OPENAI_API_KEY`; OpenAI when set
- Create: `POST /api/geo-jobs` prefill competitors / seed queries from pack when Collection bound
- Publish: `POST /api/geo-jobs/:id/publish-knowledge` (`paths.routes.apiGeoJobPublishKnowledge`) — geo_context + competitive merge to plexon-v3
- Collection Knowledge Pack: `apps/web/lib/plexon-knowledge-pack.ts` · `specs/domain/geo-knowledge-consume.md` · Plexon SoT `plexon-v3/specs/domain/collection-knowledge-pack.md`
- Model catalog (launch picker): `apps/web/lib/geo/model-catalog.ts` — OpenAI / Anthropic / Google; UI = selected chips + Add dialog (`GeoModelPicker`); live GEO posts OpenAI-supported ids only (`specs/domain/geo-model-catalog.md`)
- Live GEO: `CHECKION_LIVE_GEO` + `OPENAI_API_KEY` (see `knowledge/dummy-data-mode.md`)

## Share
Public landing: `/share/[token]` · API `/api/share`

## Cross-product deep-link (AUDION → single-page scan)
- Launch: `paths.routes.scanLaunch({ projectId, mode: 'single', url, platformProjectId?, audionRunId?, stepUrl? })` → `/scan?projectId=&mode=single&url=`
- Prefills project, mode, URL; optional AUDION correlation posted on launch; handoff **locks** to WCAG Quick single (no deep / GEO / SEO)
- After submit → `/results/[id]/overview` (`paths.routes.resultSection`)
- Machine: `POST /api/scans` with Bearer `checkion_…` + optional `platformProjectId` / `audionRunId` / `stepUrl` (persisted on `ScanSummary` / payload jsonb)
- Domain: `specs/domain/audion-journey-scan-trigger.md` · AUDION companion `audion-v3/specs/domain/checkion-single-scan-trigger.md`
- Staging base for AUDION links: `NEXT_PUBLIC_CHECKION_URL` / `URL_CHECKION_V3` = `https://checkion-v3.projects-a.plygrnd.tech`

## Settings
- Route: `/settings` (`paths.routes.settings`) — Account, Profile, Appearance, Language, API tokens, Federation
- Spec: `specs/domain/settings.md` · composition mirrors audion-v3 / plexon-v3 section bands
- Rail footer avatar entry; prefs via `paths.displayNameStorageKey` / `themeStorageKey` / `localeStorageKey`

## API tokens
Settings CRUD: `/api/tokens` · verify `/api/tokens/verify` · store `api-tokens-store` / Drizzle `api_tokens` · `knowledge/settings-api-tokens.md` · Bearer machine clients on selected APIs (`POST /api/scans`, `POST /api/geo-jobs`, `POST /api/projects`)

## Federation / Collection summary
`GET /api/platform/provisioning/projects/{id}` — Plexon Collection dashboard BFF: `scanCount`, `domainScanCount`, `standaloneScanCount`, `geoJobCount`, recent domain/standalone/geo catalogs

## DS
Sibling `file:../../../msqdx-ui/packages/{ui,ui-tokens}` + barrels `lib/msqdx-ui*.ts`. Docker build clones the same sibling tree (see `Dockerfile`).
