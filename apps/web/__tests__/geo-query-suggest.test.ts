import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  defaultGeoQueries,
  fixtureSuggestPool,
  mergeQuerySuggestions,
  resolveGeoLaunchUrl,
  sameQueryList,
  suggestGeoQueries,
  urlFromQueryText,
} from '../lib/geo-query-suggest'

describe('geo-query-suggest helpers', () => {
  it('defaultGeoQueries derives host-aware prompts', () => {
    const qs = defaultGeoQueries('https://www.bosch-ebike.com/de/')
    expect(qs[0]).toMatch(/bosch-ebike/i)
    expect(qs.length).toBe(3)
  })

  it('fixtureSuggestPool expands beyond launch defaults', () => {
    const url = 'https://www.bosch-ebike.com/de/'
    const pool = fixtureSuggestPool(url)
    expect(pool.length).toBeGreaterThan(defaultGeoQueries(url).length)
    expect(pool.some((q) => /analysts/i.test(q))).toBe(true)
  })

  it('mergeQuerySuggestions dedupes case-insensitively', () => {
    expect(
      mergeQuerySuggestions(['Best alternatives to acme'], ['best alternatives to ACME', 'New prompt']),
    ).toEqual(['Best alternatives to acme', 'New prompt'])
  })

  it('sameQueryList compares ordered lists', () => {
    expect(sameQueryList(['a', 'b'], ['a', 'b'])).toBe(true)
    expect(sameQueryList(['a', 'b'], ['b', 'a'])).toBe(false)
  })

  it('urlFromQueryText extracts absolute URLs and bare hosts', () => {
    expect(urlFromQueryText('See https://acme.example/path for rivals')).toBe(
      'https://acme.example/path',
    )
    expect(urlFromQueryText('Compare acme.example vs rivals')).toBe('https://acme.example/')
    expect(urlFromQueryText('Best alternatives to bosch-ebike')).toBeNull()
  })

  it('resolveGeoLaunchUrl prefers explicit URL, then query host, then fallback', () => {
    expect(resolveGeoLaunchUrl('https://explicit.example/', ['Compare acme.example'])).toBe(
      'https://explicit.example/',
    )
    expect(resolveGeoLaunchUrl('', ['Who cites acme.example in answers?'])).toBe(
      'https://acme.example/',
    )
    expect(resolveGeoLaunchUrl('', ['No host here'])).toBe('https://www.bosch-ebike.com/de/')
  })
})

describe('suggestGeoQueries', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns fixture host pool when OPENAI_API_KEY is unset', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    const result = await suggestGeoQueries({
      url: 'https://www.bosch-ebike.com/de/',
      existing: defaultGeoQueries('https://www.bosch-ebike.com/de/'),
      max: 4,
    })
    expect(result.source).toBe('fixture')
    expect(result.stubbed).toBe(true)
    expect(result.suggestions.length).toBeGreaterThan(0)
    expect(result.suggestions.every((s) => s.title.length > 0)).toBe(true)
    const existingKeys = new Set(
      defaultGeoQueries('https://www.bosch-ebike.com/de/').map((q) => q.toLowerCase()),
    )
    expect(result.suggestions.every((s) => !existingKeys.has(s.title.toLowerCase()))).toBe(true)
  })
})
