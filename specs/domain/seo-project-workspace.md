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
Project workspace SEO subnav + magazine chapter bodies (`@msqdx/ui`). Numbers always show provenance (`facets` hairline row: source · scope · time · mode). CTA on project magazine: **SEO**.

### Dashboard (Overview) — OpenSEO IA
`/projects/:id/seo` mirrors OpenSEO project dashboard:

1. Masthead **Dashboard**
2. Full-width **Set up your workspace** checklist (remaining steps; done as chips)
3. **2-column card grid**, data-first sort:
   - Search performance (GSC stats)
   - Site audit (Quality crawl top issues)
   - Backlink pulse (ref domains / new / lost)
   - Rank tracking summary
   - Domain overview KPIs
   - Competitors (empty → CTA)

Compose with `@msqdx/ui` magazine language: `Panel variant="card"|editorial` · `SectionChrome` · `KpiMetric` · `WidgetGrid` · `StatusDot`. Provenance as **hairline facet row** (label + value, square top rule — same language as project cover attrs), not soft Chips and not a single meta stamp string. **Not** `LabTile` / soft radius shells. Fixture SSOT: `lib/seo-market/dashboard-fixtures.ts`. Local preview: `apps/seo-dashboard-preview` (full width up to ~90rem).

### Chapter detail — magazine report depth
Each `/projects/:id/seo/:chapter` (except overview) is a **report chapter**, not a second dashboard:

1. Masthead = chapter title (no project·domain line; provenance via facets)
2. Hairline **facets** (source / range / mode)
3. Optional **search band** — Field/Select strip (Creation-quiet borders); recent chips
4. Optional **KPI strip** — one row on 12-col joined `WidgetGrid` + `KpiMetric`
5. Optional **charts** — `@msqdx/ui` `SeriesChart` / `Chart` only (no app-local chart libs)
6. Optional **ledger filters** — `ToggleGroup` (All · Dofollow · Nofollow · …)
7. **Primary ledger** — dense table; dual-line cells (`primary` + `secondary`); optional row tags; Score/Intent as `Chip` where used; optional pagination
8. Optional **Workbench** band — mutate actions only (prefer search band when the mutate is research/refresh)

### Keywords vs Rank tracking (no duplicate surfaces)
- **Keywords / Research** = discovery. Seed → ideas with demand economics (volume · CPC · competition · difficulty/score · intent) + live SERP snapshot. Does **not** own position history for the Collection domain.
- **Rank tracking / Ranks** = monitoring. Tracked set → current vs previous position, Δ, device, check cadence. Does **not** run keyword-idea research or SERP idea lists.
- Shared only: a keyword string may appear in both after the user promotes an idea into the tracked set. Cross-link via workbench/meta, never twin ledgers.

### Competitors vs Domain / Ranks (no duplicate surfaces)
- **Competitors** = competitive field via SERP overlap. Keyword set → rival domains that share rankings (overlap · avg rank · threat band) + battles they win. Does **not** show your organic footprint KPIs or your position Δ history.
- **Domain** = your organic footprint (traffic · cost · top keywords/pages).
- **Ranks** = your monitored keyword positions over time.
- Shared only: a rival host string may appear in Domain research when you refresh that host; never twin the overlap ledger onto Domain.

**Backlinks depth (OpenSEO-parity IA, MSQDX chrome):** DR · UR · Backlinks · Ref. domains → New/Lost + Ref-domain growth charts → TLD distribution → filter strip → referring-page ledger (title/URL, DR/UR, domains/links, anchor→target, type, first/last seen). Dense fixture until live DataForSEO backlink rows land.

**Rank tracking depth (monitor IA):** Search band (add-to-track · locale · location · Track & check + recent tracked) → KPI (monitored · top 10 · improved · declined) → **split**: main **position ledger** (dual keyword/URL · pos · prev · Δ · device · last check · filters Improved/Declined/Top 10 · pagination) · aside **Visibility over time** `SeriesChart` (invertY) + **Position distribution** + **Biggest movers**. No volume/CPC/intent columns (those live on Research). Track posts rank-configs + refresh; merges `latest` snapshots. Fixture SSOT until live checks land.

**Domain depth (OpenSEO overview IA):** Search band (domain · locale · location · Refresh + recent hosts) → KPI (organic KW · traffic · cost · pages) → **split**: main **Top keywords** ledger (dual keyword/URL · volume · pos · traffic · position-band filters · pagination) · aside **Organic traffic** `SeriesChart` + position distribution + **Top pages** dual-line list. Refresh posts `POST /api/projects/:id/seo/domain` and merges the snapshot into the chapter model; fixture SSOT until live DataForSEO.

**Keywords depth (research IA):** Search band (seed · locale · location · Research + recent seeds) → KPI (ideas · avg vol · CPC · comp) → **split**: main **idea ledger** (Volume · CPC · Comp · Score/Intent chips · intent filters · pagination) · aside **Search demand** `SeriesChart` + **SERP snapshot** dual-line list. No rank Δ / prev / device columns (those live on Ranks). Search posts research + SERP; merges into the chapter model. Fixture SSOT until live DataForSEO.

**Competitors depth (SERP-overlap IA):** Search band (keyword set · locale · location · Analyze + recent sets) → KPI (rivals · avg overlap · best avg rank · high threats) → **split**: main **rival ledger** (dual domain/shared-KW · overlap · avg rank · threat chips · High/Mid/Low filters · pagination) · aside **Overlap** bar `Chart` + **Competitive pressure** `SeriesChart` + **Battles they win** dual-line list. Analyze posts `POST /api/projects/:id/seo/competitors` (empty keywords → saved set); merges into the chapter model. Fixture SSOT until live DataForSEO.

Card **More details** deep-links: `gsc` · `backlinks` · `rank-tracking` · `domain` · `competitors` · `keywords`. Site audit → Quality scan launch (not a Market chapter).

Fixture SSOT: `lib/seo-market/chapter-fixtures.ts` · Overview: `dashboard-fixtures.ts`. Preview hash nav: `#gsc`, `#backlinks`, …

## Notifications
Rank refresh jobs: `resource: 'seo-market'`.
