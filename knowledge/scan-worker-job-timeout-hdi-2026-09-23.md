# Scan worker job timeout — HDI deepscan (2026-09-23)

## Symptom
Domain scan `domain-1790177017176` (`https://www.hdi.de/`, `maxPages=1000`) failed with:

```
scan_worker_job_timeout after 2700000ms
```

Worker logs showed crawl progress around **345/1000** when the 45-minute wall-clock fired. A later Vaillant job (`domain-1790179057185`) completed normally.

## Cause
Default domain job timeout scaled as `ceil(maxPages/3)*90s` but was **capped at 45m** (`2_700_000`). Default deepscan `maxPages` is **1000**, so every large crawl hit the cap. Observed HDI pace (~7–8 pages/min with concurrency 5) needs ~2+ hours for 1000 pages.

## Fix
- Raise scaled max to **6h** (`21_600_000`) in `resolveScanWorkerJobTimeoutMs`.
- Spec / paths / staging notes updated accordingly.
- Optional Coolify override: `CHECKION_SCAN_WORKER_JOB_TIMEOUT_MS`.

## Follow-up
Re-queue the HDI deepscan from Checkion/Plexon after the scan-worker redeploy.
