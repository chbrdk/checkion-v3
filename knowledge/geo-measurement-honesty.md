# GEO measurement honesty — live queryRuns

**Date:** 2026-08-11  
**Spec:** `specs/domain/geo-competitive-presence.md` § Competitive LLM prompt honesty

## What we measure

Ungrounded multi-provider chat: for each prompt × model, ask for a natural answer + ordered domain citations, then match the target host post-hoc.

This is a **parametric preference / recall probe**, not live Answer Engine placement with web search.

## Honesty dial (current)

| Knob | Setting | Effect |
|------|---------|--------|
| Domain hints (target + rivals in system prompt) | **Off** | Removes the main artificial inflation |
| “Genuinely recommend / empty OK” | **On** | Avoids forced cite lists |
| Structured citations when recommending | **On** | Still get placement when brands are named |
| Brand-free user prompts (EQC / persona) | **On** (Plexon) | Prompt text does not name the target |
| Grounded search / AI Overviews sampling | **Off** (deferred) | Would be more real; separate wave |

## Why not “stricter”

Removing citations, requiring web grounding, or demanding the model never name familiar retailers would drive hit rates toward zero for many legitimate regional brands and make the magazine unusable. The goal is **less steered**, not **no placements**.

## Expectation after the change

- Well-known brands (e.g. large DE retailers) may still appear often — from training recall, not because we whispered their domain.
- Niche / young brands should miss more often than under the old hint list — that is the honest signal.
- Fixture GEO jobs are unchanged (synthetic magazine).

## Re-run

From `/geo/:id/*` magazine topbar: **Re-run** → `POST /api/geo-jobs` with cloned inputs (`lib/geo-rerun.ts`). New job id; Notification center tracks it. Spec: `scan-modes.md` § GEO re-run.

## Code

- Prompt: `apps/web/lib/geo-eeat/competitive-response.ts` → `buildCompetitiveSystemPrompt`
- Runner: `apps/web/lib/geo-eeat/run-query-runs.ts` (does not pass domain lists into the prompt)
- Re-run UI: `components/geo-result-actions.tsx`
