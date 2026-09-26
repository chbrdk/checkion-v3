import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  candidatesFromKnowledge,
  fixtureFieldSuggestions,
  sanitizeSuggestKeywords,
  suggestFieldKeywordsViaQwen,
  suggestMarketKeywordsViaQwen,
  FieldSuggestError,
} from '../lib/seo-market/field-suggest'
import {
  brandSeedFromHost,
  displayBrandFromHost,
  isJunkKeywordToken,
  isTrackWorthyKeyword,
} from '../lib/seo-market/host-utils'
import { parseHtmlSuggestContext } from '../lib/seo-market/url-suggest-context'

describe('field-suggest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.OPENROUTER_API_KEY
  })

  it('parses homepage chrome for URL grounding', () => {
    const ctx = parseHtmlSuggestContext(
      `<html><head><title>Vaillant – Wärmepumpen & Heizsysteme</title>
      <meta name="description" content="Heizung, Wärmepumpe und Service fürs Eigenheim."/>
      </head><body><h1>Wärme, die bleibt</h1></body></html>`,
      'https://vaillant-group.com/',
    )
    expect(ctx.title).toMatch(/Wärmepumpen/i)
    expect(ctx.description).toMatch(/Heizung/i)
    expect(ctx.h1).toMatch(/Wärme/i)
  })

  it('stub fixtures prefer knowledge / URL crumbs over heating hardcode', () => {
    const kw = fixtureFieldSuggestions({
      domain: 'acme-pharma.example',
      projectName: 'Acme Pharma',
      locale: 'de',
      surface: 'ranks',
      knowledge: {
        profile: { industry: 'Onkologie', displayName: 'Acme' },
        researchBrief: { topics: [] },
        geoContext: { seedQueries: [], queryThemes: [], knownCompetitors: [] },
      },
    })
    expect(kw.some((k) => /onkologie/i.test(k))).toBe(true)
    expect(kw.every((k) => !/wärmepumpe|gastherme/i.test(k))).toBe(true)
  })

  it('rejects www / URL / address / weak brand templates', () => {
    expect(isJunkKeywordToken('berghauser straße 40 remscheid')).toBe(true)
    expect(isTrackWorthyKeyword('vaillant vergleich', 'vaillant-group.com')).toBe(false)
    expect(isTrackWorthyKeyword('vaillant wärmepumpe', 'vaillant-group.com')).toBe(true)
    expect(displayBrandFromHost('vaillant-group.com')).toBe('vaillant')
    expect(brandSeedFromHost('www.vaillant-group.com')).toBe('vaillant-group')
    const cleaned = sanitizeSuggestKeywords(
      [
        'vaillant vergleich',
        'berghauser straße 40 remscheid',
        'vaillant wärmepumpe',
        'wärmepumpe',
      ],
      'vaillant-group.com',
      'ranks',
    )
    expect(cleaned).toEqual(['vaillant wärmepumpe', 'wärmepumpe'])
  })

  it('extracts candidates from knowledge pack without addresses', () => {
    const c = candidatesFromKnowledge({
      geoContext: {
        seedQueries: ['seed a', 'berghauser straße 40'],
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

  it('passes URL context into Qwen prompt and returns vertical keywords', async () => {
    process.env.OPENROUTER_API_KEY = 'sk-test'
    const fetchMock = vi.fn(async (_url: string, init?: { body?: string }) => {
      const body = typeof init?.body === 'string' ? init.body : ''
      expect(body).toMatch(/Homepage title/i)
      expect(body).toMatch(/Wärmepumpen/i)
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  keywords: [
                    'wärmepumpe',
                    'vaillant wärmepumpe',
                    'gastherme',
                    'förderung wärmepumpe',
                    'heizung modernisieren',
                    'vaillant vergleich',
                  ],
                }),
              },
            },
          ],
        }),
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    const { keywords, model } = await suggestMarketKeywordsViaQwen({
      surface: 'ranks',
      domain: 'vaillant-group.com',
      projectName: 'Vaillant Group - SEO',
      locale: 'de',
      urlContext: {
        url: 'https://vaillant-group.com/',
        title: 'Vaillant – Wärmepumpen & Heizsysteme',
        description: 'Heizung und Wärmepumpe',
        h1: 'Wärme für Zuhause',
      },
    })
    expect(model).toBe('qwen/qwen3.7-flash')
    expect(keywords).toContain('wärmepumpe')
    expect(keywords).not.toContain('vaillant vergleich')
    expect(keywords.length).toBeGreaterThanOrEqual(3)
  })
})
