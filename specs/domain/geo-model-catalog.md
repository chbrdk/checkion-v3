# GEO model catalog — CHECKION v3

## Status
Accepted (August 2026). Launch UX only; multi-provider live queryRuns remain deferred.

## Purpose
Typed GEO model catalog for `/scan` launch. Catalog may grow (DeepSeek, etc.); UI must stay compact — never dump the full wall as chips. Keep `POST /api/geo-jobs` body `{ models: string[] }` unchanged.

## Catalog
Module: `apps/web/lib/geo/model-catalog.ts`

| Field | Notes |
|-------|--------|
| `provider` | `openai` \| `anthropic` \| `google` (extend as providers land) |
| `id` | API model id (e.g. `gpt-5.4-nano`, `claude-sonnet-5`, `gemini-3.6-flash`) |
| `label` | Short display label |
| `tier` | Optional capability note (`flagship`, `balanced`, `fast`, …) |
| `recommended` | Preselect / Suggest default set (keep small: 1–3) |
| `default` | Single catalog default when nothing selected |
| `liveSupported` | `true` only for providers the live GEO pipeline can call today |

**As of August 2026:** live GEO runs OpenAI models only (`OPENAI_API_KEY`). Anthropic and Google entries stay selectable for future multi-provider competitive runs; they are marked “Soon” in the UI.

### Current entries (snapshot)
- **OpenAI:** `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-5.5`, `gpt-5.4-mini`, `gpt-5.4-nano` (default + recommended)
- **Anthropic:** `claude-fable-5`, `claude-opus-5`, `claude-sonnet-5`, `claude-opus-4-8`, `claude-sonnet-4-6`, `claude-haiku-4-5`
- **Google:** `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-pro-preview`, `gemini-3.1-flash-lite`, `gemini-2.5-pro`, `gemini-2.5-flash`

Refresh IDs when providers ship new GA tiers; do not invent retired names. Adding a provider only grows the catalog + Add-dialog segment — not the launch surface.

## Launch UX
Composition: `GeoModelPicker` beside `GeoQueryList` on GEO capability (`ScanLaunchForm`).

### Information architecture
1. **Selected strip** — only chosen models as removable chips (defaults = recommended set, typically 1). Not the full catalog.
2. **Suggest** — restores `defaultGeoModelIds()` (recommended OpenAI set, at least `gpt-5.4-nano`).
3. **Add model** — dialog/popover (not an inline wall):
   - Provider `ToggleGroup` (All · OpenAI · Anthropic · Google · …)
   - Search field (id + label)
   - Scrollable result list; click toggles selection (Live / Soon / Selected)
4. **Availability** — OpenAI Live; others Soon; quiet hint when Soon models are selected.
5. **Submit** — `modelsForLaunch(selectedIds)` returns live-supported selected ids; if empty after filter, falls back to `[catalogDefaultId]`. Still `POST /api/geo-jobs` with `models: string[]`.

Magazine aesthetic matches the query list: hairline rules, selected chips + Add row, dialog for browse — no giant chip grid.

## Helpers
| Helper | Role |
|--------|------|
| `GEO_MODEL_CATALOG` | Full typed list (source of truth; may grow) |
| `defaultGeoModelIds()` | Recommended / default preselect (small set) |
| `modelsForLaunch(ids)` | Filter to live-supported + default fallback |
| `groupCatalogByProvider()` | Provider grouping |
| `searchCatalogModels({ provider, query, excludeIds? })` | Add-dialog filter |
| `resolveSelectedModels(ids)` | Map selection → catalog entries |
| `providerIsLive(provider)` | Whether provider has any live model |
| `sameModelSelection(a, b)` | Compare selections (order-insensitive) |

## Non-goals
- New API route for the catalog (client module is enough)
- Calling Anthropic / Gemini APIs from live GEO (deferred; see `geo-competitive-presence.md`)
- Free-text custom model ids on launch
- Showing every catalog model as chips on the launch surface

## Tests
- `apps/web/__tests__/geo-model-catalog.test.ts` — catalog shape, default, launch filter, search
- `apps/web/__tests__/scan-launch-form.test.tsx` — selected strip, Add dialog, Suggest, POST `models`
