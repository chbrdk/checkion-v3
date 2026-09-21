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
DOMAIN_SCAN_CONCURRENCY=1              # optional
# Optional LLM for page classification (same as web):
# OPENAI_API_KEY=…
```

Mount the **same** persistent volume as main-app for `SCAN_SCREENSHOTS_PATH`.

## Wire main-app

On `checkion-v3:main-app` (`valb5m9m099d9k7i2d1xkv6p`) — **only after worker is healthy**:

```
CHECKION_SCAN_WORKER_MODE=external
```

Via Coolify REST: `PATCH /applications/{uuid}/envs/bulk` then redeploy main. Local/dev keeps default `inline` (omit env).

## Verify

```
curl -s https://<scan-worker-fqdn>/health
# {"ok":true,"service":"checkion-scan-worker",...}
```

Enqueue a single or domain scan from Plexon / Checkion UI; worker logs should show claim + crawl; web UI stays responsive.
