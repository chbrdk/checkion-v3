# GEO Layer 2 live-search cost dial

**Date:** 2026-09-17  
**Specs:** `specs/domain/geo-measurement-layers.md` § Layer 2 search cost dial · `knowledge/geo-measurement-honesty.md`

## Defaults (per query×model cell)
| Provider | Knob | Default |
|----------|------|---------|
| OpenAI | `search_context_size` | `medium` |
| OpenAI | `max_tool_calls` | `3` |
| Anthropic | `max_uses` | `3` |

OpenAI still uses `tool_choice: required` so at least one search runs.

## Coolify / runtime env (optional)
| Env | Values |
|-----|--------|
| `CHECKION_GEO_OPENAI_SEARCH_CONTEXT_SIZE` | `low` · `medium` · `high` |
| `CHECKION_GEO_OPENAI_MAX_TOOL_CALLS` | 1–16 |
| `CHECKION_GEO_ANTHROPIC_MAX_USES` | 1–16 |

## Code
`apps/web/lib/geo/live-search-limits.ts` · wired in `run-query-runs.ts` · constants on `paths.openaiGeo*` / `paths.anthropicGeo*`
