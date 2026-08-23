# GEO measurement layers — CHECKION v3

## Status
Accepted (August 2026). Layer 1 (recall) is the existing ungrounded probe. Layer 2 (live search) is a **standalone second option** — never mixed into the same job or hit-rate.

## Purpose
Answer engines are not one thing. Chat Completions without tools measures **parametric recall**. ChatGPT / Claude.ai / Gemini apps search, rank, and often agent-loop. Those must stay separate measurements.

| Layer | `measurement` | What it answers | How |
|-------|---------------|-----------------|-----|
| **1 — Model memory** | `recall` (default) | Would the model mention this host from weights? | Ungrounded chat + structured JSON citations (existing) |
| **2 — Live search** | `live` | Did a grounded answer cite this host? | Provider web-search / grounding tools; parse **native** URL citations |

Do **not** average Layer 1 and Layer 2 into one `citedShare`. Each GEO job has exactly one `measurement`. Re-run clones it.

This is **not** 1:1 ChatGPT-app parity. OpenAI does not expose the consumer stack. Layer 2 is the closest honest API analogue (Responses `web_search`, Anthropic `web_search`, Gemini Google Search grounding). Deep Research / shopping / memory / custom GPTs stay out of v1.

## Launch (standalone option)
On `/scan` after GEO is selected, reveal **measurement tiles** (same aesthetic as WCAG depth — not a ToggleGroup strip). Tiles are **multi-select** (one or both). Compose mounts only after at least one layer is chosen.

| Tile | `measurement` | Kicker | Deck |
|------|---------------|--------|------|
| Model memory | `recall` | Layer 1 | Ungrounded probe — brands the model already knows. |
| Live search | `live` | Layer 2 | Web-grounded answers — citations from search, closer to ChatGPT-with-browse. |

Selecting **both** starts **two jobs** (same queries/models, different `measurement`). Never one mixed `citedShare`.

Deep-link `/scan?mode=geo` skips ahead with **`recall`**. Optional `measurement=live` / `measurement=both` / `measurement=recall,live`. Helper: `paths.routes.scanLaunch({ mode: 'geo', measurement })`.

**Everywhere GEO runs, the layer switch must be present** — CHECKION `/scan` and Plexon Event Quick Check / Collection Flow `geo_job` (confirm panel). Default when omitted: `recall`.

## API
`POST /api/geo-jobs` body adds optional `measurement?: 'recall' | 'live'`. Omitted / unknown → `recall`. Persist on `GeoJobSummary.measurement` (default `recall` when reading older rows).

Re-run (`buildGeoRerunPayload`) clones `measurement`.

MCP `checkion_v3.geo_job_start` accepts the same optional field.

## Query runs
### Layer 1 (`recall`)
Unchanged: blind system prompt, JSON `{ answer, citations[] }` of registrable hosts, post-hoc target match. See [`geo-competitive-presence.md`](./geo-competitive-presence.md) § Competitive LLM prompt honesty.

### Layer 2 (`live`) — v1.1 fidelity
Natural-language answer (same language as the query). **Do not** force a 20-host JSON panel — that is not a native ChatGPT answer. No hard 2–8 sentence cap — let the model write a native grounded reply.

**Search market:** derive ISO country from target host TLD (`.de`→`DE`, `.at`→`AT`, `.ch`→`CH`; fallback `DE`). Persist `searchMarket` on the job/overview for honesty labels. No launch picker in v1.1.

| Provider | Call | Citations |
|----------|------|-----------|
| OpenAI | Responses API + `{ type: "web_search", user_location: { type: "approximate", country }, search_context_size: "high" }`, `tool_choice` required | `url_citation` annotations |
| Anthropic | Messages + hosted `web_search` with same `user_location` | text-block `citations[].url` |
| Google | `generateContent` + `google_search` grounding; market sentence in system prompt only (no lat/lng v1.1) | `groundingMetadata.groundingChunks[].web.uri` |

Then: hostname normalize → registrable-host filter → ordered unique panel (cap `GEO_COMPETITIVE_CITATION_TARGET`) → same `ourPosition` / presence / insights helpers as Layer 1.

Honesty: still **no** target/competitor domain list in the system prompt. Steer only “search the web; cite what you used” plus optional market context (`Assume the user is searching from {country}`).

**Capture (v1.1):** optional `GeoQueryRun.searchQueries[]` — provider-executed search strings when present in tool payloads. `GeoCitation.context` stores source titles when grounded.

**Secondary KPI:** `GeoPresenceSolo.mentionedShare` — % of cells where `targetMentionedInAnswer` (prose token match). Populated for live jobs only; **never** folded into `citedShare`.

Optional `GeoCitation.url` stores the absolute source URL when grounded.

## Magazine
Label the job (overview meter, index chip, notification title) as **Model memory** or **Live search**. Live jobs may show market chip (e.g. `Live search · DE`). When `mentionedShare` is present, show as secondary figure next to cited share — not blended. Lede must not call Layer 1 “ChatGPT placement” or claim ChatGPT-app parity for Layer 2.

## Non-goals (v1 Layer 2)
- Mixing both layers in one job / one `citedShare` (two selected tiles = two jobs)
- ChatGPT consumer-app clone (memory, shopping, custom GPTs)
- Deep Research / background multi-minute runs
- Scraping chatgpt.com / AI Overviews

## Tests
- `apps/web/__tests__/geo-measurement.test.ts` — parse, labels, default
- `apps/web/__tests__/search-market.test.ts` — TLD → country resolution
- `apps/web/__tests__/grounded-citations.test.ts` — OpenAI / Anthropic / Gemini payload extract + searchQueries
- `apps/web/__tests__/run-query-runs-multi-provider.test.ts` — live path uses grounded prompt, market, OpenAI tool config, no host leak
- `apps/web/__tests__/geo-presence.test.ts` — `mentionedShare` vs `citedShare` separation
- `apps/web/__tests__/scan-launch-form.test.tsx` — measurement tiles (multi-select) + POST `measurement`; both layers → two jobs
- `apps/web/__tests__/geo-rerun.test.ts` — clones `measurement`
- `apps/web/__tests__/specs-inventory.test.ts` — this spec on disk
