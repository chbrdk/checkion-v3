import { describe, expect, it } from 'vitest'
import { buildCompetitorsChapterModel } from '../lib/seo-market/competitors-chapter-map'

describe('competitors-chapter-map', () => {
  it('surfaces link competitors as secondary aside ledger', () => {
    const model = buildCompetitorsChapterModel({
      projectId: 'p1',
      projectName: 'Acme',
      domain: 'acme.example',
      seed: 'brand, tool',
      result: {
        domain: 'acme.example',
        keywords: ['brand', 'tool'],
        items: [
          { domain: 'rival.example', overlapCount: 8, avgRank: 4.2 },
          { domain: 'other.example', overlapCount: 3, avgRank: 12 },
        ],
        fetchedAt: new Date().toISOString(),
        unitsUsed: 2,
      },
      linkCompetitors: [
        {
          id: 'lc-1',
          domain: 'link-rival.example',
          intersections: 22,
          rank: 48,
          backlinks: 900,
        },
      ],
    })
    expect(model.rows.length).toBe(2)
    expect(model.aside?.ledger?.title).toBe('Battles they win')
    expect(model.aside?.ledgers?.[0]?.title).toBe('Link competitors')
    expect(model.aside?.ledgers?.[0]?.rows[0]?.cells.domain).toMatchObject({
      primary: 'link-rival.example',
    })
  })
})
