import { describe, expect, it } from 'vitest'
import {
  GEO_MODEL_CATALOG,
  catalogDefaultId,
  countDeferredSelected,
  defaultGeoModelIds,
  getGeoModel,
  groupCatalogByProvider,
  modelsForLaunch,
  sameModelSelection,
  toggleModelSelection,
} from '../lib/geo/model-catalog'

describe('geo model catalog', () => {
  it('covers OpenAI, Anthropic, and Google with current ids', () => {
    const providers = new Set(GEO_MODEL_CATALOG.map((m) => m.provider))
    expect(providers).toEqual(new Set(['openai', 'anthropic', 'google']))
    expect(getGeoModel('gpt-5.4-nano')?.default).toBe(true)
    expect(getGeoModel('gpt-5.6-sol')?.liveSupported).toBe(true)
    expect(getGeoModel('claude-sonnet-5')?.liveSupported).toBe(false)
    expect(getGeoModel('gemini-3.6-flash')?.liveSupported).toBe(false)
    expect(GEO_MODEL_CATALOG.every((m) => m.id.trim().length > 0)).toBe(true)
  })

  it('defaults and recommends gpt-5.4-nano', () => {
    expect(catalogDefaultId()).toBe('gpt-5.4-nano')
    expect(defaultGeoModelIds()).toEqual(['gpt-5.4-nano'])
  })

  it('groups by provider in stable order', () => {
    const groups = groupCatalogByProvider()
    expect(groups.map((g) => g.provider)).toEqual(['openai', 'anthropic', 'google'])
    expect(groups.every((g) => g.models.length > 0)).toBe(true)
  })

  it('filters launch payload to live-supported models with default fallback', () => {
    expect(modelsForLaunch(['gpt-5.4-nano', 'claude-sonnet-5'])).toEqual(['gpt-5.4-nano'])
    expect(modelsForLaunch(['claude-sonnet-5', 'gemini-3.6-flash'])).toEqual(['gpt-5.4-nano'])
    expect(modelsForLaunch([])).toEqual(['gpt-5.4-nano'])
    expect(modelsForLaunch(['gpt-5.6-luna', 'gpt-5.6-sol'])).toEqual([
      'gpt-5.6-luna',
      'gpt-5.6-sol',
    ])
  })

  it('toggles selection and compares order-insensitively', () => {
    expect(toggleModelSelection(['gpt-5.4-nano'], 'gpt-5.6-luna')).toEqual([
      'gpt-5.4-nano',
      'gpt-5.6-luna',
    ])
    expect(toggleModelSelection(['gpt-5.4-nano'], 'gpt-5.4-nano')).toEqual([])
    expect(sameModelSelection(['a', 'b'], ['b', 'a'])).toBe(true)
    expect(sameModelSelection(['a'], ['a', 'b'])).toBe(false)
    expect(countDeferredSelected(['gpt-5.4-nano', 'claude-opus-5'])).toBe(1)
  })
})
