# Dummy / fixture mode — CHECKION v3

## Policy
Default local development uses **in-memory fixtures**. No crawler workers, no shared DB with CHECKION v2.

| Flag | Value |
|------|-------|
| `paths.dataSource` | `fixtures` |
| `paths.federationMode` | `dummy` (override with `CHECKION_FEDERATION_MODE=live`) |
| Persistence | Fixtures when `DATABASE_URL` unset; Postgres when set |
| Live scans | Off unless `DATABASE_URL` is set **or** `CHECKION_LIVE_SCANS=1`; force fixture with `CHECKION_LIVE_SCANS=0` |
| Live GEO | Off unless `DATABASE_URL` is set **or** `CHECKION_LIVE_GEO=1`; force fixture with `CHECKION_LIVE_GEO=0`. Live path requires `OPENAI_API_KEY`. |

## Corpus
- 3 projects (Bosch, Docs, Shop)
- Multiple single + deep scans with rich issue lists
- 2 domain crawls
- 2 GEO magazine jobs (`geo-1` Dürr competitive, `geo-2` shop PDP) with placement + query runs
- Sample share tokens (`sh_demo_single_1`, `sh_demo_domain_1`, `sh_demo_shop_cart`)
- Launch synthesizes a **completed** scan immediately (`synthesizeCompletedScan`) when live scans are off

## Store gate
`lib/fixtures/*-store.ts` → Postgres helpers under `lib/db/*` when `DATABASE_URL` is set; otherwise the seeded in-memory corpus above.

## Live scan pipeline (Phase 2)
When live scans are on (`shouldRunLiveScans()` in `lib/scan/live-scan-gate.ts`):

1. `POST /api/scans` creates a **queued** row, then runs Puppeteer + Pa11y + axe async (single) or delegates deep mode to domain start.
2. `POST /api/domain-scans` starts the spider (`lib/scan/spider.ts` + sitemap) and persists jsonb into `domain_scans`.
3. Results map through `lib/scan/adapt-scan-result.ts` into `@checkion-v3/contracts` overview/issues/scores.

Local live example (bundled Chromium via puppeteer):

```bash
export CHECKION_LIVE_SCANS=1
# optional: export DATABASE_URL=postgres://…
npm run dev -w web
curl -X POST http://localhost:3007/api/scans \
  -H 'content-type: application/json' \
  -d '{"projectId":"proj-1","mode":"single","url":"https://example.com"}'
```

CI / unit tests keep the fixture path (no browser). Inject stubs via `setSingleScanRunnerForTests` / `setDomainScanRunnerForTests`.

## Auth without Plexon
When `PLEXON_AUTH_URL` / `PLEXON_SERVICE_SECRET` are unset, middleware stays open and `/login` offers “Continue to app”.

## Federation
Live wiring is accepted (`specs/domain/plexon-federation.md`); keep fixtures as fallback for local and Staging Shell.

## Live GEO pipeline (Phase 3)
When live GEO is on (`shouldRunLiveGeo()` in `lib/geo-eeat/live-geo-gate.ts`):

1. `POST /api/geo-jobs` creates a **queued** row, then runs async: optional page scan (stage1) → EEAT/GEO-fitness LLM stages → OpenAI query×model runs → `finalizeGeoOverview()` (same `buildGeoPresence` + `buildGeoInsights` as fixtures).
2. Payload persists as `GeoOverview` jsonb on `geo_jobs`. Failures persist as `status: failed` (not empty `completed`).
3. Magazine UI `/geo/:id/...` shows an in-progress meter while `queued`/`running` and **polls** `GET /api/geo-jobs/:id` until finalize; empty completed shells are treated as failure, not a zeroed success magazine. Reading API remains `GET /api/geo-jobs/:id/reading`.

Local live example:

```bash
export CHECKION_LIVE_GEO=1
export OPENAI_API_KEY=sk-…
# optional: export DATABASE_URL=postgres://…
npm run dev -w web
curl -X POST http://localhost:3007/api/geo-jobs \
  -H 'content-type: application/json' \
  -d '{"projectId":"proj-demo-1","url":"https://example.com","queries":["best widgets"],"models":["gpt-5.4-nano"],"competitors":["rival.com"]}'
```

`projectId` may be omitted — the API resolves the first Collection project or auto-creates one from the URL host (federation company from session / `PLEXON_DEMO_COMPANY_ID`). There is no `companyId` field on GEO jobs.

CI / unit tests keep the fixture path (no OpenAI). Inject stubs via `setGeoPageScanRunnerForTests` / `setQueryRunChatClientForTests`. Seeded fixtures `geo-1` / `geo-2` / `geo-3` remain when live GEO is off.
