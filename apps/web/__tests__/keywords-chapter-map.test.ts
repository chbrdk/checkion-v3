import { describe, expect, it } from 'vitest'
import {
  buildKeywordsChapterModel,
  mapKeywordIdeasToRows,
  mapSerpToAsideRows,
} from '../lib/seo-market/keywords-chapter-map'

describe('keywords chapter map', () => {
  it('maps ideas to ledger rows with score + intent tags', () => {
    const rows = mapKeywordIdeasToRows([
      {
        keyword: 'buy seo toolkit',
        searchVolume: 2400,
        cpc: 1.2,
        competition: 0.55,
        intent: 'transactional',
        difficulty: 22,
      },
      {
        keyword: 'what is seo',
        searchVolume: 880,
        cpc: 0.3,
        competition: 0.2,
        intent: 'informational',
      },
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0]!.tags).toContain('trans')
    expect(rows[0]!.cells.score).toBe('22')
    expect(rows[0]!.cells.intent).toBe('Trans')
    expect(rows[1]!.tags).toContain('info')
  })

  it('maps SERP items to dual page cells', () => {
    const rows = mapSerpToAsideRows({
      projectId: 'p1',
      keyword: 'acme',
      source: 'fixture',
      stubbed: true,
      fetchedAt: new Date().toISOString(),
      items: [
        {
          rank: 1,
          domain: 'acme.example',
          url: 'https://acme.example/',
          title: 'Acme home',
        },
      ],
    })
    expect(rows[0]!.cells.rank).toBe('1')
    const page = rows[0]!.cells.page
    expect(typeof page === 'object' && page && page.primary).toBe('Acme home')
  })

  it('builds a live-ready keywords chapter model', () => {
    const model = buildKeywordsChapterModel({
      projectId: 'p1',
      projectName: 'Acme',
      domain: 'acme.example',
      seed: 'acme platform',
      locale: 'de',
      location: 'Germany',
      recent: ['acme platform'],
      ideas: [
        {
          keyword: 'acme platform',
          searchVolume: 4400,
          cpc: 1.1,
          competition: 0.4,
          intent: 'informational',
          difficulty: 18,
        },
      ],
      serp: {
        projectId: 'p1',
        keyword: 'acme platform',
        source: 'fixture',
        stubbed: true,
        fetchedAt: new Date().toISOString(),
        items: [
          {
            rank: 1,
            domain: 'acme.example',
            url: 'https://acme.example/',
            title: 'Acme',
          },
        ],
      },
    })
    expect(model.searchBand?.seed).toBe('acme platform')
    expect(model.searchBand?.seedLabel).toBe('Seed')
    expect(model.searchBand?.actionLabel).toBe('Research')
    expect(model.rows).toHaveLength(1)
    expect(model.ledgerMeta).toBe('Ideas · 1')
    expect(model.pageSize).toBe(25)
    expect(model.aside?.ledger?.title).toBe('SERP snapshot')
    expect(model.aside?.ledger?.rows).toHaveLength(1)
    expect(model.stats?.[0]?.value).toBe('1')
  })
})
