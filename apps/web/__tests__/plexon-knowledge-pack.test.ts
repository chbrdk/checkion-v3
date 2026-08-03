import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  competitorHostsFromEnrichment,
  enrichmentHasSignal,
  packToEnrichment,
  type KnowledgePackResponse,
} from '../lib/plexon-knowledge-pack'
import { suggestGeoQueries } from '../lib/geo-query-suggest'

describe('plexon knowledge pack enrichment', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('maps pack facets into suggest enrichment', () => {
    const pack: KnowledgePackResponse = {
      platformProjectId: 'pp-1',
      revision: 2,
      facets: {
        profile: {
          data: { displayName: 'Acme', industry: 'SaaS', tagline: 'Ship faster' },
        },
        competitive: {
          data: {
            category: 'DevTools',
            competitors: [{ host: 'Rival.COM' }, { host: 'other.example' }],
          },
        },
        research_brief: {
          data: { summary: 'Brief', topics: ['a', 'b'] },
        },
        geo_context: {
          data: {
            queryThemes: ['alternatives'],
            seedQueries: ['Best alternatives to Acme'],
            knownCompetitors: ['third.example'],
          },
        },
      },
    }
    const enrichment = packToEnrichment(pack)
    expect(enrichment.profile?.displayName).toBe('Acme')
    expect(enrichment.competitive?.hosts).toEqual(['rival.com', 'other.example'])
    expect(enrichment.researchBrief?.topics).toEqual(['a', 'b'])
    expect(competitorHostsFromEnrichment(enrichment)).toEqual([
      'rival.com',
      'other.example',
      'third.example',
    ])
    expect(enrichmentHasSignal(enrichment)).toBe(true)
  })

  it('boosts fixture suggest with pack seedQueries', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    const result = await suggestGeoQueries({
      url: 'https://acme.example/',
      companyName: 'Acme',
      knowledge: {
        geoContext: {
          seedQueries: ['Unique pack seed for Acme'],
          queryThemes: ['category leadership'],
        },
        profile: { displayName: 'Acme' },
      },
      max: 4,
    })
    expect(result.usedCollectionKnowledge).toBe(true)
    expect(result.suggestions[0]?.title).toBe('Unique pack seed for Acme')
  })
})
