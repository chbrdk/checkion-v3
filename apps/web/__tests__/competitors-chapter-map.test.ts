import { describe, expect, it } from 'vitest'
import {
  buildCompetitorsChapterModel,
  mapCompetitorRows,
} from '../lib/seo-market/competitors-chapter-map'

describe('competitors chapter map', () => {
  it('maps overlap rows into dual rivals with threat bands', () => {
    const rows = mapCompetitorRows(
      [
        { domain: 'rival.io', overlapCount: 9, avgRank: 6.2 },
        { domain: 'soft.example', overlapCount: 2, avgRank: 28 },
      ],
      ['acme platform', 'seo workspace'],
    )
    expect(rows).toHaveLength(2)
    expect(rows[0]!.tags).toContain('high')
    expect(rows[0]!.cells.threat).toBe('High')
    expect(rows[1]!.tags).toContain('low')
    const domain = rows[0]!.cells.domain
    expect(typeof domain === 'object' && domain && domain.primary).toBe('rival.io')
  })

  it('builds a live-ready competitors chapter from an overlap result', () => {
    const model = buildCompetitorsChapterModel({
      projectId: 'p1',
      projectName: 'Acme',
      domain: 'acme.example',
      seed: 'acme platform, seo workspace',
      locale: 'de',
      location: 'Germany',
      recent: ['acme platform, seo workspace'],
      result: {
        projectId: 'p1',
        domain: 'acme.example',
        keywords: ['acme platform', 'seo workspace'],
        source: 'fixture',
        stubbed: true,
        fetchedAt: new Date().toISOString(),
        items: [
          { domain: 'rival.io', overlapCount: 9, avgRank: 6.2 },
          { domain: 'seo-kit.app', overlapCount: 7, avgRank: 8.4 },
          { domain: 'pulsehq.dev', overlapCount: 4, avgRank: 14 },
        ],
      },
    })
    expect(model.searchBand?.seedLabel).toBe('Keyword set')
    expect(model.searchBand?.actionLabel).toBe('Analyze')
    expect(model.stats?.[0]?.label).toBe('Rivals')
    expect(model.stats?.[0]?.value).toBe('3')
    expect(model.rows).toHaveLength(3)
    expect(model.ledgerMeta).toBe('Rival domains · 3')
    expect(model.aside?.charts?.some((c) => c.kind === 'plot')).toBe(true)
    expect(model.aside?.charts?.some((c) => c.kind === 'series')).toBe(true)
    expect(model.aside?.ledger?.rows.length).toBeGreaterThan(0)
    expect(model.lede).toBeUndefined()
  })
})
