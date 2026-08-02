import { describe, expect, it } from 'vitest'
import type { GeoOverview } from '@checkion-v3/contracts'
import {
  geoOverviewReadyForMagazine,
  isGeoJobInProgress,
  isGeoOverviewEmptySuccess,
  isGeoOverviewFailed,
} from '../lib/geo-job-display'
import { buildQueuedGeoOverview } from '../lib/geo-eeat/finalize-overview'

function completedEmpty(): GeoOverview {
  const queued = buildQueuedGeoOverview({
    jobId: 'geo-empty',
    projectId: 'proj-1',
    url: 'https://example.com',
    queries: ['best widgets'],
    models: ['gpt-5.4-nano'],
    competitors: [],
  })
  return {
    ...queued,
    job: {
      ...queued.job,
      status: 'completed',
      completedAt: new Date().toISOString(),
    },
  }
}

describe('geo-job-display', () => {
  it('treats queued and running as in progress', () => {
    expect(isGeoJobInProgress('queued')).toBe(true)
    expect(isGeoJobInProgress('running')).toBe(true)
    expect(isGeoJobInProgress('completed')).toBe(false)
    expect(isGeoJobInProgress('failed')).toBe(false)
  })

  it('flags completed shells with no queryRuns as empty success / failed', () => {
    const empty = completedEmpty()
    expect(isGeoOverviewEmptySuccess(empty)).toBe(true)
    expect(isGeoOverviewFailed(empty)).toBe(true)
    expect(geoOverviewReadyForMagazine(empty)).toBe(false)
  })

  it('does not treat queued shells as failed magazine', () => {
    const queued = buildQueuedGeoOverview({
      jobId: 'geo-q',
      projectId: 'proj-1',
      url: 'https://example.com',
      queries: ['q'],
      models: ['gpt-5.4-nano'],
      competitors: [],
    })
    expect(isGeoOverviewFailed(queued)).toBe(false)
    expect(geoOverviewReadyForMagazine(queued)).toBe(false)
    expect(isGeoJobInProgress(queued.job.status)).toBe(true)
  })
})
