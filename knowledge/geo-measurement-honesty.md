# GEO measurement honesty — live queryRuns

**Date:** 2026-08-11  
**Spec:** `specs/domain/geo-competitive-presence.md` § Competitive LLM prompt honesty

## What we measure

Ungrounded multi-provider chat: for each prompt × model, ask for a natural answer + ordered **website hostnames**, then match the target host post-hoc with **label-aware** DNS rules.

This is a **parametric preference / recall probe**, not live Answer Engine placement with web search.

## Honesty dial (current)

| Knob | Setting | Effect |
|------|---------|--------|
| Domain hints (target + rivals in system prompt) | **Off** | Removes steered hits |
| Multi-option / anti-fame-#1 prompt | **On** | Less habitual first place for one familiar chain |
| Citations must be registrable hosts (TLD required) | **On** | Bare brand names do not count |
| Label-aware host match | **On** | `martin.de` ≠ `moebel-martin.de` |
| Brand-free user prompts (EQC / persona) | **On** (Plexon) | Prompt text does not name the target |
| Grounded search / AI Overviews sampling | **Off** (deferred) | Separate wave |

## Why famous retailers can still place

Even with the dial above, models often know large DE chains (e.g. Möbel Martin) from training data and may still cite `moebel-martin.de` on Einrichtung queries. That is **parametric recall**, not a bug — but it is **not** proof of live Answer Engine placement.

## Re-run

From `/geo/:id/*` magazine topbar: **Re-run** → new job with cloned inputs (`lib/geo-rerun.ts`). Old jobs keep old answers/matching.

## Code

- Prompt + match: `apps/web/lib/geo-eeat/competitive-response.ts`
- Runner: `apps/web/lib/geo-eeat/run-query-runs.ts`
- Presence hit fallback: `apps/web/lib/geo-presence.ts`
- Re-run UI: `components/geo-result-actions.tsx`
