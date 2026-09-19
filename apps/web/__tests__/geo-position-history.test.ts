import { describe, expect, it } from 'vitest'
import {
  avgPositionFromModels,
  buildGeoPositionHistory,
  clampGeoHistoryJobLimit,
  computeGeoHistoryTrend,
  geoHistoryTeaserSeries,
  normalizeGeoQueryKey,
} from '../lib/geo/position-history'
import { GEO_OVERVIEWS } from '../lib/fixtures/geo-jobs'
import type { GeoOverview } from '@checkion-v3/contracts'

describe('normalizeGeoQueryKey', () => {
  it('NFC-trims-collapses-casefolds', () => {
    expect(normalizeGeoQueryKey('  Best   Paint  ')).toBe('best paint')
    expect(normalizeGeoQueryKey('Dürr vs ABB')).toBe('dürr vs abb')
  })
})

describe('computeGeoHistoryTrend', () => {
  it('classifies improving / declining / stable / unknown', () => {
    expect(computeGeoHistoryTrend([{ avgPosition: 3 }, { avgPosition: 2 }])).toBe('improving')
    expect(computeGeoHistoryTrend([{ avgPosition: 1 }, { avgPosition: 3 }])).toBe('declining')
    expect(computeGeoHistoryTrend([{ avgPosition: 2 }, { avgPosition: 2.2 }])).toBe('stable')
    expect(computeGeoHistoryTrend([{ avgPosition: 2 }])).toBe('unknown')
  })
})

describe('avgPositionFromModels', () => {
  it('ignores null and zero', () => {
    expect(avgPositionFromModels({ a: 2, b: null, c: 4 })).toBe(3)
    expect(avgPositionFromModels({ a: null })).toBeNull()
  })
})

describe('clampGeoHistoryJobLimit', () => {
  it('defaults and caps', () => {
    expect(clampGeoHistoryJobLimit(null)).toBe(30)
    expect(clampGeoHistoryJobLimit('2')).toBe(2)
    expect(clampGeoHistoryJobLimit('99')).toBe(50)
  })
})

describe('buildGeoPositionHistory', () => {
  it('soft-matches geo-1 and geo-1-prior on shared queries', () => {
    const result = buildGeoPositionHistory({
      projectId: 'proj-demo-1',
      measurement: 'recall',
      overviews: GEO_OVERVIEWS,
    })
    expect(result.targetHost).toBe('durr.com')
    const q1 = result.items.find((i) =>
      i.queryKey.includes('best paint application'),
    )
    expect(q1).toBeTruthy()
    expect(q1!.points.length).toBeGreaterThanOrEqual(2)
    expect(q1!.points[0]!.jobId).toBe('geo-1-prior')
    expect(q1!.points.at(-1)!.jobId).toBe('geo-1')
    expect(q1!.trend).toBe('improving')
  })

  it('does not mix live and recall', () => {
    const liveClone: GeoOverview = {
      ...structuredClone(GEO_OVERVIEWS.find((o) => o.job.id === 'geo-1')!),
      job: {
        ...GEO_OVERVIEWS.find((o) => o.job.id === 'geo-1')!.job,
        id: 'geo-1-live',
        measurement: 'live',
      },
    }
    const result = buildGeoPositionHistory({
      projectId: 'proj-demo-1',
      measurement: 'live',
      overviews: [...GEO_OVERVIEWS, liveClone],
    })
    expect(result.items.every((i) => i.points.every((p) => p.jobId === 'geo-1-live'))).toBe(
      true,
    )
  })
})

describe('geoHistoryTeaserSeries', () => {
  it('keeps only overlapping queries with ≥2 points', () => {
    const history = buildGeoPositionHistory({
      projectId: 'proj-demo-1',
      measurement: 'recall',
      overviews: GEO_OVERVIEWS,
    })
    const geo1 = GEO_OVERVIEWS.find((o) => o.job.id === 'geo-1')!
    const queries = Array.from(new Set(geo1.queryRuns.map((r) => r.query)))
    const teaser = geoHistoryTeaserSeries(history, queries)
    expect(teaser.length).toBeGreaterThanOrEqual(1)
    expect(teaser.every((s) => s.points.length >= 2)).toBe(true)

    const empty = geoHistoryTeaserSeries(history, ['totally unique prompt xyz'])
    expect(empty).toEqual([])
  })
})
