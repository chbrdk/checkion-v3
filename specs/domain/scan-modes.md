# Scan modes — CHECKION v3

## Status
Accepted (Phase 2 — live single + domain pipelines)

## MVP modes
| Mode | Route | Result |
|------|-------|--------|
| `single` | `/scan` | `/results/[id]/{overview\|issues\|detail}` |
| `deep` | `/scan` | Same + `/domain/[id]/…` for light domain payload |

## Launch UX (single-first)
Magazine band on `/scan`:
- `Panel` + quiet `SectionChrome`
- `Hint panel` (dummy mode)
- `Field` / `Input` / `Select` / `Button`
- `TopStatus` ready · `LoadingText` submitting · `Alert` error
- Demo jump to fixture `scan-single-1`

## Live vs fixture (Phase 2)
- Gate: `lib/scan/live-scan-gate.ts` — live when `DATABASE_URL` **or** `CHECKION_LIVE_SCANS=1`; `CHECKION_LIVE_SCANS=0` forces synthesize.
- Live path: queued row → Puppeteer/Pa11y/axe (`lib/scan/scanner.ts`) or spider (`lib/scan/spider.ts`) → adapt → jsonb on `scans` / `domain_scans`.
- `POST /api/domain-scans` starts domain crawls; deep `POST /api/scans` delegates to the same start helper.
- Fixture synthesize remains for local demos and CI (no Chromium).

## Deferred
Journey agent live, GEO / E-E-A-T job UI, performance-as-primary tab, reuse-cache polish, competitor cron, normalized `scan_issues` tables.
