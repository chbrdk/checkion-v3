# Paths — CHECKION v3

## Dev
- Web: `http://localhost:3007` (`paths.devPort`)
- Routes: only via `apps/web/lib/paths.ts`
- Runtime env helpers: `apps/web/lib/runtime-config.ts`

## Staging (Coolify)
- Public: `https://checkion-v3.projects-a.plygrnd.tech` (`URL_CHECKION_V3`)
- Scan worker: Coolify app `checkion-v3:scan-worker` uuid `abkibn5gtbcmwvwvwidmwigk` · FQDN `https://abkibn5gtbcmwvwvwidmwigk.projects-a.plygrnd.tech` · Dockerfile `/services/scan-worker/Dockerfile` · port **3011** · ops `knowledge/staging-coolify-scan-worker.md` · spec `specs/domain/scan-worker.md`
- plexon-v3: `https://plexon-v3.projects-a.plygrnd.tech`
- Central Assistant flyout: AppShell `PlatformAssistantHost` → `{plexon}/assistant/embed` (+ `theme` / `assistant:theme`) · `plexon-v3/specs/domain/central-assistant-flyout.md`
- Product launcher: BrandCorner → `ShellBrandCorner` / `lib/platform-product-switcher.ts`; staging fallbacks in `paths.ecosystemStaging*` when `NEXT_PUBLIC_*_URL` unset
- Attach runbook: `knowledge/staging-coolify.md`
- **Operator (after smoke):** on **plexon-v3** Coolify set `NEXT_PUBLIC_CHECKION_URL=https://checkion-v3.projects-a.plygrnd.tech` so Collection dashboard / registry deep-links target v3 (do not leave prod `checkion.projects-a…`). See `plexon-v3/knowledge/coolify-v3-staging-runbook.md` §4.3 Wave B note.
- Image: root `Dockerfile` fetches sibling `chbrdk/msqdx-ui` at pinned `MSQDX_UI_REF` (`af801ee72b2cfd763d0c50d8256de3b360889998` as of Sep 2026 — includes `SeriesChart` + `LabTile`) into `/workspace/msqdx-ui` (same layout as local `GITHUB/checkion-v3` + `GITHUB/msqdx-ui`). Bump the SHA when barrels need newer primitives — floating `main` clone layers go stale on Coolify and break `lib/msqdx-ui.ts` (e.g. missing `CardActions` / `ChatOverlay` / `LabTile` / `SeriesChart`). Pin must include `ChatOverlay` + `LabTile` + `SeriesChart`; Docker strips DS `node_modules` and symlinks app `node_modules` during build (`msqdx-ui/knowledge/react-types-dedupe.md`).
- Entrypoint: `scripts/docker-entrypoint.sh` (optional drizzle push; AUTH_SECRET required only when Plexon auth configured)

