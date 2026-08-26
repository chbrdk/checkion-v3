import { describe, expect, it } from 'vitest'
import { computeProjectActivityMetrics, isStandaloneScan } from '../lib/project-activity'

describe('project activity metrics', () => {
  it('counts singles + deep + geo and ignores deep page-scan rows', () => {
    const metrics = computeProjectActivityMetrics('proj-1', {
      scans: [
        {
          id: 's-single',
          projectId: 'proj-1',
          domainScanId: undefined,
          completedAt: '2026-08-20T12:00:00.000Z',
          startedAt: '2026-08-20T11:00:00.000Z',
        },
        {
          id: 's-deep-page',
          projectId: 'proj-1',
          domainScanId: 'dom-1',
          completedAt: '2026-08-21T12:00:00.000Z',
          startedAt: '2026-08-21T11:00:00.000Z',
        },
        {
          id: 's-other',
          projectId: 'proj-2',
          domainScanId: undefined,
          completedAt: '2026-08-22T12:00:00.000Z',
          startedAt: '2026-08-22T11:00:00.000Z',
        },
      ],
      domains: [
        {
          id: 'dom-1',
          projectId: 'proj-1',
          completedAt: '2026-08-21T13:00:00.000Z',
          startedAt: '2026-08-21T10:00:00.000Z',
        },
      ],
      geoJobs: [
        {
          id: 'geo-1',
          projectId: 'proj-1',
          completedAt: '2026-08-19T12:00:00.000Z',
        },
        {
          id: 'geo-2',
          projectId: 'proj-2',
          completedAt: '2026-08-23T12:00:00.000Z',
        },
      ],
    })

    expect(isStandaloneScan({ domainScanId: undefined })).toBe(true)
    expect(isStandaloneScan({ domainScanId: 'dom-1' })).toBe(false)
    expect(metrics.scanCount).toBe(3)
    expect(metrics.lastScanAt).toBe('2026-08-21T13:00:00.000Z')
    expect(metrics.recentScanIds[0]).toBe('dom-1')
  })
})
