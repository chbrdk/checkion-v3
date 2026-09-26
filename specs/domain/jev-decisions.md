# Jev decisions (shadow) — CHECKION

**Status:** Stub — follow PLEXON `specs/domain/jev-decisions.md`  
**Transport:** OpenRouter Decisions API · model `typesafe/jev-1.13`

## Fuzzy candidates (shadow-first)

| ID | Baseline | Questions |
|----|----------|-----------|
| `checkion.ymyl_gate` | `lib/scan/ymyl-heuristic.ts` | Noul is_ymyl + Choice confidence |
| `checkion.live_geo_gate` | `lib/geo-eeat/live-geo-gate.ts` `shouldRunLiveGeo` | Noul |
| `checkion.issue_severity` | issue severity maps | Choice critical/high/medium/low |

## Env

Same as PLEXON: `OPENROUTER_API_KEY`, `JEV_SHADOW_ENABLED`, `JEV_ACT_*`, `JEV_MODEL_ID`.

## Implementation note

Copy `plexon-v3/lib/jev` client pattern into `apps/web/lib/jev/` when wiring. Do not replace deterministic score thresholds.
