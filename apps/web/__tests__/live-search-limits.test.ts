import { describe, expect, it } from 'vitest'
import {
  buildAnthropicLiveSearchToolExtras,
  buildOpenAiLiveSearchRequestExtras,
  resolveAnthropicWebSearchMaxUses,
  resolveOpenAiMaxToolCalls,
  resolveOpenAiSearchContextSize,
} from '../lib/geo/live-search-limits'
import { paths } from '../lib/paths'

describe('live search limits', () => {
  it('defaults to medium context and 3 tool calls / uses', () => {
    expect(resolveOpenAiSearchContextSize({})).toBe('medium')
    expect(resolveOpenAiMaxToolCalls({})).toBe(3)
    expect(resolveAnthropicWebSearchMaxUses({})).toBe(3)
    expect(paths.openaiGeoSearchContextSizeDefault).toBe('medium')
    expect(paths.openaiGeoMaxToolCallsDefault).toBe(3)
    expect(paths.anthropicGeoMaxUsesDefault).toBe(3)
  })

  it('honours env overrides within hard caps', () => {
    expect(
      resolveOpenAiSearchContextSize({
        [paths.envOpenAiGeoSearchContextSize]: 'low',
      }),
    ).toBe('low')
    expect(
      resolveOpenAiMaxToolCalls({
        [paths.envOpenAiGeoMaxToolCalls]: '2',
      }),
    ).toBe(2)
    expect(
      resolveOpenAiMaxToolCalls({
        [paths.envOpenAiGeoMaxToolCalls]: '99',
      }),
    ).toBe(paths.openaiGeoMaxToolCallsHardCap)
    expect(
      resolveAnthropicWebSearchMaxUses({
        [paths.envAnthropicGeoMaxUses]: '1',
      }),
    ).toBe(1)
  })

  it('rejects invalid env and falls back', () => {
    expect(
      resolveOpenAiSearchContextSize({
        [paths.envOpenAiGeoSearchContextSize]: 'huge',
      }),
    ).toBe('medium')
    expect(
      resolveOpenAiMaxToolCalls({
        [paths.envOpenAiGeoMaxToolCalls]: '0',
      }),
    ).toBe(3)
  })

  it('builds OpenAI Responses extras with required search + cap', () => {
    const extras = buildOpenAiLiveSearchRequestExtras({ country: 'DE', timezone: 'Europe/Berlin' })
    expect(extras.tool_choice).toBe('required')
    expect(extras.max_tool_calls).toBe(paths.openaiGeoMaxToolCallsDefault)
    expect(extras.tools).toHaveLength(1)
    expect(extras.tools[0]).toMatchObject({
      type: paths.openaiWebSearchTool,
      search_context_size: 'medium',
      user_location: { type: 'approximate', country: 'DE', timezone: 'Europe/Berlin' },
    })
  })

  it('builds Anthropic max_uses extras', () => {
    expect(buildAnthropicLiveSearchToolExtras()).toEqual({
      max_uses: paths.anthropicGeoMaxUsesDefault,
    })
  })
})
