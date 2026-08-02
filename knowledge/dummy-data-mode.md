# Dummy / fixture mode — CHECKION v3

## Policy
Default local development uses **in-memory fixtures**. No crawler workers, no shared DB with CHECKION v2.

| Flag | Value |
|------|-------|
| `paths.dataSource` | `fixtures` |
| `paths.federationMode` | `dummy` (override with `CHECKION_FEDERATION_MODE=live`) |
| Persistence | Fixtures when `DATABASE_URL` unset; Postgres when set |
| Live scans | Off unless `DATABASE_URL` is set **or** `CHECKION_LIVE_SCANS=1`; force fixture with `CHECKION_LIVE_SCANS=0` |

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

### GEO live LLM launch later
No job-create / worker path yet — GEO results are fixture-only (`lib/fixtures/geo-jobs.ts` → `finalize()` derives presence + insights). When live launch lands: accept target URL, queries, models, optional competitors → enqueue LLM queryRuns → same derive helpers.
