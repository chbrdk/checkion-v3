# Fetch page (thin Chromium) — 2026-08-03

**Spec:** `specs/api/fetch-page.md`  
**Route:** `POST /api/fetch-page`  
**Lib:** `apps/web/lib/scan/fetch-page-text.ts` · URL guard `fetch-page-url.ts`

## Why

AUDION research HTTP crawl hits CloudFront **403** on some hosts (e.g. bosch-ebike.com with bot UAs). CHECKION already runs Puppeteer + bot-guard for scans; this endpoint reuses that stack for **text only**.

## Smoke

```bash
# Fixture (no Chromium)
curl -sS -X POST http://localhost:3007/api/fetch-page \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com"}'

# Live (CHECKION_LIVE_SCANS=1 or DATABASE_URL)
curl -sS -X POST https://checkion-v3.projects-a.plygrnd.tech/api/fetch-page \
  -H "Authorization: Bearer checkion_…" \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.bosch-ebike.com/de/"}'
```

## Tests

```bash
cd apps/web && npx vitest run __tests__/fetch-page.test.ts
```
