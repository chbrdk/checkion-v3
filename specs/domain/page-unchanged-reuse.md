# Deep-scan page reuse (unchanged)

**Status:** Accepted — 2026-09-30  
**Implements:** `apps/web/lib/scan/page-unchanged-check.ts`, `page-scan-cache`, spider `tryReuseOrRunFullScan`  
**Related:** `skipUnchangedPages` (default on)

## Problem

Reuse was too shy: many sites omit or mismatch `ETag`/`Last-Modified` on bare HEAD, cache rows were only written when headers existed, and missing screenshots forced a full Chromium+axe pass even when content was unchanged.

## Strategy (fail open → full scan)

Before `runScan` on a deep-scan URL (when `skipUnchangedPages`):

1. **Load** `page_scan_cache` for project + normalized URL (row may have headers **and/or** `contentFingerprint`).
2. **Conditional HTTP** with `If-None-Match` / `If-Modified-Since` (HEAD, fallback GET on 405/501):
   - `304` → unchanged
   - `200` + matching etag/LM (weak/strong normalized) → unchanged
   - clear header mismatch → changed
3. **Fingerprint fallback** when headers inconclusive and a prior fingerprint exists: cheap HTML GET (no Chromium), hash title+h1+body like `buildContentFingerprint`; match → unchanged.
4. **Reuse** prior slim result (`reusedUnchanged: true`). Screenshot copy is best-effort — **do not** require capture on disk to skip the lab pass.
5. After a full scan, **upsert cache** whenever headers **or** fingerprint are present.

## Opt-out

`skipUnchangedPages: false` on domain start / worker job.

## Acceptance

- Sites without cache headers still reuse when fingerprint matches.
- Conditional `304` counts as unchanged.
- Missing screenshot does not force a full re-scan when content is unchanged.
- Failures / unknown → full scan (no false “unchanged” that drops issues forever without evidence).
