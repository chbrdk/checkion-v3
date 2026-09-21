# Scan host load (UI slow during Plexon-triggered scans)

Stand: **2026-09-21**

## Symptom

Triggering a domain / deep scan from Plexon (or Checkion UI) makes **checkion-v3** feel extremely slow until the crawl finishes.

## Cause

Live scans run **in-process** inside the Next.js container (`apps/web/lib/scan/spider.ts` → `runScan` → Puppeteer).

Previously the spider could open **up to 3 Chromium processes in parallel** (`DOMAIN_SCAN_CONCURRENCY` default `3`), each via its own `puppeteer.launch()`. That starved CPU/RAM on the shared `projects-01` host, so HTTP/UI latency spiked. Puppeteer 25 Chrome made this worse than older stacks.

## Fix

1. **One Chromium per domain crawl** — spider launches `launchStandaloneScanBrowser()` once and passes `sharedBrowser` into every page `runScan` (same pattern as multi-device single scans).
2. **Default concurrency = 1** — `resolveDomainScanConcurrency()` in `lib/scan/domain-scan-concurrency.ts`. Raise only when the container has spare capacity:

```
DOMAIN_SCAN_CONCURRENCY=2
DOMAIN_SCAN_DELAY_MS=500
```

3. Ops: prefer mounting screenshot volume + enough spare RAM (~512MB+ per Chrome) — see `knowledge/staging-coolify.md` § Chromium.

Tests: `apps/web/__tests__/domain-scan-concurrency.test.ts`
