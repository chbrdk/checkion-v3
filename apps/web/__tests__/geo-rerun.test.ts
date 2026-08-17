import { describe, expect, it } from 'vitest'
import type { GeoOverview } from '@checkion-v3/contracts'
import { finalizeGeoOverview } from '../lib/geo-eeat/finalize-overview'
import { buildGeoRerunPayload } from '../lib/geo-rerun'
import { catalogDefaultId } from '../lib/geo/model-catalog'

function sampleOverview(overrides?: {
  job?: Partial<GeoOverview['job']>
  models?: string[]
  queries?: string[]
}): GeoOverview {
  const queries = overrides?.queries ?? ['Welche Einrichtungshäuser bieten Montage?']
  const models = overrides?.models ?? ['gpt-5.4-nano']
  return finalizeGeoOverview({
    job: {
      id: 'geo-test',
      title: 'Test GEO',
      projectId: 'proj-1',
      url: 'https://www.moebel-martin.de',
      status: 'completed',
      overallScore: 50,
      completedAt: '2026-08-11T12:00:00.000Z',
      queryCount: queries.length,
      modelCount: models.length,
      citedShare: 50,
      ...overrides?.job,
    },
    lede: 'Test',
    targetHost: 'moebel-martin.de',
    models,
    queries,
    competitors: ['ikea.com'],
    positionMatrix: [],
    queryRuns: queries.map((query, i) => ({
      queryId: `q-${i}`,
      query,
      modelId: models[0] ?? 'gpt-5.4-nano',
      answerText: '…',
      citations: [{ domain: 'moebel-martin.de', position: 1 }],
      ourPosition: 1,
    })),
  })
}

describe('buildGeoRerunPayload', () => {
  it('clones url, queries, competitors, project, and title', () => {
    const payload = buildGeoRerunPayload(sampleOverview())
    expect(payload).toEqual({
      projectId: 'proj-1',
      url: 'https://www.moebel-martin.de',
      queries: ['Welche Einrichtungshäuser bieten Montage?'],
      models: ['gpt-5.4-nano'],
      competitors: ['ikea.com'],
      title: 'Test GEO',
      measurement: 'recall',
    })
  })

  it('clones live measurement as a standalone layer', () => {
    const payload = buildGeoRerunPayload(
      sampleOverview({ job: { measurement: 'live' } }),
    )
    expect(payload?.measurement).toBe('live')
  })

  it('returns null when queries are empty', () => {
    expect(buildGeoRerunPayload(sampleOverview({ queries: [] }))).toBeNull()
  })

  it('falls back to catalog default when no live-supported models remain', () => {
    const payload = buildGeoRerunPayload(
      sampleOverview({ models: ['claude-opus', 'llama-4-maverick'] }),
    )
    expect(payload?.models).toEqual([catalogDefaultId()])
  })
})
