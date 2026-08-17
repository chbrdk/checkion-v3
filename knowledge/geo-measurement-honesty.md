# GEO measurement honesty — live queryRuns

**Date:** 2026-08-17  
**Specs:** `specs/domain/geo-competitive-presence.md` § Competitive LLM prompt honesty · `specs/domain/geo-measurement-layers.md`

## Two layers (never mixed)

| Layer | `job.measurement` | What we measure |
|-------|-------------------|-----------------|
| **1 — Model memory** | `recall` (default) | Parametric preference / recall probe — ungrounded chat, JSON host panel |
| **2 — Live search** | `live` | Grounded answers via provider web search; **native** URL citations |

A job is one layer. `citedShare` is never an average of both. ChatGPT-the-app is still not 1:1 replicable via API; Layer 2 is the closest honest analogue.

## Layer 1 honesty dial (current)

| Knob | Setting | Effect |
|------|---------|--------|
| Domain hints (target + rivals in system prompt) | **Off** | Removes steered hits |
| Multi-option / anti-fame-#1 prompt | **On** | Less habitual first place for one familiar chain |
| Broad citation panel (up to ~20) | **On** | Higher chance of mid-list mentions; no invent-to-pad |
| Citations must be registrable hosts (TLD required) | **On** | Bare brand names do not count |
| Label-aware host match | **On** | `martin.de` ≠ `moebel-martin.de` |
| Brand-free user prompts (EQC / persona) | **On** (Plexon) | Prompt text does not name the target |

## Layer 2 honesty dial

| Knob | Setting | Effect |
|------|---------|--------|
| Domain hints in system prompt | **Off** | Same as Layer 1 |
| Forced 20-host JSON panel | **Off** | Native answer + tool citations |
| Search must run | **On** (OpenAI `tool_choice` required; Claude/Gemini search tools) | Avoid silent parametric fallback |
| Citations from tool annotations | **On** | Not model-invented host lists |

## Why famous retailers can still place (Layer 1)

Even with the dial above, models often know large DE chains (e.g. Möbel Martin) from training data and may still cite `moebel-martin.de` on Einrichtung queries. That is **parametric recall**, not a bug — but it is **not** proof of live Answer Engine placement.

## Re-run

From `/geo/:id/*` magazine topbar: **Re-run** → new job with cloned inputs including `measurement` (`lib/geo-rerun.ts`). Old jobs keep old answers/matching.

## Code

- Prompt + match: `apps/web/lib/geo-eeat/competitive-response.ts`
- Layer 2 extract: `apps/web/lib/geo-eeat/grounded-citations.ts`
- Runner: `apps/web/lib/geo-eeat/run-query-runs.ts`
- Presence hit fallback: `apps/web/lib/geo-presence.ts`
- Re-run UI: `components/geo-result-actions.tsx`
