# SEO Project Workspace — CHECKION v3

## Status
Accepted — replaces the thin global `/seo` hub (`seo-market-workspace.md` superseded for IA).

## Purpose
OpenSEO-style **project-scoped Market SEO**: persisted keywords, rank configs/runs/snapshots, backlink history — under the Checkion Collection project. Vendor: DataForSEO (keywords/SERP/domain/competitors/backlinks/rank). Google only for GSC (first-party). Quality crawls stay on `POST /api/domain-scans`.

## Routes

| Surface | Path |
|---------|------|
| Overview | `/projects/:id/seo` |
| Keywords | `/projects/:id/seo/keywords` |
| Domain | `/projects/:id/seo/domain` |
| Backlinks | `/projects/:id/seo/backlinks` |
| Rank tracking | `/projects/:id/seo/rank-tracking` |
| Competitors | `/projects/:id/seo/competitors` |
| GSC | `/projects/:id/seo/gsc` |

Legacy `/seo` and `/seo/*` **redirect** to project picker or `/projects/:id/seo` when `projectId` query present.

## Launch
`/scan` SEO → **Quality crawl** (domain scan) or **Market** → `/projects/:projectId/seo` (requires project).

## Persistence (Postgres)
See `seo-market-program.md` + schema: `seo_saved_keywords`, `seo_keyword_metrics`, `seo_rank_configs`, `seo_rank_keywords`, `seo_rank_runs`, `seo_rank_snapshots`, `seo_backlink_snapshots`, `seo_domain_snapshots`. Access Model B via `projectId`.

## APIs
`/api/projects/:id/seo/*` — `specs/api/seo-project.md`.

## UI
Project workspace SEO subnav + data tables (`@msqdx/ui`). Numbers always show `source` + `fetchedAt`. CTA on project magazine: **SEO**.

## Notifications
Rank refresh jobs: `resource: 'seo-market'`.