## Env
| Key | Purpose |
|-----|---------|
| `NEXT_PLEXON_BASE_URL` | plexon-v3 base (federation + knowledge pack + assistant embed); falls back to `PLEXON_AUTH_URL` if unset |
| `NEXT_PUBLIC_PLEXON_URL` | Optional public plexon origin for assistant iframe + product launcher (falls back to `NEXT_PLEXON_BASE_URL` / `PLEXON_AUTH_URL`) |
| Service path | `GET /api/platform/provisioning/accessible-collections` — Collections the user may see (access model B); used by product project + run lists (`specs/domain/access-model-b-visibility.md`) |
| Access Model B | Spec `specs/domain/access-model-b-visibility.md` · ops `knowledge/access-model-b-visibility.md` · sibling audit `knowledge/access-model-b-sibling-audit.md` |
| Project team | Spec `specs/domain/project-team.md` · BFF `/api/projects/:id/members` · `/invites` · Plexon SSOT · outbound mail = Plexon only (`plexon-v3/specs/domain/transactional-email.md`) |
| `NEXT_PUBLIC_CHECKION_URL` | Public checkion-v3 URL (product launcher + deep-links) |
| `NEXT_PUBLIC_AUDION_URL` | Optional AUDION origin for BrandCorner product launcher |
| `NEXT_PUBLIC_BRANDION_URL` | Optional BRANDION origin for product launcher |
| `NEXT_PUBLIC_CREATION_URL` | Optional CREATION origin for product launcher |
| `NEXT_PUBLIC_ECHON_URL` | Optional ECHON origin for product launcher |
| `PLEXON_AUTH_URL` | plexon-v3 auth base for validate-credentials (often same as plexon base) |
| `PLEXON_SERVICE_SECRET` | Shared service secret for auth + federation |
| `NEXT_PUBLIC_PLEXON_REGISTER_URL` | Optional public Plexon register page |
| `AUTH_SECRET` | NextAuth JWT secret (≥32 chars; required when Plexon auth configured in Docker) |
| `DATABASE_URL` | Product Postgres; when unset, stores use in-memory fixtures. Also enables live scans / live GEO unless the matching `CHECKION_LIVE_*=0` flag is set |
| `CHECKION_LIVE_SCANS` | `1` force live Puppeteer pipeline; `0` force fixture synthesize |
| `CHECKION_LIVE_GEO` | `1` force live GEO LLM pipeline; `0` force fixture synthesize |
| `CHECKION_SCAN_WORKER_MODE` | `inline` (default, web executes crawls) or `external` (DB claim by scan-worker). Spec: `specs/domain/scan-worker.md` |
| `CHECKION_SCAN_WORKER_STALE_MS` | Worker-only stale reclaim grace (default 120000) |
| `CHECKION_SCAN_WORKER_ABANDON_NO_PROGRESS_MS` | Fail foreign/stale 0-page jobs after this age (default 600000) |
| `CHECKION_SCAN_WORKER_JOB_TIMEOUT_MS` | Domain job wall-clock in worker (default 1200000) |
| `PUPPETEER_CACHE_DIR` | Docker runner: `/opt/puppeteer` (Chrome installed at image build). Optional local override |
| `PUPPETEER_EXECUTABLE_PATH` | Optional; only if using system Chromium instead of Puppeteer-bundled Chrome |
| `PUPPETEER_SKIP_DOWNLOAD` | Image builder skips npm Chrome download; runner installs via `npx puppeteer browsers install chrome`. Do not set `true` in Coolify for the Docker build |
| `OPENAI_API_KEY` | Required for live GEO LLM stages + queryRuns |
| `OPENAI_MODEL` | Optional default model (default `gpt-5.4-nano`) |
| `CHECKION_FEDERATION_MODE` | `dummy` (default) or `live` |
| `SCAN_SCREENSHOTS_PATH` | Directory for live scan JPEG captures (default `data/screenshots` under cwd). On Coolify, point at a persistent volume so redeploys do not drop captures |
| `PLEXON_DEMO_OWNER_USER_ID` | Fallback owner for origin registration without session |
| `PLEXON_DEMO_COMPANY_ID` | Fallback company for origin registration without session |

## Auth
Login `/login` · NextAuth `/api/auth/*` · Plexon `validate-credentials` — see `specs/domain/plexon-federation.md`.
API tokens (MCP/CLI): Settings → API tokens · `specs/domain/settings-api-tokens.md`.

## MCP (checkion-v3)
- Package: `mcp-server/` · Spec `specs/domain/mcp-server.md` · Ops `knowledge/mcp-server.md`
- Tools prefix: `checkion_v3.*` (distinct from CHECKION v2 `checkion.*`)
- Local HTTP: `http://localhost:3100` (`MCP_PORT`)
- Staging: `URL_CHECKION_V3_MCP` = `https://checkion-v3-mcp.projects-a.plygrnd.tech` (Coolify `checkion-v3-mcp`, uuid `fkwhbjlpy715henc7fcbwj2y`)
- Env: `CHECKION_API_URL` (= `URL_CHECKION_V3`), `CHECKION_API_TOKEN` (Settings Bearer)

