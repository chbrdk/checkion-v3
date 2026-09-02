# API — Domain scan corpus pages (slim list)

## Status
Accepted — Wave 1 (2026-09-01)  
**Implements:** persona→page relevance for Plexon Assistant + AUDION site-topics port path  
**Depends:** `specs/domain/domain-scan-sections.md` (persisted corpus page scans)  
**Consumer:** Plexon `assistant-persona-page-relevance`, MCP `checkion_v3.domain_scan_pages_list`

## Purpose

Expose **every persisted corpus page** of a deep scan as a compact, paginated list — not only the 8-row `pageSamples` teaser on `DomainOverview`.

Answers: *Which URLs were scanned, with what coarse quality signals?*

## Endpoint

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/domain-scans/:domainScanId/pages` | Session or API token (same as other domain routes) |

### Query parameters

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `page` | int ≥ 1 | 1 | 1-based page index |
| `pageSize` | int | 25 | Max **100** |
| `sort` | enum | `score_asc` | `score_asc` \| `score_desc` \| `url_asc` \| `issues_desc` |
| `q` | string | — | Case-insensitive substring match on URL path/host |

### Response — `DomainCorpusPagesResult`

```typescript
interface DomainCorpusPageRow {
  url: string
  scanId: string                    // persisted `{domainId}-p{n}` when available
  overallScore: number | null
  errors: number
  warnings: number
  /** Subset of ScoreCard kinds for assistant tables */
  scores?: Partial<Record<
    'accessibility' | 'seo' | 'performance' | 'ux' | 'eco' | 'generative' | 'best_practices',
    number
  >>
  classification?: PageClassificationSnapshot | null
  /** Deep link path in CHECKION UI */
  resultsPath: string               // `/results/{scanId}/overview`
}

interface DomainCorpusPagesResult {
  domainScanId: string
  rootUrl: string
  status: ScanStatus
  pageCount: number                 // total corpus size (not just this page)
  items: DomainCorpusPageRow[]
  page: number
  pageSize: number
  totalPages: number
}
```

### Errors

| Code | When |
|------|------|
| 404 | Unknown `domainScanId` |
| 400 | Invalid `page` / `pageSize` / `sort` |

## Data source

1. Prefer `listDomainCorpusPageScans(domainScanId)` → join each row’s light overview (`getScanOverview(scanId)`).
2. Fallback (legacy jobs without persisted corpus rows): synthesize from `DomainOverview.pageSamples` + issue-scoped URLs — same rules as `domain-issue-pages.ts`. Mark response header `X-Checkion-Corpus-Mode: samples-only` when fallback used.

## Acceptance (EARS)

- **MUSS** jede persistierte Corpus-Page (`domainScanId` gesetzt, `mode: single`) in der Liste erscheinen, wenn `pageSize` und Pagination sie abdecken.
- **MUSS** pro Row mindestens liefern: `url`, `scanId`, `overallScore`, `errors`, `warnings`, `resultsPath`.
- **MUSS** `scores.accessibility` und `scores.seo` setzen, wenn im Overview vorhanden; andere Kinds optional.
- **MUSS** bei leerem Corpus `items: []`, `pageCount: 0` zurückgeben (kein 500).
- **WENN** `q` gesetzt ist, **MUSS** nur passende URLs zurückgegeben werden.
- **SOLANGE** Domain-Scan `status !== completed` ist, **MUSS** der Endpoint trotzdem partial corpus liefern (best-effort), sofern Page-Rows existieren.

## Non-goals (Wave 1)

- Full `bodyTextExcerpt`, saliency, journey overlays
- Persona scoring (Plexon-side LLM only)
- Write / mutate
- Cross-project listing (`projectId` filter on this route — use `domain_scans_list` first)

## Contract location

Add types to `@checkion-v3/contracts` (`DomainCorpusPageRow`, `DomainCorpusPagesResult`).

## MCP

`checkion_v3.domain_scan_pages_list` — see `specs/domain/mcp-server.md`.

## Tests

- Fixture deep scan with ≥ 3 corpus pages → list length, sort, pagination
- Legacy `pageSamples`-only domain → fallback + header
- Unknown id → 404
