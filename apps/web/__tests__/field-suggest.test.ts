import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  fixtureFieldSuggestions,
  suggestFieldKeywordsViaQwen,
  FieldSuggestError,
} from '../lib/seo-market/field-suggest'

describe('field-suggest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.OPENROUTER_API_KEY
  })

  it('builds deterministic fixture keywords from domain brand', () => {
    const kw = fixtureFieldSuggestions({
      domain: 'vaillant-group.com',
      locale: 'de',
    })
    expect(kw.length).toBeGreaterThanOrEqual(5)
    expect(kw.some((k) => /vergleich|alternative|preis/i.test(k))).toBe(true)
    expect(kw.every((k) => k.toLowerCase() !== 'vaillant')).toBe(true)
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

  it('fails closed without OPENROUTER_API_KEY', async () => {
    await expect(
      suggestFieldKeywordsViaQwen({
        domain: 'acme.example',
        projectName: 'Acme',
        locale: 'de',
      }),
    ).rejects.toMatchObject({ code: 'unconfigured' } satisfies Partial<FieldSuggestError>)
  })

  it('parses OpenRouter JSON keywords', async () => {
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
    expect(keywords.length).toBeGreaterThanOrEqual(3)
  })
})
