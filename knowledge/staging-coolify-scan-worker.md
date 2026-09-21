# Coolify — checkion-v3 scan-worker

**Project:** MSQDX-Checkion-v3  
**Spec:** `specs/domain/scan-worker.md`

| Item | Value |
|------|--------|
| App | `checkion-v3:scan-worker` |
| Dockerfile | `/services/scan-worker/Dockerfile` |
| Port | **3011** |
| Health | `GET /health` → `{ "ok": true, "service": "checkion-scan-worker" }` |
| Server | projects-01 |

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

On `checkion-v3:main-app`:

```
CHECKION_SCAN_WORKER_MODE=external
```

Redeploy web after setting. Local/dev keeps default `inline` (omit env).

## Verify

```
curl -s https://<scan-worker-fqdn>/health
# {"ok":true,"service":"checkion-scan-worker"}
```

Enqueue a single or domain scan from Plexon / Checkion UI; worker logs should show claim + crawl; web UI stays responsive.
