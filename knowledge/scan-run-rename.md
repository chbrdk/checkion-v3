# Scan / domain run rename

**Date:** 2026-09-17  
**Specs:** `specs/domain/scan-run-rename.md` · `specs/api/scan-run-title.md`

## Behaviour
- Single-scan masthead: `scan.title` when set, else H1 / path; **Rename** → Dialog → `PATCH /api/scans/:id`.
- Domain masthead: `scan.title` when set, else host; **Rename** → Dialog → `PATCH /api/domain-scans/:id`.
- Project Runs lists use the same display name (`displayRunTitle`).

## Persistence
- Memory: `ScanSummary.title` / `DomainScanLight.title`
- Postgres: `payload.scan.title` / `payload.domain.title` (no new column)

## Code
| Piece | Path |
|-------|------|
| Normalize | `apps/web/lib/job-title.ts` (shared with GEO) |
| Display | `displayRunTitle` / `compactScanUrl` in `scan-display.ts` |
| Store | `updateScanTitle` / `updateDomainScanTitle` |
| UI | `JobTitleEditor` in WCAG + Domain magazine chrome |