## Federation
Contract id: `2026-05-plexon-federation-v3` — live wiring accepted; keep `dummy` for fixture-only local / Staging Shell.

## WCAG detectors (axe / pa11y)
- Version pins + upgrade notes: `knowledge/wcag-detector-versions.md`
- Axe rule docs: `paths.remediationAxeRulesBase` = `https://dequeuniversity.com/rules/axe/4.13`
- WCAG quickref: `paths.remediationWcagQuickref` = `https://www.w3.org/WAI/WCAG21/quickref/`

## Central launch (`/scan`)
- Route: `/scan` (`paths.routes.scan`) — capability-first magazine form (`ScanLaunchForm`): **SEO · GEO · WCAG**
- Primary tiles: SEO · GEO · WCAG; WCAG reveals secondary **Quick single** · **Deep scan** (`ToggleGroup`)
- Deep-link helper: `paths.routes.scanLaunch({ projectId, mode: 'seo'|'geo'|'single'|'deep', url, measurement?, … })` — GEO `measurement=recall|live|both`
- Modes:
  - `mode=seo` → `POST /api/domain-scans` → `/domain/:id/overview` (SEO coverage chapter)
  - `mode=geo` → `POST /api/geo-jobs` → `/geo/:id/overview` (visible URL and/or company name + Project; optional `measurement=recall|live|both` — both starts two jobs; Project defaults empty — select / create, or auto-create on submit when omitted; optional `companyName` on GEO body — see `scan-modes.md` · `geo-measurement-layers.md`)
  - `mode=single` → WCAG Quick single → `POST /api/scans` → `/results/:id/overview`
  - `mode=deep` → WCAG Deep scan → `POST /api/scans` (+ domain payload, optional `maxPages`) → `/results/:id/overview`
  - Deep / SEO page cap: `lib/scan/domain-scan-max-pages.ts` (presets 50–1000 + All 10000; default 1000) — Select on compose when Deep or SEO
- Spec: `specs/domain/scan-modes.md`

## Domain scan corpus pages (Wave 1)
- API: `GET /api/domain-scans/:id/pages` — `paths.routes.apiDomainScanPages(id)` · spec `specs/api/domain-scan-pages.md`
- Service: `apps/web/lib/domain-corpus-pages.ts` · MCP `checkion_v3.domain_scan_pages_list`
- Response header `X-Checkion-Corpus-Mode`: `corpus` | `samples-only` (legacy jobs without persisted page rows)

## GEO routes
- Launch: `/scan?mode=geo` (canonical create entry; index `/geo` catalogs finished jobs)
- Magazine: `/geo/:id/overview` · `/queries` (Placement nav deferred; legacy `/placement` redirects to Queries)
- Queries deep-link: `/geo/:id/queries?q=<prompt>&model=<modelId>` (`paths.routes.geoQueriesPrompt`)
- Suggest (launch): `POST /api/geo/suggest-queries` (`paths.routes.apiGeoSuggestQueries`) — body `{ url?, companyName?, project?, projectId?, platformProjectId?, knowledge?, existing?, max? }`; server pulls Collection Knowledge Pack in live federation when Collection bound; fixture pool without `OPENAI_API_KEY`; OpenAI when set
- Create: `POST /api/geo-jobs` prefill competitors / seed queries from pack when Collection bound
- Publish: `POST /api/geo-jobs/:id/publish-knowledge` (`paths.routes.apiGeoJobPublishKnowledge`) — geo_context + competitive merge to plexon-v3
- CSV export: `GET /api/geo-jobs/:id/export` (`paths.routes.apiGeoJobExportCsv`) — one row per query×model cell + answers/citations/presence/EEAT · `specs/api/geo-job-export-csv.md` · magazine CTA in `GeoResultActions`
- Rename: `PATCH /api/geo-jobs/:id` `{ title }` (`paths.routes.apiGeoJobDetail`) — masthead **Rename** · `specs/api/geo-job-title.md` · shows on project GEO runs list

