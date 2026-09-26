import { describe, expect, it } from 'vitest'
import type { SeoProjectOverview } from '@checkion-v3/contracts'
import {
  buildSeedHintsFromOverview,
  buildSeoDashboardFromOverview,
} from '../lib/seo-market/dashboard-from-overview'

function baseOverview(partial: Partial<SeoProjectOverview> = {}): SeoProjectOverview {
  return {
    projectId: 'proj-1',
    domain: 'vaillant.de',
    domainSnapshot: null,
    backlinkSnapshot: null,
    rankConfigs: [],
    savedKeywordCount: 0,
    ...partial,
  }
}

describe('dashboard-from-overview', () => {
  it('marks setup steps from live overview and fills cards', () => {
    const model = buildSeoDashboardFromOverview({
      projectName: 'Vaillant',
      overview: baseOverview({
        savedKeywordCount: 4,
        rankConfigs: [
          {
            id: 'rc1',
            domain: 'vaillant.de',
            keywordCount: 6,
            lastCheckedAt: '2026-09-26T10:00:00.000Z',
          },
        ],
        domainSnapshot: {
          id: 'ds1',
          projectId: 'proj-1',
          domain: 'vaillant.de',
          organicKeywords: 1200,
          organicTraffic: 18000,
          organicCost: 4200,
          topKeywords: [
            {
              keyword: 'wärmepumpe',
              searchVolume: 1000,
              cpc: 1,
              competition: 0.4,
              difficulty: 40,
            },
          ],
          source: 'dataforseo',
          stubbed: false,
          fetchedAt: '2026-09-26T10:00:00.000Z',
          capturedAt: '2026-09-26T10:00:00.000Z',
        },
        backlinkSnapshot: {
          id: 'bl1',
          projectId: 'proj-1',
          domain: 'vaillant.de',
          referringDomains: 400,
          backlinks: 2800,
          rank: 68,
          spamScore: 3,
          lostBacklinks: 2,
          source: 'dataforseo',
          stubbed: false,
          fetchedAt: '2026-09-26T10:00:00.000Z',
          capturedAt: '2026-09-26T10:00:00.000Z',
        },
      }),
    })

    expect(model.setupSteps.find((s) => s.id === 'domain')?.status).toBe('done')
    expect(model.setupSteps.find((s) => s.id === 'keywords')?.status).toBe('done')
    expect(model.setupSteps.find((s) => s.id === 'rank')?.status).toBe('done')
    expect(model.nextStepId).toBe('gsc')
    expect(model.cards.find((c) => c.key === 'domain')?.hasData).toBe(true)
    expect(model.cards.find((c) => c.key === 'backlinks')?.hasData).toBe(true)
    expect(model.cards.find((c) => c.key === 'rank')?.hasData).toBe(true)
    expect(model.seedHints?.[0]).toBe('vaillant')
    expect(model.seedHints).toContain('wärmepumpe')
  })

  it('keeps empty cards when no snapshots', () => {
    const model = buildSeoDashboardFromOverview({
      projectName: 'Fresh',
      overview: baseOverview({ domain: 'fresh.example' }),
    })
    expect(model.setupSteps.find((s) => s.id === 'keywords')?.status).toBe('todo')
    expect(model.nextStepId).toBe('keywords')
    expect(model.cards.every((c) => c.hasData === false)).toBe(true)
    expect(buildSeedHintsFromOverview(baseOverview({ domain: 'fresh.example' }))).toEqual([
      'fresh',
    ])
  })
})
