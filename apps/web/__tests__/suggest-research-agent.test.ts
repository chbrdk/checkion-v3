import { describe, expect, it, vi, afterEach } from 'vitest'
import { discoverDeepLinks } from '../lib/seo-market/url-suggest-context'
import { runMarketSuggestResearchAgent } from '../lib/seo-market/suggest-research-agent'

describe('suggest-research-agent', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.OPENROUTER_API_KEY
  })

  it('discovers same-origin product/about links and skips external hosts', () => {
    const html = `
      <a href="/produkte/waermepumpe">WP</a>
      <a href="https://vaillant-group.com/unternehmen">About</a>
      <a href="https://evil.example/hack">Nope</a>
      <a href="/impressum">Legal</a>
      <a href="mailto:a@b.c">Mail</a>
    `
    const links = discoverDeepLinks(html, 'vaillant-group.com', 4)
    expect(links.some((u) => /produkte/i.test(u))).toBe(true)
    expect(links.some((u) => /unternehmen/i.test(u))).toBe(true)
    expect(links.every((u) => !/evil\.example/i.test(u))).toBe(true)
  })

  it('runs corpus → brief → keywords with mocked site + LLM', async () => {
    process.env.OPENROUTER_API_KEY = 'sk-test'
    let llmCalls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('openrouter.ai') || url.includes('/chat/completions')) {
          llmCalls += 1
          const body = typeof init?.body === 'string' ? init.body : ''
          if (llmCalls === 1 || body.includes('company research analyst')) {
            return {
              ok: true,
              json: async () => ({
                choices: [
                  {
                    message: {
                      content: JSON.stringify({
                        summary:
                          'Vaillant Group develops heating, ventilation and hot-water systems including heat pumps and boilers for residential and commercial buildings.',
                        category: 'Heizung / Wärmepumpe',
                        products: ['Wärmepumpe', 'Gastherme', 'Durchlauferhitzer'],
                        services: ['Heizungsservice', 'Planung'],
                        audiences: ['Hausbesitzer', 'SHK-Handwerk'],
                      }),
                    },
                  },
                ],
              }),
            }
          }
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
                        'berghauser straße 40',
                      ],
                    }),
                  },
                },
              ],
            }),
          }
        }
        // Site HTML
        if (url.includes('vaillant-group.com')) {
          const isHome = /vaillant-group\.com\/?$/.test(url.replace(/https?:\/\//, ''))
          const html = isHome
            ? `<html><head><title>Vaillant – Heizsysteme</title>
               <meta name="description" content="Wärmepumpen und Heiztechnik."/></head>
               <body><h1>Wärme für Zuhause</h1>
               <a href="/produkte/waermepumpe">Wärmepumpe</a>
               <p>Vaillant fertigt Wärmepumpen, Thermen und Warmwasserlösungen.</p>
               </body></html>`
            : `<html><head><title>Wärmepumpe</title></head>
               <body><h1>Wärmepumpen</h1>
               <p>Luft-Wasser-Wärmepumpe für Einfamilienhäuser, Förderung und Installation.</p>
               </body></html>`
          return {
            ok: true,
            headers: { get: () => 'text/html' },
            text: async () => html,
          }
        }
        return { ok: false, status: 404, headers: { get: () => '' }, text: async () => '' }
      }),
    )

    const result = await runMarketSuggestResearchAgent({
      surface: 'ranks',
      domain: 'vaillant-group.com',
      projectName: 'Vaillant Group - SEO',
      locale: 'de',
    })

    expect(result.brief.summary).toMatch(/heat pumps|Wärmepumpe|heating/i)
    expect(result.brief.products.some((p) => /wärmepumpe/i.test(p))).toBe(true)
    expect(result.keywords).toContain('wärmepumpe')
    expect(result.keywords).not.toContain('vaillant vergleich')
    expect(result.keywords.every((k) => !/straße|geschäftsführer/i.test(k))).toBe(true)
    expect(result.agent.steps).toContain('distill_brief')
    expect(result.agent.steps).toContain('generate_keywords')
    expect(result.agent.pagesFetched.length).toBeGreaterThanOrEqual(1)
    expect(llmCalls).toBeGreaterThanOrEqual(2)
  })
})
