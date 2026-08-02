# GEO model catalog — CHECKION v3

## Status
Accepted (August 2026). Launch UX only; multi-provider live queryRuns remain deferred.

## Purpose
Replace free-text GEO model entry on `/scan` with a typed catalog + multi-select chips (OpenAI · Anthropic · Google). Keep `POST /api/geo-jobs` body `{ models: string[] }` unchanged.

## Catalog
Module: `apps/web/lib/geo/model-catalog.ts`

| Field | Notes |
|-------|--------|
| `provider` | `openai` \| `anthropic` \| `google` |
| `id` | API model id (e.g. `gpt-5.4-nano`, `claude-sonnet-5`, `gemini-3.6-flash`) |
| `label` | Short display label |
| `tier` | Optional capability note (`flagship`, `balanced`, `fast`, …) |
| `recommended` | Preselect / Suggest default set |
| `default` | Single catalog default when nothing selected |
| `liveSupported` | `true` only for providers the live GEO pipeline can call today |

**As of August 2026:** live GEO runs OpenAI models only (`OPENAI_API_KEY`). Anthropic and Google entries stay selectable for future multi-provider competitive runs; they are marked “Soon” in the UI.

### Current entries (snapshot)
- **OpenAI:** `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-5.5`, `gpt-5.4-mini`, `gpt-5.4-nano` (default + recommended)
- **Anthropic:** `claude-fable-5`, `claude-opus-5`, `claude-sonnet-5`, `claude-opus-4-8`, `claude-sonnet-4-6`, `claude-haiku-4-5`
- **Google:** `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-pro-preview`, `gemini-3.1-flash-lite`, `gemini-2.5-pro`, `gemini-2.5-flash`

Refresh IDs when providers ship new GA tiers; do not invent retired names.

## Launch UX
Composition: `GeoModelChips` beside `GeoQueryList` on GEO capability (`ScanLaunchForm`).

1. **Chips** — `@msqdx/ui` `Chip` toggle (`aria-pressed`); grouped by provider under `SectionChrome`.
2. **Suggest** — restores recommended OpenAI set (at least the catalog default `gpt-5.4-nano`).
3. **Availability** — OpenAI chips labeled Live; Anthropic / Google chips labeled Soon; quiet hint: live mode posts OpenAI-only.
4. **Submit** — `modelsForLaunch(selectedIds)` returns live-supported selected ids; if empty after filter, falls back to `[catalogDefaultId]`. Still `POST /api/geo-jobs` with `models: string[]`.

Magazine aesthetic matches the query list: hairline rules, no heavy fills, type + chips.

## Helpers
| Helper | Role |
|--------|------|
| `GEO_MODEL_CATALOG` | Full typed list |
| `defaultGeoModelIds()` | Recommended / default preselect |
| `modelsForLaunch(ids)` | Filter to live-supported + default fallback |
| `groupCatalogByProvider()` | UI grouping |
| `sameModelSelection(a, b)` | Compare selections (order-insensitive) |

## Non-goals
- New API route for the catalog (client module is enough)
- Calling Anthropic / Gemini APIs from live GEO (deferred; see `geo-competitive-presence.md`)
- Free-text custom model ids on launch

## Tests
- `apps/web/__tests__/geo-model-catalog.test.ts` — catalog shape, default, launch filter
- `apps/web/__tests__/scan-launch-form.test.tsx` — chip toggle, Suggest, POST `models`
