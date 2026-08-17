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
On `/scan` after GEO is selected, reveal **measurement tiles** (same aesthetic as WCAG depth — not a ToggleGroup strip):

| Tile | `measurement` | Kicker | Deck |
|------|---------------|--------|------|
| Model memory | `recall` | Layer 1 | Ungrounded probe — brands the model already knows. |
| Live search | `live` | Layer 2 | Web-grounded answers — citations from search, closer to ChatGPT-with-browse. |

Compose (URL / company / queries / models) mounts only after a measurement is chosen.

Deep-link `/scan?mode=geo` skips ahead with **`recall`**. Optional `measurement=live` selects Layer 2. Helper: `paths.routes.scanLaunch({ mode: 'geo', measurement })`.

Plexon Event Quick Check stays Layer 1 unless a later flow posts `measurement: 'live'`.

## API
`POST /api/geo-jobs` body adds optional `measurement?: 'recall' | 'live'`. Omitted / unknown → `recall`. Persist on `GeoJobSummary.measurement` (default `recall` when reading older rows).

Re-run (`buildGeoRerunPayload`) clones `measurement`.

MCP `checkion_v3.geo_job_start` accepts the same optional field.

## Query runs
### Layer 1 (`recall`)
Unchanged: blind system prompt, JSON `{ answer, citations[] }` of registrable hosts, post-hoc target match. See [`geo-competitive-presence.md`](./geo-competitive-presence.md) § Competitive LLM prompt honesty.

### Layer 2 (`live`)
Natural-language answer (same language as the query). **Do not** force a 20-host JSON panel — that is not a native ChatGPT answer.

| Provider | Call | Citations |
|----------|------|-----------|
| OpenAI | Responses API + `{ type: "web_search" }`, `tool_choice` required so search runs | `url_citation` annotations |
| Anthropic | Messages + hosted `web_search` tool | text-block `citations[].url` |
| Google | `generateContent` + `google_search` grounding | `groundingMetadata.groundingChunks[].web.uri` |

Then: hostname normalize → registrable-host filter → ordered unique panel (cap `GEO_COMPETITIVE_CITATION_TARGET`) → same `ourPosition` / presence / insights helpers as Layer 1.

Honesty: still **no** target/competitor domain list in the system prompt. Steer only “search the web; cite what you used.”

Optional `GeoCitation.url` stores the absolute source URL when grounded.

## Magazine
Label the job (overview meter, index chip, notification title) as **Model memory** or **Live search**. Lede must not call Layer 1 “ChatGPT placement.”

## Non-goals (v1 Layer 2)
- Mixing both layers in one job / one `citedShare`
- ChatGPT consumer-app clone (memory, shopping, custom GPTs)
- Deep Research / background multi-minute runs
- Scraping chatgpt.com / AI Overviews
- Changing EQC default away from `recall`

## Tests
- `apps/web/__tests__/geo-measurement.test.ts` — parse, labels, default
- `apps/web/__tests__/grounded-citations.test.ts` — OpenAI / Anthropic / Gemini payload extract
- `apps/web/__tests__/run-query-runs-multi-provider.test.ts` — live path uses grounded prompt, no host leak
- `apps/web/__tests__/scan-launch-form.test.tsx` — measurement tiles + POST `measurement`
- `apps/web/__tests__/geo-rerun.test.ts` — clones `measurement`
- `apps/web/__tests__/specs-inventory.test.ts` — this spec on disk
