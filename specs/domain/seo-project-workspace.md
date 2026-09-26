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
See `seo-market-program.md` + schema: `seo_saved_keywords`, `seo_keyword_metrics`, `seo_rank_configs`, `seo_rank_keywords`, `seo_rank_runs`, `seo_rank_snapshots`, `seo_backlink_snapshots`, `seo_domain_snapshots`, `seo_competitor_snapshots`. Access Model B via `projectId`.

## APIs
`/api/projects/:id/seo/*` — `specs/api/seo-project.md`.

## UI
Project workspace SEO subnav + magazine chapter bodies (`@msqdx/ui`). Numbers always show provenance (`facets` hairline row: source · scope · time · mode). CTA on project magazine: **SEO**.

**Locale:** All Market SEO chrome (nav, dashboard, chapter titles, search band, ledger, empty CTAs) is bilingual via `seoMarket.*` keys in `apps/web/locales/{en,de}.json`. Live shells pass `useT()` into `emptySeoChapter` / `emptySeoDashboard` and chapter maps (`localizeSeoChapter` / `localizeSeoDashboard`). Research `locale` / `location` fields remain job parameters (de/en seed language), not UI language.

### Dashboard (Overview) — OpenSEO IA
`/projects/:id/seo` mirrors OpenSEO project dashboard:

1. Masthead **Dashboard**
2. Full-width **Set up your workspace** checklist (remaining steps; done as chips). Steps reflect **live** `GET /overview` persistence (saved keywords · rank configs · domain present) — not a static empty shell.
3. Optional **next-step + seed hints** band (no DataForSEO/LLM call): first remaining setup step + deterministic Research starters from Suggest Evidence (brand ∪ GSC queries ∪ domain tops ∪ Field KWs). Chips deep-link to Keywords with `?seed=`. Smart Agent suggest stays on chapter workbenches (user-initiated).
4. **2-column card grid**, data-first sort:
   - Search performance (GSC stats)
   - Site audit (Quality crawl top issues)
   - Backlink pulse (ref domains / new / lost)
   - Rank tracking summary
   - Domain overview KPIs
   - Competitors (empty → CTA)

Compose with `@msqdx/ui` magazine language: `Panel variant="card"|editorial` · `SectionChrome` · `KpiMetric` · `WidgetGrid` · `StatusDot`. Provenance as **hairline facet row** (label + value, square top rule — same language as project cover attrs), not soft Chips and not a single meta stamp string. **Not** `LabTile` / soft radius shells. **Live workspace** uses empty shells (`emptySeoChapter` / `emptySeoDashboard`) until Analyze/Research/Refresh or persisted snapshots fill the model — never invent Acme KPIs in product UI. Rich fixtures remain for `apps/seo-dashboard-preview` + unit depth tests only.

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

### Competitors vs Domain / Ranks / Backlinks (no duplicate surfaces)
- **Competitors / Field** = competitive field via **SERP overlap** (primary). Keyword set → rival domains that share rankings. Optional **link competitors** from Backlinks capture (`/backlinks/competitors/live`) may appear as secondary aside pressure — never twin the SERP overlap ledger.
- **Domain** = your organic footprint (traffic · cost · top keywords/pages).
- **Ranks** = your monitored keyword positions over time.
- **Backlinks** = referring pages / domains / anchors / networks for **your** domain.
- Shared only: a rival host string may appear in Domain research when you refresh that host; never twin the overlap ledger onto Domain.

**Backlinks depth (OpenSEO-parity IA, MSQDX chrome):** Search band (domain · Refresh) → KPIs **DR/Rank** · **Backlinks** · **Ref. domains** · **Referring pages** (deltas from new/lost) → charts from summary distributions (TLD · platforms · countries · types) plus weekly new/lost when present → main **referring-page ledger** (filters All · Dofollow · Nofollow · New · Lost · Gov · Edu; fallback to **referring-domains** ledger when pages omit) → aside: **Top anchors** · **Referring domains** · **Linked pages**. Capture = core DataForSEO pack (summary + pages + anchors + ref domains) + best-effort extras (`specs/domain/seo-dataforseo.md`). Never leave a KPI-only shell when summary distributions exist.

**Domain depth (OpenSEO overview IA):** Search band (domain · locale · location · Refresh + recent hosts) → KPI (organic KW · traffic · cost · pages) → **split**: main **Top keywords** ledger (dual keyword/URL · volume · pos · traffic · position-band filters · pagination; up to **40** live ranked keywords) · aside **Organic traffic** `SeriesChart` + position distribution + **Top pages** dual-line list. Refresh posts `POST /api/projects/:id/seo/domain` and merges the snapshot into the chapter model.

