import { describe, expect, it } from 'vitest'
import {
  buildRankChapterModel,
  mapRankSnapshotsToRows,
} from '../lib/seo-market/rank-chapter-map'

describe('rank chapter map', () => {
  it('maps snapshots into dual rows with movement tags', () => {
    const rows = mapRankSnapshotsToRows(
      [
        {
          keyword: 'acme platform',
          rank: 4,
          url: 'https://acme.example/',
          fetchedAt: new Date().toISOString(),
          device: 'desktop',
        },
        {
          keyword: 'deep term',
          rank: 28,
          url: 'https://acme.example/deep',
          fetchedAt: new Date().toISOString(),
          device: 'mobile',
        },
      ],
      'acme.example',
    )
    expect(rows).toHaveLength(2)
    expect(rows[0]!.cells.position).toBe('4')
    expect(rows[0]!.cells.volume).toBeUndefined()
    expect(rows[0]!.cells.checked).toBeTruthy()
    expect(typeof rows[0]!.cells.keyword === 'object').toBe(true)
    expect(rows.some((r) => r.tags?.includes('top10') || r.tags?.includes('up') || r.tags?.includes('down'))).toBe(
      true,
    )
  })

  it('builds a live-ready rank chapter from a config', () => {
    const model = buildRankChapterModel({
      projectId: 'p1',
      projectName: 'Acme',
      domain: 'acme.example',
      seed: 'acme platform',
      locale: 'de',
      location: 'Germany',
      recent: ['acme platform'],
      config: {
        id: 'cfg-1',
        projectId: 'p1',
        domain: 'acme.example',
        locationCode: 2276,
        languageCode: 'de',
        schedule: 'weekly',
        isActive: true,
        keywords: ['acme platform', 'seo workspace'],
        lastCheckedAt: new Date().toISOString(),
        nextCheckAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        latestRunStatus: 'completed',
        latest: [
          {
            keyword: 'acme platform',
            rank: 4,
            url: 'https://acme.example/',
            fetchedAt: new Date().toISOString(),
          },
          {
            keyword: 'seo workspace',
            rank: 12,
            url: 'https://acme.example/seo',
            fetchedAt: new Date().toISOString(),
          },
        ],
      },
    })
    expect(model.searchBand?.seedLabel).toBe('Add to track')
    expect(model.searchBand?.actionLabel).toBe('Track & check')
    expect(model.stats?.[0]?.label).toBe('Monitored')
    expect(model.rows).toHaveLength(2)
    expect(model.ledgerMeta).toBe('Monitored set · 2')
    expect(model.columns.some((c) => c.key === 'volume')).toBe(false)
    expect(model.aside?.ledger?.rows.length).toBeGreaterThan(0)
    expect(model.aside?.charts?.some((c) => c.kind === 'plot')).toBe(true)
    expect(model.lede).toBeUndefined()
  })
})
