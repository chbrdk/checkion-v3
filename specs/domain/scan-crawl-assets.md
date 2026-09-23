# Domain crawl — skip non-HTML assets

**Status:** Accepted — 2026-09-23  
**Code:** `apps/web/lib/scan/crawlable-url.ts` · wired in `spider.ts`

## Problem

Deep scans (e.g. hdi.de) followed press PDFs, JPGs, ZIPs under `/mediaservice/` and `/media/pdf/`. Puppeteer then hit `domain_page_scan_timeout` / screenshot timeouts and burned the job wall-clock.

## Rule

Only **HTML page URLs** are crawled. Before enqueue and before navigation, skip when:

1. Path/query ends with a known binary/media extension (`.pdf`, `.jpg`, `.zip`, fonts, audio/video, …), or
2. Pathname contains download/media markers (`/mediaservice/`, `/media/pdf/`, `/downloads/`, …).

Skipped URLs are marked visited so they are not retried; they do **not** count toward `maxPages`.

## Non-goals

- Full MIME sniffing on every link (costly). Path/extension heuristics cover the HDI/Vaillant failure mode.
- Changing single-page scan of an explicit user-pasted PDF URL (start URL still scanned if the operator asked for that URL alone).

## Concurrency

Page parallelism inside one domain job: `DOMAIN_SCAN_CONCURRENCY` (worker image default **5**).  
Parallel **domain jobs**: scale additional `checkion-v3:scan-worker` replicas (claim is exclusive per job).
