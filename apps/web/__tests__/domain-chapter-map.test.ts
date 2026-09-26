import { describe, expect, it } from 'vitest'
import {
  buildDomainChapterModel,
  mapDomainKeywordsToRows,
} from '../lib/seo-market/domain-chapter-map'

describe('domain chapter map', () => {
  it('maps top keywords into dual rows with position bands', () => {
    const rows = mapDomainKeywordsToRows(
      [
        {
          keyword: 'acme platform',
          searchVolume: 4400,
          cpc: 1.1,
          competition: 0.4,
          difficulty: 6,
        },
        {
          keyword: 'deep ranking term',
          searchVolume: 200,
          cpc: 0.2,
          competition: 0.1,
          difficulty: 60,
        },
      ],
      'acme.example',
    )
    expect(rows).toHaveLength(2)
    expect(rows[0]!.tags).toContain('top10')
    const kw = rows[0]!.cells.keyword
    expect(typeof kw === 'object' && kw && kw.primary).toBe('acme platform')
    expect(rows[1]!.tags).toContain('deep')
  })

  it('builds a live-ready domain chapter model from a snapshot', () => {
    const model = buildDomainChapterModel({
      projectId: 'p1',
      projectName: 'Acme',
      domain: 'acme.example',
      seed: 'acme.example',
      locale: 'de',
      location: 'Germany',
      recent: ['acme.example'],
      snapshot: {
        id: 'snap-1',
        projectId: 'p1',
        domain: 'acme.example',
        organicKeywords: 1120,
        organicTraffic: 18400,
        organicCost: 4200,
        topKeywords: [
          {
            keyword: 'acme platform',
            searchVolume: 4400,
            cpc: 1.1,
            competition: 0.4,
            difficulty: 8,
          },
        ],
        source: 'fixture',
        stubbed: true,
        fetchedAt: new Date().toISOString(),
        capturedAt: new Date().toISOString(),
      },
    })
    expect(model.searchBand?.seedLabel).toBe('Domain')
    expect(model.stats?.find((s) => s.label === 'Organic KW')?.value).toBe('1.120')
    expect(model.rows).toHaveLength(1)
    expect(model.ledgerMeta).toBe('Top keywords · 1')
    expect(model.aside?.ledger?.rows.length).toBeGreaterThan(0)
    expect(model.lede).toBeUndefined()
  })
})
