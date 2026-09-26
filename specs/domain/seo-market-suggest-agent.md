# Market Suggest Research Agent

**Status:** Accepted — CHECKION-local v1 (2026-09-26)  
**Surfaces:** Field · Research · Ranks smart suggestions  
**Companions:** `seo-project-workspace.md` · `seo-project.md` (API) · Plexon `collection-knowledge-pack.md` (future publish)

## Problem

A single OpenRouter call fed only homepage title/meta/H1 yields thin chips (legal name, “Geschäftsführer”, office crumbs). Market suggestions need a short **company research** pass: what the org is, products/services, audiences — then keyword generation.

## Goal

A small, bounded **research agent** (not a free-running chat) that:

1. Gathers a corpus from Collection Knowledge + the live site (homepage + a few same-origin deep links).
2. Distills a typed **company brief**.
3. Emits track-worthy keywords for the requesting surface.

Same pipeline for Field, Research, and Ranks. No hardcoded industry packs.

## Non-goals (v1)

| Out | Why |
|-----|-----|
| Full Audion research dossier | Product-local; agent publishes distillate only later |
| Unbounded web search / SERP crawl | Cost + latency; v1 = own site + knowledge |
| Free-form multi-agent orchestration | Keep deterministic steps + hard caps |
| Writing Knowledge Pack by default | Preview-only brief in response; Plexon publish = Phase 2 |

## Algorithm (deterministic)

```
inputs: domain, projectName, description?, knowledge?, surface, locale?, seedHint?
1. corpus ← knowledge pack slices (profile, research_brief, geo, competitive)
2. home ← HTTP GET https://{domain}/ (fail soft)
3. links ← same-origin candidates from home HTML
     prefer path hints: about|unternehmen|produkte|products|solutions|
     leistungen|services|company|wir|marke|brand|technology (max 4)
4. pages ← fetch each link (timeout 8s, body excerpt ≤ 4k chars)
5. brief ← Qwen distill JSON from corpus + pages
     { summary, category, products[], services[], audiences[], notes? }
6. keywords ← Qwen generate 5–8 surface-specific queries from brief + knowledge
7. sanitize (no www/hosts/addresses/weak brand+vergleich templates)
return { keywords, brief, model, agent: { steps, pagesFetched } }
```

Hard caps: ≤ 1 homepage + ≤ 4 deep pages; ≤ 2 LLM calls; wall clock ~60–90s; fail soft per page.

## Vendor

OpenRouter · default `qwen/qwen3.7-flash` (`CHECKION_SEO_FIELD_SUGGEST_MODEL`). Requires `OPENROUTER_API_KEY`. Fail closed `503` when unset and live Market is on.

## API shape (additive)

`SeoFieldSuggestResult` gains optional:

```ts
brief?: {
  summary: string
  category: string | null
  products: string[]
  services: string[]
  audiences: string[]
}
agent?: {
  steps: string[]
  pagesFetched: string[]
  usedKnowledge: boolean
}
```

Endpoints unchanged: `POST …/competitors/suggest` · `…/keywords/suggest` · `…/rank-configs/suggest`.

## Phase 2 — Plexon hook (implemented)

When Collection has a real `platformProjectId`, federation is live, and `KNOWLEDGE_PACK_AUTOSYNC` is not off:

- After a successful agent run, CHECKION **merges** a distillate into the Knowledge Pack:
  - `research_brief` — summary, topics (products/services/audiences), section `market-suggest`
  - `profile` — `industry` from brief.category when present (merge)
  - `geo_context` — `seedQueries` / `queryThemes` from keywords + products (merge)
- Provenance: `actorType: service`, `productId: checkion`, `note: market-suggest-agent`, `runId: suggest-{projectId}-{surface}-{ts}`
- Soft-fail: suggest response still returns keywords if publish fails; `agent.publishedToPack` / `agent.publishError` report status.

Plexon ownership: `research_brief` publish allowlist includes `checkion` (alongside `audion` / `plexon`).

## Phase 3 — Suggest workbench brief (UI)

After a successful suggest on Field · Research · Ranks, the workbench MUST surface the agent distillate (not only chips):

- **Company brief** — summary; optional category; compact product / service / audience chips (cap ~8 visible).
- **Pack status** — `publishedToPack` → ok status; missing Collection / autosync off → quiet info; `publishError` → soft error (keywords still usable).
- Clear or replace on the next suggest for that surface; no separate persistence in CHECKION UI (Pack is SSOT).

## Phase 4 — Overview setup + Field refresh

- Overview MUST compose the dashboard from live `GET /api/projects/:id/seo/overview` (setup done/todo from saved keywords · rank configs · domain; cards fill KPIs when snapshots exist). Never invent Acme numbers.
- Overview MAY show deterministic **seed hints** (brand ∪ domain top keywords) without calling OpenRouter or DataForSEO. Smart Agent remains user-initiated on chapter workbenches.
- Field workbench MUST offer **Refresh suggestions** after an Analyze run (same suggest endpoint); label may switch from first-run copy when chips already exist.

## Phase 5 — Persist Field Analyze

- Successful Field Analyze (`POST …/competitors`) MUST persist a `seo_competitor_snapshots` row (keywords + rival items + provenance).
- `GET …/competitors` returns `{ latest }` for chapter reload.
- Overview `competitorSnapshot` fills the Competitive field card KPIs (rivals · avg overlap · best avg rank · high threats). Soft-fail if table missing until drizzle push.

## Offline / stub

When live SEO Market is off: knowledge seeds ∪ homepage title crumbs (existing fixture path). No agent loop.

## Tests

- Link discovery prefers product/about paths, skips external hosts.
- Distill + keyword stages parse JSON and sanitize junk.
- Agent returns brief + keywords with mocked fetch/LLM.
