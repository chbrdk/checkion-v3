# SEO DataForSEO vendor — CHECKION v3

## Status
Accepted

## Env

| Key | Purpose |
|-----|---------|
| `DATAFORSEO_API_KEY` | Base64 `email:password` (server-only; never expose to client) |
| `CHECKION_LIVE_SEO_MARKET` | `1` force live; `0` force fixture; unset → live when key **and** `DATABASE_URL` present |
| `CHECKION_SEO_MARKET_DAILY_SOFT_CAP` | Soft billable units / Collection / day (default **80**) |

Paths constants: `paths.envDataForSeoApiKey`, `paths.envLiveSeoMarket`.

## Live gate
`shouldRunLiveSeoMarket()` in `apps/web/lib/seo-market/live-seo-market-gate.ts`:

- Flag `0` / `false` / `off` → fixture
- Flag `1` / `true` / `on` → live (requires key)
- Else → live iff `DATAFORSEO_API_KEY` set and `DATABASE_URL` configured

Fixture mode returns deterministic sample rows (`stubbed: true`, `source: "fixture"`).

## Client
`apps/web/lib/seo-market/dataforseo-client.ts` — Basic auth from key, timeouts, typed helpers.

### Keywords / Research
- `POST /keywords_data/google_ads/keywords_for_keywords/live` — ideas (volume · CPC · competition)
- `POST /dataforseo_labs/google/bulk_keyword_difficulty/live` — KD/score per idea (best-effort; omit when empty)
- `POST /serp/google/organic/live/regular` — SERP snapshot for seed

### Domain
- `POST /dataforseo_labs/google/domain_rank_overview/live` — organic KW · traffic · cost
- `POST /dataforseo_labs/google/ranked_keywords/live` — top ranked keywords (limit **40**)

### Backlinks (one Capture / Refresh)
Primary (required for live success — **summary + pages + anchors + referring_domains** must succeed):

| Call | Endpoint | Maps to |
|------|----------|---------|
| Summary | `/backlinks/summary/live` | DR (`rank`; prefer `rank_scale: one_hundred`), backlinks, ref domains, spam, broken, referring pages, TLD/types/attributes/platforms/locations/countries, target info |
| Pages | `/backlinks/backlinks/live` | Referring-page ledger (limit 25, `include_subdomains: true`) |
| Anchors | `/backlinks/anchors/live` | Aside anchor ledger |
| Ref domains | `/backlinks/referring_domains/live` | Aside + fallback main ledger when pages empty |

Best-effort (`.catch` → omit; never blank the chapter if core succeeded):

| Call | Endpoint | Maps to |
|------|----------|---------|
| Timeseries | `/backlinks/timeseries_summary/live` | Weekly backlinks + ref-domain charts |
| New/Lost | `/backlinks/timeseries_new_lost_summary/live` | True new/lost weekly series |
| Domain pages | `/backlinks/domain_pages_summary/live` | Linked pages aside |
| Networks | `/backlinks/referring_networks/live` | IP/subnet concentration chart |
| Competitors | `/backlinks/competitors/live` | Link competitors (also hydrates Field) |
| History | `/backlinks/history/live` | Monthly history (long-range chart) |

Soft-cap reserve for a full refresh: **20** units. Summary distributions (TLD / platforms / countries / types) always drive charts even when timeseries omit.

Persisted on `seo_backlink_snapshots` columns + `details` jsonb (items, anchors, referringDomainsList, domainPages, networks, competitors, history, distribution objects, timeseries*).

**UI honesty:** When referring pages are empty but summary/ref-domains exist, show distribution charts + ref-domain ledger — never a KPI-only shell.

**Out of scope this wave:** bulk_* multi-target compare, `domain_intersection` / `page_intersection` link-gap (follow-up when Field gets an explicit Link-gap band).

### Competitors / Field
- SERP overlap (existing) via organic SERP per keyword
- When backlinks competitors exist on the latest snapshot, Field may surface them as secondary aside pressure (does not replace SERP overlap ledger)
- **Smart suggestions:** `POST /competitors/suggest` — OpenRouter `qwen/qwen3.7-flash` (env override) proposes 5–8 Field keywords from domain + saved Research; fail closed without `OPENROUTER_API_KEY`

### Usage / cache
Usage events → `seo_market_usage`. Cache → `seo_market_cache` (TTL).

## Soft cost cap
Default soft cap: **80** billable units / Collection / calendar day. Exceeding returns `429 cost_soft_cap`.

## GSC (optional, Phase 4)
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `BETTER_AUTH_SECRET` or suite OAuth — see workspace GSC route. Not required for MVP Market.
