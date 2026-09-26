import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  candidatesFromKnowledge,
  fixtureFieldSuggestions,
  sanitizeSuggestKeywords,
  suggestFieldKeywordsViaQwen,
  FieldSuggestError,
} from '../lib/seo-market/field-suggest'
import {
  brandSeedFromHost,
  displayBrandFromHost,
  isJunkKeywordToken,
  isTrackWorthyKeyword,
  looksLikeSearchQuery,
} from '../lib/seo-market/host-utils'

describe('field-suggest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.OPENROUTER_API_KEY
  })

  it('builds Vaillant track keywords from heating vertical — not brand templates', () => {
    const kw = fixtureFieldSuggestions({
      domain: 'vaillant-group.com',
      projectName: 'Vaillant Group - SEO',
      locale: 'de',
      surface: 'ranks',
    })
    expect(kw.length).toBeGreaterThanOrEqual(5)
    expect(kw.some((k) => /wärmepumpe|gastherme|heizung/i.test(k))).toBe(true)
    expect(kw.every((k) => !/vergleich|alternative|erfahrung|preis$/i.test(k.split(/\s+/).pop() ?? ''))).toBe(
      true,
    )
    expect(kw.every((k) => k.toLowerCase() !== 'vaillant-group vaillant')).toBe(true)
    expect(kw.every((k) => !/straße|berghauser/i.test(k))).toBe(true)
  })

  it('builds research seed fixtures including brand once', () => {
    const kw = fixtureFieldSuggestions({
      domain: 'vaillant-group.com',
      locale: 'de',
      surface: 'research',
    })
    expect(kw.some((k) => k.toLowerCase() === 'vaillant-group')).toBe(true)
    expect(kw.length).toBeGreaterThanOrEqual(5)
  })

  it('prefers Collection knowledge seeds that are track-worthy', () => {
    const kw = fixtureFieldSuggestions({
      domain: 'acme.example',
      projectName: 'Acme Pharma',
      locale: 'de',
      surface: 'field',
      knowledge: {
        profile: { industry: 'Pharmaceuticals', displayName: 'Acme' },
        researchBrief: { topics: ['oncology trials', 'patient support'] },
        geoContext: {
          seedQueries: [
            'best oncology trial platform',
            'berghauser straße 40 remscheid',
            'pharma patient hub',
          ],
          queryThemes: ['clinical research'],
          knownCompetitors: [],
        },
      },
    })
    expect(kw.some((k) => /oncology|pharma|clinical|pharmaceuticals/i.test(k))).toBe(true)
    expect(kw.every((k) => !/berghauser|straße/i.test(k))).toBe(true)
  })

  it('rejects www / URL / address / weak brand templates', () => {
    expect(isJunkKeywordToken('www.google.com')).toBe(true)
    expect(isJunkKeywordToken('berghauser straße 40 remscheid')).toBe(true)
    expect(isTrackWorthyKeyword('vaillant vergleich', 'vaillant-group.com')).toBe(false)
    expect(isTrackWorthyKeyword('vaillant-group Vaillant', 'vaillant-group.com')).toBe(false)
    expect(isTrackWorthyKeyword('vaillant wärmepumpe', 'vaillant-group.com')).toBe(true)
    expect(isTrackWorthyKeyword('wärmepumpe', 'vaillant-group.com')).toBe(true)
    expect(looksLikeSearchQuery('wärmepumpe vergleich')).toBe(true)
    expect(displayBrandFromHost('vaillant-group.com')).toBe('vaillant')
    expect(brandSeedFromHost('www.vaillant-group.com')).toBe('vaillant-group')

    const cleaned = sanitizeSuggestKeywords(
      [
        'www.google.com',
        'vaillant vergleich',
        'vaillant-group Vaillant',
        'berghauser straße 40 remscheid',
        'vaillant wärmepumpe',
        'wärmepumpe',
        'gastherme',
      ],
      'vaillant-group.com',
      'ranks',
    )
    expect(cleaned).toEqual(['vaillant wärmepumpe', 'wärmepumpe', 'gastherme'])
  })

  it('extracts candidates from knowledge pack without addresses', () => {
    const c = candidatesFromKnowledge({
      geoContext: {
        seedQueries: ['seed a', 'www.google.com', 'berghauser straße 40'],
        queryThemes: ['theme b'],
        knownCompetitors: [],
      },
      researchBrief: { topics: ['topic c'] },
    })
    expect(c).toEqual(['seed a', 'theme b', 'topic c'])
  })

  it('fails closed without OPENROUTER_API_KEY', async () => {
    await expect(
      suggestFieldKeywordsViaQwen({
        domain: 'acme.example',
        projectName: 'Acme',
        locale: 'de',
      }),
    ).rejects.toMatchObject({ code: 'unconfigured' } satisfies Partial<FieldSuggestError>)
  })

  it('parses OpenRouter JSON and drops junk / weak templates', async () => {
    process.env.OPENROUTER_API_KEY = 'sk-test'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  keywords: [
                    'www.google.com',
                    'vaillant vergleich',
                    'berghauser straße 40 remscheid',
                    'wärmepumpe',
                    'vaillant wärmepumpe',
                    'gastherme',
                    'förderung wärmepumpe',
                    'heizung modernisieren',
                  ],
                }),
              },
            },
          ],
        }),
      })),
    )
    const { keywords, model } = await suggestFieldKeywordsViaQwen({
      domain: 'vaillant-group.com',
      projectName: 'Vaillant Group - SEO',
      locale: 'de',
    })
    expect(model).toBe('qwen/qwen3.7-flash')
    expect(keywords).toContain('wärmepumpe')
    expect(keywords).not.toContain('vaillant vergleich')
    expect(keywords.every((k) => !/\bwww\b|straße|vergleich/i.test(k))).toBe(true)
    expect(keywords.length).toBeGreaterThanOrEqual(3)
  })
})
