# Scan host load (UI slow during Plexon-triggered scans)

Stand: **2026-09-21**

## Symptom

Triggering a domain / deep scan from Plexon (or Checkion UI) makes **checkion-v3** feel extremely slow until the crawl finishes.

## Cause

Live scans historically ran **in-process** inside the Next.js container (`apps/web/lib/scan/spider.ts` → `runScan` → Puppeteer). Parallel Chromium + Puppeteer 25 starved CPU/RAM on the shared host.

## Mitigations

1. **One Chromium per domain crawl** + default `DOMAIN_SCAN_CONCURRENCY=1` — see `lib/scan/domain-scan-concurrency.ts`.
2. **Dedicated scan-worker container** (preferred for staging): `CHECKION_SCAN_WORKER_MODE=external` on web; crawls run in `checkion-v3:scan-worker`. Spec: `specs/domain/scan-worker.md` · ops: `knowledge/staging-coolify-scan-worker.md`.

```
DOMAIN_SCAN_CONCURRENCY=2
DOMAIN_SCAN_DELAY_MS=500
```

Tests: `apps/web/__tests__/domain-scan-concurrency.test.ts`, `apps/web/__tests__/scan-worker-mode.test.ts`