- Collection Knowledge Pack: `apps/web/lib/plexon-knowledge-pack.ts` · `specs/domain/geo-knowledge-consume.md` · Soft-skip marks facet freshness via Plexon `…/facets/:facetId/freshness` · Plexon SoT `plexon-v3/specs/domain/collection-knowledge-pack.md`
- Model catalog (launch picker): `apps/web/lib/geo/model-catalog.ts` — OpenAI / Anthropic / Google; UI = selected chips + Add dialog (`GeoModelPicker`); Anthropic catalog ids are live (`ANTHROPIC_API_KEY`); `modelsForLaunch` still drops remaining Soon (Gemini extras) (`specs/domain/geo-model-catalog.md`)
- Live GEO: `CHECKION_LIVE_GEO` + provider keys (see `knowledge/dummy-data-mode.md`). `POST /api/geo-jobs` `measurement`: `recall` (default, ungrounded) or `live` (Responses / Claude / Gemini web search). Launch tiles are multi-select — both = two jobs. Same switch on Plexon Quick Scan. `specs/domain/geo-measurement-layers.md`
- Layer 2 search cost dial (defaults; Coolify runtime env optional): `CHECKION_GEO_OPENAI_SEARCH_CONTEXT_SIZE` (`medium`) · `CHECKION_GEO_OPENAI_MAX_TOOL_CALLS` (`3`) · `CHECKION_GEO_ANTHROPIC_MAX_USES` (`3`) — `lib/geo/live-search-limits.ts` · `paths.openaiGeo*` / `paths.anthropicGeo*`
- Gemini generateContent base: `paths.geminiApiBase` (`https://generativelanguage.googleapis.com/v1beta`) — never inline in runners
- Anthropic hosted search tool type: `paths.anthropicWebSearchTool`

## Share
Public landing: `/share/[token]` · API `/api/share`

## Scan screenshots
- Persist: Puppeteer JPEG via `lib/scan/screenshot-storage.ts` under `SCAN_SCREENSHOTS_PATH` (default `data/screenshots`)
- Serve: `GET /api/scans/:id/screenshot` (`paths.routes.apiScanScreenshot`) — keyed by DB scan id; falls back to file key embedded in overview `screenshotUrl` for older UUID-named files
- Issues canvas / detail `<img>` uses `overview.screenshotUrl` → that API path
- Missing file → SVG placeholder (`X-Screenshot: placeholder`), not a broken image

## Cross-product deep-link (AUDION → single-page scan)
- Launch: `paths.routes.scanLaunch({ projectId, mode: 'single', url, platformProjectId?, audionRunId?, stepUrl? })` → `/scan?projectId=&mode=single&url=`
- Prefills project, mode, URL; optional AUDION correlation posted on launch; handoff **locks** to WCAG Quick single (no deep / GEO / SEO)
- After submit → `/results/[id]/overview` (`paths.routes.resultSection`)
- Machine: `POST /api/scans` with Bearer `checkion_…` + optional `platformProjectId` / `audionRunId` / `stepUrl` (persisted on `ScanSummary` / payload jsonb)
- Thin page text (AUDION research fallback): `POST /api/fetch-page` (`paths.routes.apiFetchPage`) — Chromium `innerText` only, no WCAG — `specs/api/fetch-page.md` · `knowledge/fetch-page-2026-08-03.md`
- Domain: `specs/domain/audion-journey-scan-trigger.md` · AUDION companion `audion-v3/specs/domain/checkion-single-scan-trigger.md`
- Staging base for AUDION links: `NEXT_PUBLIC_CHECKION_URL` / `URL_CHECKION_V3` = `https://checkion-v3.projects-a.plygrnd.tech`

