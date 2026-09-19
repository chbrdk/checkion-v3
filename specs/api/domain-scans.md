# API — Domain scans

## Status
Accepted (Phase 1)

## Endpoints
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/domain-scans?projectId=` | Light list |
| GET | `/api/domain-scans/:id` | `DomainScanLight` |
| PATCH | `/api/domain-scans/:id` | Rename — `{ title }` (1–120) → `DomainScanLight` — see `scan-run-title.md` |
| GET | `/api/domain-scans/:id/overview` | Light overview |
| GET | `/api/domain-scans/:id/issues` | Paginated/grouped later |
| GET | `/api/domain-scans/:id/pages` | Corpus page slim list — see `domain-scan-pages.md` |

No mega-JSON hydrate in MVP.

## POST `/api/domain-scans`

| Field | Required | Notes |
|-------|----------|-------|
| `projectId` | yes | |
| `url` | yes | Root URL |
| `maxPages` | no | Page cap — presets 50 / 100 / 250 / 500 / 1000 or “All” (10000). Default 1000 via `resolveDomainScanMaxPages` (`lib/scan/domain-scan-max-pages.ts`). |
| `useSitemap` | no | |
| `waitForCompletion` | no | |
| `skipUnchangedPages` | no | |
