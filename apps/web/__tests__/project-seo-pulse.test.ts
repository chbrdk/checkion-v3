import { describe, expect, it } from 'vitest'
import type { SeoProjectOverview } from '@checkion-v3/contracts'
import { buildProjectSeoPulse } from '../lib/seo-market/project-seo-pulse'

function baseOverview(over: Partial<SeoProjectOverview> = {}): SeoProjectOverview {
  return {
    projectId: 'proj-1',
    domain: 'example.com',
    domainSnapshot: null,
    backlinkSnapshot: null,
    competitorSnapshot: null,
    gscSnapshot: null,
    gscConnected: false,
    rankConfigs: [],
    savedKeywordCount: 0,
    ...over,
  }
}

describe('buildProjectSeoPulse', () => {
  it('returns empty meters and hasData false when overview is bare', () => {
    const pulse = buildProjectSeoPulse(baseOverview())
    expect(pulse.hasData).toBe(false)
    expect(pulse.href).toBe('/projects/proj-1/seo')
    expect(pulse.meters.map((m) => m.id)).toEqual([
      'tracked',
      'refDomains',
      'organicKw',
      'gscClicks',
    ])
    expect(pulse.meters.every((m) => m.value === '—' && !m.linked)).toBe(true)
  })

  it('fills tracked, ref domains, organic KW, and GSC clicks', () => {
    const pulse = buildProjectSeoPulse(
      baseOverview({
        rankConfigs: [
          { id: 'rc-1', domain: 'example.com', keywordCount: 3, lastCheckedAt: null },
          { id: 'rc-2', domain: 'example.com', keywordCount: 2, lastCheckedAt: null },
        ],
        backlinkSnapshot: {
          id: 'bl-1',
          projectId: 'proj-1',
          domain: 'example.com',
          referringDomains: 12,
          backlinks: 100,
          rank: 40,
          spamScore: 3,
          lostBacklinks: 0,
          source: 'fixture',
          stubbed: true,
          fetchedAt: '2026-09-01T00:00:00.000Z',
          capturedAt: '2026-09-01T00:00:00.000Z',
        },
        domainSnapshot: {
          id: 'dom-1',
          projectId: 'proj-1',
          domain: 'example.com',
          organicKeywords: 1500,
          organicTraffic: 200,
          organicCost: 50,
          topKeywords: [],
          source: 'fixture',
          stubbed: true,
          fetchedAt: '2026-09-01T00:00:00.000Z',
          capturedAt: '2026-09-01T00:00:00.000Z',
        },
        gscConnected: true,
        gscSnapshot: {
          id: 'gsc-1',
          projectId: 'proj-1',
          siteUrl: 'https://example.com',
          startDate: '2026-08-01',
          endDate: '2026-08-31',
          source: 'gsc',
          stubbed: true,
          fetchedAt: '2026-09-01T00:00:00.000Z',
          capturedAt: '2026-09-01T00:00:00.000Z',
          items: [
            { query: 'a', clicks: 10, impressions: 100, ctr: 0.1, position: 4 },
            { query: 'b', clicks: 5, impressions: 50, ctr: 0.1, position: 8 },
          ],
        },
      }),
    )
    expect(pulse.hasData).toBe(true)
    expect(pulse.meters.find((m) => m.id === 'tracked')).toMatchObject({
      value: '5',
      linked: true,
    })
    expect(pulse.meters.find((m) => m.id === 'refDomains')).toMatchObject({
      value: '12',
      linked: true,
    })
    expect(pulse.meters.find((m) => m.id === 'organicKw')?.linked).toBe(true)
    expect(pulse.meters.find((m) => m.id === 'gscClicks')).toMatchObject({
      value: '15',
      linked: true,
    })
  })

  it('treats saved keywords alone as hasData', () => {
    const pulse = buildProjectSeoPulse(baseOverview({ savedKeywordCount: 4 }))
    expect(pulse.hasData).toBe(true)
  })

  it('shows 0 tracked when rank configs exist with empty keywords', () => {
    const pulse = buildProjectSeoPulse(
      baseOverview({
        rankConfigs: [
          { id: 'rc-1', domain: 'example.com', keywordCount: 0, lastCheckedAt: null },
        ],
      }),
    )
    expect(pulse.meters.find((m) => m.id === 'tracked')).toMatchObject({
      value: '0',
      linked: true,
    })
    expect(pulse.hasData).toBe(true)
  })
})
