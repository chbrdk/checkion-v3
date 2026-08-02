/**
 * GEO launch model catalog (August 2026).
 * Spec: specs/domain/geo-model-catalog.md
 *
 * Live GEO currently runs OpenAI only; Anthropic / Google stay in the catalog
 * for UX + future multi-provider competitive runs.
 */

export type GeoModelProvider = 'openai' | 'anthropic' | 'google'

export type GeoModelTier = 'flagship' | 'balanced' | 'fast' | 'previous'

export type GeoModelEntry = {
  provider: GeoModelProvider
  id: string
  label: string
  tier?: GeoModelTier
  /** Preselect / Suggest defaults */
  recommended?: boolean
  /** Single fallback when selection is empty after live filter */
  default?: boolean
  /** Runnable in live GEO today (OpenAI + OPENAI_API_KEY) */
  liveSupported: boolean
}

export const GEO_MODEL_PROVIDERS: ReadonlyArray<{
  id: GeoModelProvider
  label: string
}> = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'google', label: 'Google' },
]

/** Typed registry — refresh when providers ship new GA tiers. */
export const GEO_MODEL_CATALOG: readonly GeoModelEntry[] = [
  // OpenAI — GPT-5.6 family (July 2026) + still-current 5.5 / 5.4
  {
    provider: 'openai',
    id: 'gpt-5.6-sol',
    label: 'GPT-5.6 Sol',
    tier: 'flagship',
    liveSupported: true,
  },
  {
    provider: 'openai',
    id: 'gpt-5.6-terra',
    label: 'GPT-5.6 Terra',
    tier: 'balanced',
    liveSupported: true,
  },
  {
    provider: 'openai',
    id: 'gpt-5.6-luna',
    label: 'GPT-5.6 Luna',
    tier: 'fast',
    liveSupported: true,
  },
  {
    provider: 'openai',
    id: 'gpt-5.5',
    label: 'GPT-5.5',
    tier: 'previous',
    liveSupported: true,
  },
  {
    provider: 'openai',
    id: 'gpt-5.4-mini',
    label: 'GPT-5.4 mini',
    tier: 'balanced',
    liveSupported: true,
  },
  {
    provider: 'openai',
    id: 'gpt-5.4-nano',
    label: 'GPT-5.4 nano',
    tier: 'fast',
    recommended: true,
    default: true,
    liveSupported: true,
  },
  // Anthropic — Claude 5 + current 4.x (API aliases)
  {
    provider: 'anthropic',
    id: 'claude-fable-5',
    label: 'Claude Fable 5',
    tier: 'flagship',
    liveSupported: false,
  },
  {
    provider: 'anthropic',
    id: 'claude-opus-5',
    label: 'Claude Opus 5',
    tier: 'flagship',
    liveSupported: false,
  },
  {
    provider: 'anthropic',
    id: 'claude-sonnet-5',
    label: 'Claude Sonnet 5',
    tier: 'balanced',
    liveSupported: false,
  },
  {
    provider: 'anthropic',
    id: 'claude-opus-4-8',
    label: 'Claude Opus 4.8',
    tier: 'previous',
    liveSupported: false,
  },
  {
    provider: 'anthropic',
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    tier: 'previous',
    liveSupported: false,
  },
  {
    provider: 'anthropic',
    id: 'claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    tier: 'fast',
    liveSupported: false,
  },
  // Google — Gemini 3.x Flash + Pro preview + 2.5 still GA
  {
    provider: 'google',
    id: 'gemini-3.6-flash',
    label: 'Gemini 3.6 Flash',
    tier: 'balanced',
    liveSupported: false,
  },
  {
    provider: 'google',
    id: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash',
    tier: 'balanced',
    liveSupported: false,
  },
  {
    provider: 'google',
    id: 'gemini-3.5-flash-lite',
    label: 'Gemini 3.5 Flash-Lite',
    tier: 'fast',
    liveSupported: false,
  },
  {
    provider: 'google',
    id: 'gemini-3.1-pro-preview',
    label: 'Gemini 3.1 Pro',
    tier: 'flagship',
    liveSupported: false,
  },
  {
    provider: 'google',
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash-Lite',
    tier: 'fast',
    liveSupported: false,
  },
  {
    provider: 'google',
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    tier: 'previous',
    liveSupported: false,
  },
  {
    provider: 'google',
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    tier: 'previous',
    liveSupported: false,
  },
] as const

const byId = new Map(GEO_MODEL_CATALOG.map((m) => [m.id, m]))

export function getGeoModel(id: string): GeoModelEntry | undefined {
  return byId.get(id)
}

export function catalogDefaultId(): string {
  const hit = GEO_MODEL_CATALOG.find((m) => m.default)
  return hit?.id ?? 'gpt-5.4-nano'
}

/** Recommended preselect (Suggest restores this). */
export function defaultGeoModelIds(): string[] {
  const recommended = GEO_MODEL_CATALOG.filter((m) => m.recommended).map((m) => m.id)
  return recommended.length > 0 ? recommended : [catalogDefaultId()]
}

export function groupCatalogByProvider(): Array<{
  provider: GeoModelProvider
  label: string
  models: GeoModelEntry[]
}> {
  return GEO_MODEL_PROVIDERS.map((p) => ({
    provider: p.id,
    label: p.label,
    models: GEO_MODEL_CATALOG.filter((m) => m.provider === p.id),
  }))
}

/** Provider has at least one live-supported model. */
export function providerIsLive(provider: GeoModelProvider): boolean {
  return GEO_MODEL_CATALOG.some((m) => m.provider === provider && m.liveSupported)
}

/**
 * Search / filter catalog for the Add-model picker.
 * Query matches id or label (case-insensitive). Empty query → all for provider.
 */
export function searchCatalogModels(opts: {
  provider?: GeoModelProvider | 'all'
  query?: string
  excludeIds?: readonly string[]
}): GeoModelEntry[] {
  const provider = opts.provider ?? 'all'
  const q = (opts.query ?? '').trim().toLowerCase()
  const exclude = new Set(opts.excludeIds ?? [])
  return GEO_MODEL_CATALOG.filter((m) => {
    if (exclude.has(m.id)) return false
    if (provider !== 'all' && m.provider !== provider) return false
    if (!q) return true
    return m.id.toLowerCase().includes(q) || m.label.toLowerCase().includes(q)
  })
}

/** Resolve selected ids to catalog entries (unknown ids dropped). */
export function resolveSelectedModels(selectedIds: string[]): GeoModelEntry[] {
  return selectedIds
    .map((id) => byId.get(id))
    .filter((m): m is GeoModelEntry => m != null)
}

/**
 * Models to POST on launch: live-supported selection only.
 * Empty after filter → catalog default so live OpenAI never gets an empty list.
 */
export function modelsForLaunch(selectedIds: string[]): string[] {
  const live = selectedIds
    .map((id) => id.trim())
    .filter(Boolean)
    .filter((id) => byId.get(id)?.liveSupported === true)
  if (live.length > 0) return Array.from(new Set(live))
  return [catalogDefaultId()]
}

export function sameModelSelection(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((id, i) => id === sb[i])
}

export function toggleModelSelection(selected: string[], id: string): string[] {
  if (selected.includes(id)) return selected.filter((x) => x !== id)
  return [...selected, id]
}

export function countDeferredSelected(selectedIds: string[]): number {
  return selectedIds.filter((id) => byId.get(id)?.liveSupported === false).length
}
