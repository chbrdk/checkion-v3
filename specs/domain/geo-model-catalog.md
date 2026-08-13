# GEO model catalog — CHECKION v3

## Status
Accepted (August 2026). Launch UX + live multi-provider queryRuns for selected catalog ids.

## Purpose
Typed GEO model catalog for `/scan` launch. Catalog may grow (DeepSeek, etc.); UI must stay compact — never dump the full wall as chips. Keep `POST /api/geo-jobs` body `{ models: string[] }` unchanged.

## Catalog
Module: `apps/web/lib/geo/model-catalog.ts`

| Field | Notes |
|-------|--------|
| `provider` | `openai` \| `anthropic` \| `google` (extend as providers land) |
| `id` | API model id (e.g. `gpt-5.6-luna`, `claude-sonnet-5`, `gemini-3.6-flash`) |
| `label` | Short display label |
| `tier` | Optional capability note (`flagship`, `balanced`, `fast`, …) |
| `recommended` | Preselect / Suggest default set (compact multi-provider: 5 ids) |
| `default` | Single catalog default when nothing selected (`gpt-5.6-luna`) |
| `liveSupported` | `true` when live GEO can call this id (provider API key required at runtime) |

**Live (August 2026):** OpenAI (`OPENAI_API_KEY`), Anthropic (`ANTHROPIC_API_KEY`), Google (`GEMINI_API_KEY` or `GOOGLE_API_KEY`). Models with `liveSupported: false` stay selectable as “Soon” and are filtered out by `modelsForLaunch`.

### Current entries (snapshot)
- **OpenAI (live):** `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna` (default), `gpt-5.5`, `gpt-5.4-mini`, `gpt-5.4-nano`
- **Anthropic (live):** `claude-fable-5`, `claude-opus-5`, `claude-sonnet-5`, `claude-opus-4-8`, `claude-sonnet-4-6`, `claude-haiku-4-5`
- **Google (live):** `gemini-3.6-flash` · **Soon:** remaining Gemini 3.x / 2.5 ids

**Suggest / EQC defaults** (`GEO_EQC_DEFAULT_MODEL_IDS` / `defaultGeoModelIds()`):
`gpt-5.6-luna`, `gpt-5.6-terra`, `gpt-5.6-sol`, `claude-sonnet-5`, `gemini-3.6-flash`

Plexon Event Quick Check posts the compact GPT/Gemini set **plus every Anthropic catalog id** (`plexon-v3/lib/integrations/eqc-geo-default-models.ts`).

Refresh IDs when providers ship new GA tiers; do not invent retired names. Adding a provider only grows the catalog + Add-dialog segment — not the launch surface.

## Launch UX
Composition: `GeoModelPicker` beside `GeoQueryList` on GEO capability (`ScanLaunchForm`).

### Information architecture
1. **Selected strip** — only chosen models as removable chips (defaults = recommended set). Not the full catalog.
2. **Suggest** — restores `defaultGeoModelIds()` (compact multi-provider set).
3. **Add model** — dialog/popover (not an inline wall):
   - Provider `ToggleGroup` (All · OpenAI · Anthropic · Google · …)
   - Search field (id + label)
   - Scrollable result list; click toggles selection (Live / Soon / Selected)
4. **Availability** — Live providers: OpenAI, Anthropic, Google (for liveSupported ids); quiet hint when Soon models are selected.
5. **Submit** — `modelsForLaunch(selectedIds)` returns live-supported selected ids; if empty after filter, falls back to `[catalogDefaultId]`. Still `POST /api/geo-jobs` with `models: string[]`.

Magazine aesthetic matches the query list: hairline rules, selected chips + Add row, dialog for browse — no giant chip grid.

## Helpers
| Helper | Role |
|--------|------|
| `GEO_MODEL_CATALOG` | Full typed list (source of truth; may grow) |
| `GEO_EQC_DEFAULT_MODEL_IDS` | Compact multi-provider default id list |
| `defaultGeoModelIds()` | Recommended / default preselect |
| `modelsForLaunch(ids)` | Filter to live-supported + default fallback |
| `groupCatalogByProvider()` | Provider grouping |
| `searchCatalogModels({ provider, query, excludeIds? })` | Add-dialog filter |
| `resolveSelectedModels(ids)` | Map selection → catalog entries |
| `providerIsLive(provider)` | Whether provider has any live model |
| `sameModelSelection(a, b)` | Compare selections (order-insensitive) |

## Non-goals
- New API route for the catalog (client module is enough)
- Free-text custom model ids on launch
- Showing every catalog model as chips on the launch surface

## Tests
- `apps/web/__tests__/geo-model-catalog.test.ts` — catalog shape, default, launch filter, search
- `apps/web/__tests__/scan-launch-form.test.tsx` — selected strip, Add dialog, Suggest, POST `models`