**Keywords depth (research IA):** Search band (seed · locale · location · Research + recent seeds) → optional **Smart seed suggestions** (Qwen) → KPI (ideas · avg vol · CPC · comp) → **split**: main **idea ledger** (Volume · CPC · Comp · **KD/Score** · Intent chips · intent filters · pagination) · aside **Search demand** `SeriesChart` + **SERP snapshot** dual-line list. KD from Labs bulk difficulty (best-effort). No rank Δ / prev / device columns (those live on Ranks). Suggestions: `POST /api/projects/:id/seo/keywords/suggest`.

**Rank tracking depth (monitor IA):** Search band (add-to-track · locale · location · Track & check + recent tracked) → optional **Track-set suggestions** (saved Research ∪ Domain top keywords ∪ Knowledge Pack, Qwen fill-in when thin) → KPI (monitored · top 10 · improved · declined) → **split**: main **position ledger** (dual keyword/URL · pos · prev · Δ · device · last check · filters Improved/Declined/Top 10 · pagination) · aside **Visibility over time** `SeriesChart` (invertY) + **Position distribution** + **Biggest movers**. Prev/Δ only from a real prior run — never invent movement. Empty shell seed = domain brand (never Acme fixture seeds). Track posts rank-configs + refresh (seed may be comma-separated set). Suggestions: `POST /api/projects/:id/seo/rank-configs/suggest`.

**Competitors depth (SERP-overlap IA):** Search band (keyword set · locale · location · Analyze + recent sets) → optional **Smart suggestions** (Qwen via OpenRouter) → KPI (rivals · avg overlap · best avg rank · high threats) → **split**: main **rival ledger** (dual domain/shared-KW · overlap · avg rank · threat chips · High/Mid/Low filters · pagination) · aside **Overlap** bar `Chart` + **Competitive pressure** `SeriesChart` + **Battles they win** (+ optional **Link competitors** from latest backlink snapshot). Analyze posts `POST /api/projects/:id/seo/competitors` and **persists** a Field snapshot (`seo_competitor_snapshots`); chapter reload and Overview card read the latest via `GET …/competitors`. Suggestions post `POST /api/projects/:id/seo/competitors/suggest`.

### Market smart suggestions (Research Agent + OpenRouter)
Shared vendor: OpenRouter chat · default `qwen/qwen3.7-flash` (`CHECKION_SEO_FIELD_SUGGEST_MODEL`). Requires `OPENROUTER_API_KEY`. Fail closed `503`. Not DataForSEO units.

| Surface | Endpoint | Purpose | UI |
|---------|----------|---------|-----|
| Field | `POST …/competitors/suggest` | 5–8 SERP-overlap keywords | chips toggle into set · Use set · Analyze · **brief panel** · **Refresh suggestions** after Analyze |
| Research | `POST …/keywords/suggest` | 5–8 Research **seeds** | chip picks one seed · Research · **brief panel** |
| Ranks | `POST …/rank-configs/suggest` | 5–8 track keywords (saved Research short-circuit if ≥5 clean) | chips toggle · Use set · Track & check · **brief panel** |

**Grounding — Market Suggest Research Agent** (`specs/domain/seo-market-suggest-agent.md`):
- Not a one-shot title/meta call. Agent gathers Collection Knowledge + homepage + up to 4 same-origin deep pages (about/products/services…), distills a company brief (who / products / services / audiences), then emits surface keywords.
- Same agent for Field, Research, Ranks. No hardcoded industry packs.
- Reject addresses, hosts, search-engine names, weak `brand + vergleich|preis` templates.
- Response may include `brief` + `agent` provenance (`publishedToPack` when Phase-2 merge succeeds).
- Phase 2: merges distillate into Plexon Knowledge Pack (`research_brief` · `profile` · `geo_context`) when Collection is real + federation live.
- Phase 3: workbench shows company brief + pack publish status after suggest (chips alone are not enough).
- Phase 4: Overview loads live `GET /overview` into dashboard cards/setup; deterministic seed hints (no vendor force); Field offers Refresh suggestions after Analyze.
- Phase 5: Field Analyze persists `seo_competitor_snapshots`; Overview competitors card + Field chapter reload from latest snapshot.
- Phase 6: Suggest Evidence (Field · Ranks · Domain · Quality gaps · GSC) + site corpus ≤6 deep; GSC OAuth connect + snapshots; Overview seed hints from evidence.
- Offline/stub: knowledge ∪ homepage crumbs only.

Card **More details** deep-links: `gsc` · `backlinks` · `rank-tracking` · `domain` · `competitors` · `keywords`. Site audit → Quality scan launch (not a Market chapter).

Fixture SSOT (preview/tests only): `lib/seo-market/chapter-fixtures.ts` · Overview preview: `dashboard-fixtures.ts`. Live product UI: `emptySeoChapter` / `emptySeoDashboard`. Preview hash nav: `#gsc`, `#backlinks`, …

## Notifications
Rank refresh jobs: `resource: 'seo-market'`.
