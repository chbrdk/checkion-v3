# Coolify — checkion-v3 scan-worker

**Project:** MSQDX-Checkion-v3  
**Spec:** `specs/domain/scan-worker.md`

| Item | Value |
|------|--------|
| App | `checkion-v3:scan-worker` |
| Coolify UUID | `abkibn5gtbcmwvwvwidmwigk` |
| FQDN | `https://abkibn5gtbcmwvwvwidmwigk.projects-a.plygrnd.tech` |
| Dockerfile | `/services/scan-worker/Dockerfile` (build context = repo root) |
| Port | **3011** |
| Health | `GET /health` → `{ "ok": true, "service": "checkion-scan-worker" }` |
| Server | projects-01 |
| Sibling | `checkion-v3:main-app` uuid `valb5m9m099d9k7i2d1xkv6p` · project `u10pr32wp2hw3u7vp7i5nsew` · env `kn2s2et64j2zqmacijuiuiku` |

**Note:** Worker runs via `tsx`. Install `installPuppeteerEsbuildNamePatch` in `scripts/run-scan-worker.ts` so `page.evaluate` survives esbuild `keepNames` (`__name`).

## Create (Coolify REST)

Same pattern as VIDEON stem-worker (`POST /applications/private-github-app` with team Bearer):

- Name: `checkion-v3:scan-worker`
- Git: `chbrdk/checkion-v3` branch `main`
- Dockerfile location: `/services/scan-worker/Dockerfile`
- Ports exposes: `3011`
- Always-on (no scale-to-zero)

After create: copy `DATABASE_URL` from main-app, set screenshot volume to the **same** path as main-app, then force-deploy.

## Env (worker)

```
DATABASE_URL=postgres://…          # same product DB as main-app
CHECKION_LIVE_SCANS=1
SCAN_SCREENSHOTS_PATH=/workspace/checkion-v3/data/screenshots
PUPPETEER_CACHE_DIR=/opt/puppeteer
PORT=3011
HOSTNAME=0.0.0.0
CHECKION_SCAN_WORKER_STALE_MS=120000   # optional
CHECKION_SCAN_WORKER_ABANDON_NO_PROGRESS_MS=600000  # optional: fail hung 0-page jobs
CHECKION_SCAN_WORKER_JOB_TIMEOUT_MS=1200000         # optional: domain wall-clock
DOMAIN_SCAN_CONCURRENCY=5              # parallel pages per domain job (worker image default 5)
# Optional: second scan-worker replica for parallel domain jobs (exclusive DB claim)
# Optional LLM for page classification (same as web):
# OPENAI_API_KEY=…
```

Mount the **same** Coolify **directory** file-storage on main-app and scan-worker:

| Field | Value |
|-------|--------|
| `fs_path` (host) | `/data/coolify/shared/checkion-v3-screenshots` |
| `mount_path` (container) | `/workspace/checkion-v3/data/screenshots` |
| Env | `SCAN_SCREENSHOTS_PATH=/workspace/checkion-v3/data/screenshots` |

Separate `persistent` volumes per app do **not** share files — screenshots written by the worker would be invisible to `GET /api/scans/:id/screenshot` on main-app.

**Do not** put `VOLUME […]` in the main Dockerfile for this path. An anonymous Docker volume can shadow Coolify’s bind and leave main-app on an empty disk while the worker writes to the shared host dir. Coolify file-storage is the only mount source of truth.

After attaching storage: **force-redeploy** (not restart-only) **both** apps so containers pick up the bind, then re-run a scan (captures from before the shared mount stay on the old ephemeral disk).

Worker `/health` includes `screenshots: { path, writable, jpegCount }` — use it to confirm the shared mount is writable and that JPEG count rises after a crawl.

## Wire main-app

On `checkion-v3:main-app` (`valb5m9m099d9k7i2d1xkv6p`) — **only after worker is healthy**:

```
CHECKION_SCAN_WORKER_MODE=external
```

Via Coolify REST: `PATCH /applications/{uuid}/envs/bulk` then redeploy main. Local/dev keeps default `inline` (omit env).

## Verify

```
curl -s https://<scan-worker-fqdn>/health
# {"ok":true,"service":"checkion-scan-worker","screenshots":{"path":"/workspace/checkion-v3/data/screenshots","writable":true,"jpegCount":N},...}

curl -s https://checkion-v3.projects-a.plygrnd.tech/api/health
# {"ok":true,"product":"checkion-v3","screenshots":{"path":"…","writable":true,"jpegCount":N},…}
# jpegCount on main-app should match worker after a shared-mount redeploy.
```

Enqueue a single or domain scan from Plexon / Checkion UI; worker logs should show claim + crawl; web UI stays responsive.
