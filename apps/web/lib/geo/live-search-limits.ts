/**
 * Layer 2 GEO live-search cost dial — OpenAI + Anthropic caps.
 * Spec: specs/domain/geo-measurement-layers.md · knowledge/geo-measurement-honesty.md
 */

import { paths } from '../paths'
import { searchUserLocation, type GeoSearchMarket } from './search-market'

export type OpenAiSearchContextSize = 'low' | 'medium' | 'high'

function parsePositiveInt(raw: string | undefined, fallback: number, max: number): number {
  if (raw == null || raw.trim() === '') return fallback
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(n, max)
}

/** OpenAI `search_context_size` — how much web context per search (not call count). */
export function resolveOpenAiSearchContextSize(
  env: NodeJS.ProcessEnv = process.env,
): OpenAiSearchContextSize {
  const raw = env[paths.envOpenAiGeoSearchContextSize]?.trim().toLowerCase()
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw
  return paths.openaiGeoSearchContextSizeDefault
}

/**
 * OpenAI Responses `max_tool_calls` — hard cap on built-in tool invocations
 * (including `web_search`) per query×model cell.
 */
export function resolveOpenAiMaxToolCalls(env: NodeJS.ProcessEnv = process.env): number {
  return parsePositiveInt(
    env[paths.envOpenAiGeoMaxToolCalls],
    paths.openaiGeoMaxToolCallsDefault,
    paths.openaiGeoMaxToolCallsHardCap,
  )
}

/** Anthropic hosted web_search `max_uses` per Messages request. */
export function resolveAnthropicWebSearchMaxUses(env: NodeJS.ProcessEnv = process.env): number {
  return parsePositiveInt(
    env[paths.envAnthropicGeoMaxUses],
    paths.anthropicGeoMaxUsesDefault,
    paths.anthropicGeoMaxUsesHardCap,
  )
}

/** Shared OpenAI Responses live-search tool + cap payload (for runner + tests). */
export function buildOpenAiLiveSearchRequestExtras(market: GeoSearchMarket) {
  return {
    tools: [
      {
        type: paths.openaiWebSearchTool,
        user_location: searchUserLocation(market),
        search_context_size: resolveOpenAiSearchContextSize(),
      },
    ],
    tool_choice: 'required' as const,
    max_tool_calls: resolveOpenAiMaxToolCalls(),
  }
}

/** Anthropic web_search tool fields beyond type/name/user_location. */
export function buildAnthropicLiveSearchToolExtras() {
  return {
    max_uses: resolveAnthropicWebSearchMaxUses(),
  }
}
