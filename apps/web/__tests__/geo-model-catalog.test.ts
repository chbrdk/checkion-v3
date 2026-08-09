import { describe, expect, it } from 'vitest'
import {
  GEO_EQC_DEFAULT_MODEL_IDS,
  GEO_MODEL_CATALOG,
  catalogDefaultId,
  countDeferredSelected,
  defaultGeoModelIds,
  getGeoModel,
  groupCatalogByProvider,
  modelsForLaunch,
  providerIsLive,
  resolveSelectedModels,
  sameModelSelection,
  searchCatalogModels,
  toggleModelSelection,
} from '../lib/geo/model-catalog'

describe('geo model catalog', () => {
  it('covers OpenAI, Anthropic, and Google with current ids', () => {
    const providers = new Set(GEO_MODEL_CATALOG.map((m) => m.provider))
    expect(providers).toEqual(new Set(['openai', 'anthropic', 'google']))
    expect(getGeoModel('gpt-5.6-luna')?.default).toBe(true)
    expect(getGeoModel('gpt-5.6-sol')?.liveSupported).toBe(true)
    expect(getGeoModel('claude-sonnet-5')?.liveSupported).toBe(true)
    expect(getGeoModel('gemini-3.6-flash')?.liveSupported).toBe(true)
    expect(getGeoModel('claude-opus-5')?.liveSupported).toBe(false)
    expect(GEO_MODEL_CATALOG.every((m) => m.id.trim().length > 0)).toBe(true)
  })

  it('defaults and recommends the compact multi-provider set', () => {
    expect(catalogDefaultId()).toBe('gpt-5.6-luna')
    const recommended = defaultGeoModelIds()
    expect(recommended).toEqual([...GEO_EQC_DEFAULT_MODEL_IDS])
    expect(recommended.length).toBe(5)
  })

  it('groups by provider in stable order', () => {
    const groups = groupCatalogByProvider()
    expect(groups.map((g) => g.provider)).toEqual(['openai', 'anthropic', 'google'])
    expect(groups.every((g) => g.models.length > 0)).toBe(true)
  })

  it('searches and filters catalog for the Add-model picker', () => {
    expect(searchCatalogModels({ provider: 'openai' }).every((m) => m.provider === 'openai')).toBe(
      true,
    )
    expect(searchCatalogModels({ query: 'sonnet' }).map((m) => m.id)).toEqual(
      expect.arrayContaining(['claude-sonnet-5', 'claude-sonnet-4-6']),
    )
    expect(searchCatalogModels({ provider: 'google', query: '3.6' }).map((m) => m.id)).toEqual([
      'gemini-3.6-flash',
    ])
    expect(searchCatalogModels({ query: 'no-such-model' })).toEqual([])
    expect(
      searchCatalogModels({ provider: 'all', excludeIds: ['gpt-5.6-luna'] }).some(
        (m) => m.id === 'gpt-5.6-luna',
      ),
    ).toBe(false)
  })

  it('resolves selection and provider live flags', () => {
    expect(resolveSelectedModels(['gpt-5.6-luna', 'missing']).map((m) => m.id)).toEqual([
      'gpt-5.6-luna',
    ])
    expect(providerIsLive('openai')).toBe(true)
    expect(providerIsLive('anthropic')).toBe(true)
    expect(providerIsLive('google')).toBe(true)
  })

  it('filters launch payload to live-supported models with default fallback', () => {
    expect(modelsForLaunch(['gpt-5.6-luna', 'claude-opus-5'])).toEqual(['gpt-5.6-luna'])
    expect(modelsForLaunch(['claude-opus-5'])).toEqual(['gpt-5.6-luna'])
    expect(modelsForLaunch([])).toEqual(['gpt-5.6-luna'])
    expect(modelsForLaunch(['claude-sonnet-5', 'gemini-3.6-flash'])).toEqual([
      'claude-sonnet-5',
      'gemini-3.6-flash',
    ])
    expect(modelsForLaunch(['gpt-5.6-luna', 'gpt-5.6-sol'])).toEqual([
      'gpt-5.6-luna',
      'gpt-5.6-sol',
    ])
  })

  it('toggles selection and compares order-insensitively', () => {
    expect(toggleModelSelection(['gpt-5.6-luna'], 'gpt-5.4-nano')).toEqual([
      'gpt-5.6-luna',
      'gpt-5.4-nano',
    ])
    expect(toggleModelSelection(['gpt-5.6-luna'], 'gpt-5.6-luna')).toEqual([])
    expect(sameModelSelection(['a', 'b'], ['b', 'a'])).toBe(true)
    expect(sameModelSelection(['a'], ['a', 'b'])).toBe(false)
    expect(countDeferredSelected(['gpt-5.6-luna', 'claude-opus-5'])).toBe(1)
  })
})