## Projects
- Route: `/projects` (`paths.routes.projects`) — magazine collection hub (plexon-v3 Collection card composition)
- Detail: `/projects/:id` (`paths.routes.projectDetail`) — magazine cover · corpus pulse · single/domain/GEO chapter lists · **GEO History** (`paths.routes.projectGeoHistory` → `?chapter=geo-history`)
- Deep-link: `/projects?platformProjectId=` → bound detail or create dialog
- API: `GET/POST /api/projects` · `GET/PATCH /api/projects/:id` · `POST /api/projects/:id/archive` (global Collection archive; `DELETE` = archive alias)
- GEO history: `GET /api/projects/:id/geo-history` (`paths.routes.apiProjectGeoHistory`) — soft-match position series · `specs/api/geo-position-history.md` · `knowledge/geo-position-history.md`
- Plexon lifecycle: `PATCH {NEXT_PLEXON_BASE_URL}/api/platform/provisioning/projects/:platformProjectId` `{ status: archived }` (`paths.plexonProvisioningProjectPath`)

## Results
- Index `/results` redirects home (no rail entry / no scan ledger) — discovery via Home, Projects, job notifications
- Magazines: `/results/:id/{overview|issues|detail}` (`paths.routes.resultSection`)
- Rename WCAG run: `PATCH /api/scans/:id` `{ title }` (`paths.routes.apiScanDetail`) — masthead **Rename** · `specs/api/scan-run-title.md` · project Runs list uses same title
- Domain magazines: `/domain/:id/{overview|issues|detail}` (`paths.routes.domainSection`)
- Rename deep crawl: `PATCH /api/domain-scans/:id` `{ title }` (`paths.routes.apiDomainScanDetail`) — same title rules as WCAG / GEO
- Spec: `specs/domain/project-workspace.md`

## Settings
- Route: `/settings` (`paths.routes.settings`) — Account, Profile, Appearance, Language, API tokens, Federation via `@msqdx/ui` `SettingsShell`
- Spec: `specs/domain/settings.md` · composition mirrors audion-v3 / plexon-v3 section bands
- Prefs keys: `checkion.v3.displayName` · `checkion.v3.themePreference` (`light`|`dark`|`auto`) · `checkion.v3.locale`
- Cross-app sync: `GET`/`PATCH` `/api/prefs/profile` → Plexon service profile (`locale`, `themePreference`)
- UI locale (SET-L1): `apps/web/lib/i18n.ts` · `apps/web/locales/{en,de}.json` · `knowledge/i18n.md` — chrome via `useUserPrefs().t`
- Help tips (bilingual en/de via locale): `apps/web/lib/help-tips.ts` · `apps/web/components/help-tip.tsx` · spec `specs/domain/help-tips.md` · DS `InfoTip` from `@msqdx/ui`

## API tokens
Settings CRUD: `/api/tokens` · verify `/api/tokens/verify` · store `api-tokens-store` / Drizzle `api_tokens` · `knowledge/settings-api-tokens.md` · Bearer machine clients on selected APIs (`POST /api/scans`, `POST /api/geo-jobs`, `POST /api/projects`)
Profile prefs: `GET`/`PATCH` `/api/prefs/profile` (Plexon `locale` + `themePreference`)

## Federation / Collection summary
`GET /api/platform/provisioning/projects/{id}` — Plexon / METRON Collection dashboard BFF: catalogs + `latestCompletedScan` + `scoreHistory` + `latestDomainHealth` / `latestGeoDepth` (through Wave E: corpus pages, queryRuns, position cells) for METRON suite sync.

## DS
Sibling `file:../../../msqdx-ui/packages/{ui,ui-tokens}` + barrels `lib/msqdx-ui*.ts` (deep `src/` re-exports, not package `dist`). Docker build pins the same sibling tree via `MSQDX_UI_REF` (see `Dockerfile`).
