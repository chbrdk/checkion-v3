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

Body starts with UTF-8 BOM (`U+FEFF`) so Excel opens umlauts correctly. Rows use CRLF. Fields follow RFC 4180 quoting. Cells that look like spreadsheet formulas (`=`, `+`, `-`, `@`) are prefixed with a leading apostrophe.

## Columns
Stable header order (builder: `apps/web/lib/geo-csv-export.ts`):

**Job / presence / EEAT (repeated per row)**  
`job_id`, `job_title`, `project_id`, `url`, `target_host`, `status`, `measurement`, `search_market`, `completed_at`, `overall_score`, `cited_share`, `query_count`, `model_count`, `competitors`, `models`, `lede`, `solo_cited_share`, `solo_miss_rate`, `solo_avg_position`, `solo_first_cite_rate`, `solo_mentioned_share`, `field_leader_domain`, `field_gap_to_lead`, `rival_source`, `rivals`, `eeat_experience`, `eeat_expertise`, `eeat_authoritativeness`, `eeat_trustworthiness`, `eeat_geo_fitness`, `eeat_missing_elements`

**Per queryRun**  
`query_id`, `query`, `model_id`, `answer_text`, `our_position`, `citations`, `citation_urls`, `citation_contexts`, `search_queries`, `first_domain`, `rival_domains_in_answer`, `co_cited`, `stolen_by`, `target_mentioned_in_answer`, `prompt_intent`, `prompt_duel_outcome`, `prompt_target_hit_rate`

List fields use `; ` separators. `citations` is `domain@position` joined the same way.

## Auth
Same as other GEO **GET** detail routes: open in fixture / local mode. When Plexon auth is configured on mutating GEO routes, session/Bearer is not required for this read export in MVP (aligned with `GET /api/geo-jobs/:id`).

## UI
Magazine topbar → `GeoResultActions` **Export CSV**. Disabled while the job is `queued` / `running`.

## Spec
Domain: `specs/domain/geo-csv-export.md`
