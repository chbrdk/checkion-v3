import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  candidatesFromKnowledge,
  fixtureFieldSuggestions,
  sanitizeSuggestKeywords,
  suggestFieldKeywordsViaQwen,
  FieldSuggestError,
} from '../lib/seo-market/field-suggest'
import { brandSeedFromHost, isJunkKeywordToken } from '../lib/seo-market/host-utils'

describe('field-suggest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.OPENROUTER_API_KEY
  })

  it('builds deterministic fixture keywords from domain brand + project name', () => {
    const kw = fixtureFieldSuggestions({
      domain: 'vaillant-group.com',
      projectName: 'Vaillant Heating',
      locale: 'de',
    })
    expect(kw.length).toBeGreaterThanOrEqual(5)
    expect(kw.some((k) => /vergleich|alternative|erfahrung|kosten/i.test(k))).toBe(true)
    expect(kw.every((k) => k.toLowerCase() !== 'vaillant')).toBe(true)
    expect(kw.every((k) => k.toLowerCase() !== 'www')).toBe(true)
    expect(kw.every((k) => !/wärmepumpe|heizung modernisieren/i.test(k))).toBe(true)
  })

  it('builds research seed fixtures including brand once', () => {
    const kw = fixtureFieldSuggestions({
      domain: 'vaillant-group.com',
      locale: 'de',
      surface: 'research',
    })
    expect(kw[0]?.toLowerCase()).toBe('vaillant-group')
    expect(kw.length).toBeGreaterThanOrEqual(5)
  })

  it('prefers Collection knowledge seeds over generic brand templates', () => {
    const kw = fixtureFieldSuggestions({
      domain: 'acme.example',
      projectName: 'Acme Pharma',
      locale: 'de',
      surface: 'field',
      knowledge: {
        profile: { industry: 'Pharmaceuticals', displayName: 'Acme' },
        researchBrief: { topics: ['oncology trials', 'patient support'] },
        geoContext: {
          seedQueries: ['best oncology trial platform', 'pharma patient hub'],
          queryThemes: ['clinical research'],
          knownCompetitors: [],
        },
      },
    })
    expect(kw.some((k) => /oncology|pharma|clinical/i.test(k))).toBe(true)
    expect(kw.every((k) => k.toLowerCase() !== 'www')).toBe(true)
  })

  it('rejects junk tokens including www', () => {
    expect(isJunkKeywordToken('www')).toBe(true)
    expect(isJunkKeywordToken('HTTPS')).toBe(true)
    expect(brandSeedFromHost('www.acme.example')).toBe('acme')
    const cleaned = sanitizeSuggestKeywords(
      ['www', 'acme', 'acme pricing', 'http', 'com'],
      'acme.example',
      'field',
    )
    expect(cleaned).toEqual(['acme pricing'])
  })

  it('extracts candidates from knowledge pack', () => {
    const c = candidatesFromKnowledge({
      geoContext: {
        seedQueries: ['seed a', 'www'],
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

  it('parses OpenRouter JSON keywords and drops bare brand + www', async () => {
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
                    'www',
                    'wärmepumpe vergleich',
                    'heizung modernisieren',
                    'vaillant',
                    'wärmepumpe fördern',
                    'heizung kosten',
                    'smart home heizung',
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
      projectName: 'Vaillant',
      locale: 'de',
    })
    expect(model).toBe('qwen/qwen3.7-flash')
    expect(keywords).toContain('wärmepumpe vergleich')
    expect(keywords).not.toContain('vaillant')
    expect(keywords).not.toContain('www')
    expect(keywords.length).toBeGreaterThanOrEqual(3)
  })
})
