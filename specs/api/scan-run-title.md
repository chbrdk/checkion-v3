# Scan / domain run title (rename) — CHECKION v3

## Status
Accepted.

## Endpoints

| Method | Path | Notes |
|--------|------|-------|
| PATCH | `/api/scans/:id` | Rename single-page scan (`paths.routes.apiScanDetail`) |
| PATCH | `/api/domain-scans/:id` | Rename deep crawl (`paths.routes.apiDomainScanDetail`) |

## Body
```json
{ "title": "Homepage WCAG — Q3" }
```

| Field | Required | Notes |
|-------|----------|--------|
| `title` | yes | Trimmed; 1–120 chars |

## Response
| Status | Body |
|--------|------|
| 200 | Updated `ScanSummary` or `DomainScanLight` |
| 400 | `{ "error": "invalid_title" }` |
| 404 | `{ "error": "not_found" }` |

## Auth
When Plexon auth is configured, require session / Bearer (same as other mutating scan routes).

## Spec
Domain: `specs/domain/scan-run-rename.md`
