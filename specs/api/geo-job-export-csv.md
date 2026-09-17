# GEO job CSV export — CHECKION v3

## Status
Accepted.

## Endpoint
`GET /api/geo-jobs/:id/export` (`paths.routes.apiGeoJobExportCsv(id)`)

## Response
| Status | Body |
|--------|------|
| 200 | `text/csv; charset=utf-8` attachment |
| 404 | `{ "error": "not_found" }` |

### Headers (200)
| Header | Value |
|--------|--------|
| `Content-Type` | `text/csv; charset=utf-8` |
| `Content-Disposition` | `attachment; filename="checkion-geo-{id}.csv"` |
| `Cache-Control` | `no-store` |

Body starts with UTF-8 BOM (`U+FEFF`) so Excel opens umlauts correctly. First content line is `sep=;` (Excel auto-delimiter). Rows use CRLF. Field separator is **`;`** (German Excel). Newlines inside cells are flattened to spaces so **one physical spreadsheet row = one query×model cell**.

## Columns
Analysis-first order (builder: `apps/web/lib/geo-csv-export.ts`):

| Group | Columns |
|-------|---------|
| Cell keys | `query_index`, `query`, `model_id` |
| Placement | `hit` (`yes`/`no`), `our_position`, `first_domain`, `stolen_by`, `co_cited`, `target_mentioned` |
| Prompt | `prompt_intent`, `prompt_duel_outcome`, `prompt_hit_rate` |
| Evidence | `citations` (`domain@pos` joined by ` \| `), `citation_urls`, `search_queries`, `answer_text` |
| Job context | `job_id`, `job_title`, `target_host`, `url`, `measurement`, `search_market`, `completed_at`, `status`, `cited_share`, `overall_score`, `rivals` |
| EEAT scores | `eeat_experience` … `eeat_geo_fitness` (empty when no page reading) |

Rows are sorted by `query_index`, then `model_id`. Empty `queryRuns` → `sep=;` + header only.

## Auth
Same as other GEO **GET** detail routes: open in fixture / local mode. When Plexon auth is configured on mutating GEO routes, session/Bearer is not required for this read export in MVP (aligned with `GET /api/geo-jobs/:id`).

## UI
Magazine topbar → `GeoResultActions` **Export CSV**. Disabled while the job is `queued` / `running`.

## Spec
Domain: `specs/domain/geo-csv-export.md`
