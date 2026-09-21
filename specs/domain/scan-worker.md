# Scan worker — CHECKION v3

## Status
Accepted (Phase 1 — WCAG single + domain/SEO crawls)

## Goal
Run Puppeteer/Pa11y crawls in a dedicated Coolify container so `checkion-v3:main-app` (Next.js) stays responsive. GEO LLM jobs remain on the web process.

## Modes

| `CHECKION_SCAN_WORKER_MODE` | Who executes crawls |
|-----------------------------|---------------------|
| `inline` (default) | Web process (local / fixture-friendly) |
| `external` | Always-on `checkion-v3:scan-worker` claims DB jobs |

Env key: `paths.envScanWorkerMode` = `CHECKION_SCAN_WORKER_MODE`.

## Job model
- **Single WCAG:** `scans` row `mode=single`, `status=queued` until claimed.
- **Deep / SEO domain:** `domain_scans` row `status=queued`; optional linked `scans` deep row (`payload.scan.domainScanId`). Job options (`maxPages`, `useSitemap`, `skipUnchangedPages`, `linkScanId`) live under `payload.job`.

Web in `external` mode: insert queued rows only — never call `startDomainScan` / `executeSingleLiveScan` / foreign-session stale fail.

## Claim + heartbeat
1. Worker polls Postgres for oldest eligible `queued` single or domain job.
2. Atomic claim → `running` + `payload.runtime.workerSessionId` + bump `updatedAt`.
3. Heartbeat: refresh `updatedAt` while crawling (≈15s).
4. Reclaim (worker only):
   - **Foreign session** (dead worker after restart/crash): mark `failed` (`scan_worker_abandoned`) immediately — do **not** resume a large crawl ahead of newer queued jobs (Plexon EQC poll ~765s for 50 pages).
   - **Stale heartbeat** (`updatedAt` older than `CHECKION_SCAN_WORKER_STALE_MS`, default **120000**): requeue, unless `pageCount=0` and age ≥ `CHECKION_SCAN_WORKER_ABANDON_NO_PROGRESS_MS` (default **600000**) → `failed`.
5. Domain wall-clock: `CHECKION_SCAN_WORKER_JOB_TIMEOUT_MS` or scaled default (`ceil(maxPages/3)*90s`, min 15m, max 45m) → cancel signal + fail.
6. Per-page: `DOMAIN_PAGE_SCAN_TIMEOUT_MS` (default **150000**) + `PUPPETEER_PROTOCOL_TIMEOUT_MS` (default **120000**) so one hung CDP call cannot burn 10 minutes.
7. Worker image sets `DOMAIN_SCAN_CONCURRENCY=3` (isolated from Next.js).

Web **must not** mark foreign sessions failed when mode=`external`.

Grace: `CHECKION_SCAN_WORKER_STALE_MS` (default **120000**).

## Coolify
| Item | Value |
|------|--------|
| App | `checkion-v3:scan-worker` |
| Dockerfile | `/services/scan-worker/Dockerfile` |
| Port | **3011** (health) |
| Health | `GET /health` → `{ ok, service: "checkion-scan-worker" }` |
| Server | projects-01 (same island as main-app) |

Shared with web: `DATABASE_URL`, `SCAN_SCREENSHOTS_PATH` volume, live-scan / LLM keys as needed for page classification.

Web Coolify: `CHECKION_SCAN_WORKER_MODE=external`.

## Paths
- Spec: this file
- Ops: `knowledge/staging-coolify-scan-worker.md`, `knowledge/scan-host-load.md`, `knowledge/paths.md`
- Code: `apps/web/lib/scan/scan-worker-mode.ts`, `apps/web/lib/scan/scan-worker-claim.ts`, `apps/web/scripts/run-scan-worker.ts`
