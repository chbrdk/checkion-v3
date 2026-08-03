# API — Fetch page text (thin Chromium)

**Status:** Accepted — 2026-08-03  
**Route:** `POST /api/fetch-page` (`paths.routes.apiFetchPage`)  
**Consumer:** AUDION v3 project research crawl (blocked HTTP seed → Puppeteer text)

## Purpose

Return **plain page text** via the same Chromium stack as scans (`gotoForScan` + bot-guard), **without** axe/Pa11y/screenshot/SEO.

Not a substitute for `POST /api/scans`. Not a domain crawl.

## Auth

Same as scans: when Plexon auth is configured, `getRequestUser` (Bearer `checkion_…` or session). Middleware allows `/api/*` with Bearer; validation is in-route.

## Request

```json
{ "url": "https://example.com/page" }
```

- `url` required, `http:` / `https:` only  
- Private / loopback / link-local hosts rejected (SSRF)

## Response `200`

```json
{
  "url": "https://example.com/page",
  "finalUrl": "https://example.com/page",
  "title": "…",
  "bodyTextExcerpt": "…",
  "httpStatus": 200,
  "stubbed": false
}
```

- `bodyTextExcerpt`: normalized `document.body.innerText`, capped at `paths.fetchPageMaxChars` (6000)  
- `stubbed: true` when `shouldRunLiveScans()` is false (fixture excerpt; no Chromium)

## Errors

| Status | Meaning |
|--------|---------|
| 400 | Invalid / blocked host |
| 401 | Unauthorized (Plexon configured, no user) |
| 502 | Navigation / Chromium failure |

## Live gate

Uses `shouldRunLiveScans()` (`CHECKION_LIVE_SCANS` / `DATABASE_URL`) — same as WCAG scans.
