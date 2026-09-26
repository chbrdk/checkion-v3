import { describe, expect, it, vi, afterEach } from 'vitest'
import { publishMarketSuggestBriefToPack } from '../lib/plexon-knowledge-pack'

describe('publishMarketSuggestBriefToPack', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('merges research_brief then profile and geo_context', async () => {
    vi.stubEnv('CHECKION_FEDERATION_MODE', 'live')
    vi.stubEnv('NEXT_PLEXON_BASE_URL', 'https://plexon.test')
    vi.stubEnv('PLEXON_SERVICE_SECRET', 'secret')

    const calls: Array<{ url: string; body: Record<string, unknown> }> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {}
        if (url.endsWith('/knowledge') && (!init?.method || init.method === 'GET')) {
          return {
            ok: true,
            json: async () => ({
              platformProjectId: 'pp-1',
              revision: 3,
              facets: {},
            }),
          }
        }
        calls.push({ url, body })
        return {
          ok: true,
          json: async () => ({ revision: (body.expectedRevision as number) + 1 }),
        }
      }),
    )

    const result = await publishMarketSuggestBriefToPack({
      platformProjectId: 'pp-1',
      runId: 'suggest-1',
      projectId: 'proj-1',
      brief: {
        summary: 'Vaillant builds heat pumps and heating systems for homes.',
        category: 'Heizung',
        products: ['Wärmepumpe', 'Gastherme'],
        services: ['Service'],
        audiences: ['Hausbesitzer'],
      },
      keywords: ['wärmepumpe', 'vaillant wärmepumpe'],
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.facets).toEqual(
        expect.arrayContaining(['research_brief', 'profile', 'geo_context']),
      )
    }
    expect(calls.some((c) => c.url.includes('/facets/research_brief/publish'))).toBe(true)
    expect(calls.some((c) => c.url.includes('/facets/profile/publish'))).toBe(true)
    expect(calls.some((c) => c.url.includes('/facets/geo_context/publish'))).toBe(true)
    const briefCall = calls.find((c) => c.url.includes('research_brief'))
    expect(briefCall?.body.mode).toBe('merge')
    expect((briefCall?.body.provenance as { note?: string })?.note).toBe('market-suggest-agent')
  })
})
