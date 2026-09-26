# SEO DataForSEO vendor — CHECKION v3

## Status
Accepted

## Env

| Key | Purpose |
|-----|---------|
| `DATAFORSEO_API_KEY` | Base64 `email:password` (server-only; never expose to client) |
| `CHECKION_LIVE_SEO_MARKET` | `1` force live; `0` force fixture; unset → live when key **and** `DATABASE_URL` present |

Paths constants: `paths.envDataForSeoApiKey`, `paths.envLiveSeoMarket`.

## Live gate
`shouldRunLiveSeoMarket()` in `apps/web/lib/seo-market/live-seo-market-gate.ts`:

- Flag `0` / `false` / `off` → fixture
- Flag `1` / `true` / `on` → live (requires key)
- Else → live iff `DATAFORSEO_API_KEY` set and `DATABASE_URL` configured

Fixture mode returns deterministic sample rows (`stubbed: true`, `source: "fixture"`).

## Client
`apps/web/lib/seo-market/dataforseo-client.ts` — Basic auth from key, timeouts, typed helpers for:

- Keyword ideas / search volume
- SERP organic live
- Domain ranked keywords / overview
- Backlinks **summary** (`/backlinks/summary/live`) — rank (0–100), counts, spam, TLD/types
- Backlinks **pages** (`/backlinks/backlinks/live`) — referring-page ledger
- Backlinks **timeseries** (`/backlinks/timeseries_summary/live`) — weekly progress charts
- Competitors (via SERP overlap on keyword set)

Usage events append to `seo_market_usage` (projectId, endpoint, units, at). Cache hits go through `seo_market_cache` (TTL).

## Soft cost cap
Default soft cap: **50** billable units / Collection / calendar day (override `CHECKION_SEO_MARKET_DAILY_SOFT_CAP`). Exceeding returns `429 cost_soft_cap` with clear detail — does not hard-block operators who raise the env.

## GSC (optional, Phase 4)
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `BETTER_AUTH_SECRET` or suite OAuth — see workspace GSC route. Not required for MVP Market.
