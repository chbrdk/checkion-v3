import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { GeoOverview } from '@checkion-v3/contracts'
import { GeoOverviewPanel } from '../components/geo-overview-panel'
import { buildQueuedGeoOverview, finalizeGeoOverview } from '../lib/geo-eeat/finalize-overview'
import { getGeoOverview } from '../lib/fixtures/geo-store'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}))

vi.mock('../components/geo-reading', () => ({
  GeoReading: ({ fallback }: { fallback: string }) => (
    <p data-testid="geo-reading">{fallback}</p>
  ),
}))

describe('GeoOverviewPanel readiness', () => {
  it('queued job shows loading, not empty magazine scores', () => {
    const overview = buildQueuedGeoOverview({
      jobId: 'geo-queued',
      projectId: 'proj-1',
      url: 'https://example.com',
      queries: ['best widgets', 'oem paint'],
      models: ['gpt-5.4-nano'],
      competitors: [],
    })

    render(<GeoOverviewPanel overview={overview} />)

    expect(screen.getByRole('heading', { name: /GEO job queued/i })).toBeTruthy()
    expect(screen.getByText(/Waiting for the live pipeline/i)).toBeTruthy()
    expect(screen.queryByText(/Cited share/i)).toBeNull()
    expect(screen.queryByText(/How answer engines see you/i)).toBeNull()
  })

  it('running job shows in-progress meters', () => {
    const queued = buildQueuedGeoOverview({
      jobId: 'geo-run',
      projectId: 'proj-1',
      url: 'https://example.com',
      queries: ['best widgets'],
      models: ['gpt-5.4-nano'],
      competitors: [],
    })
    const overview: GeoOverview = {
      ...queued,
      job: { ...queued.job, status: 'running' },
      lede: 'Running live GEO…',
    }

    render(<GeoOverviewPanel overview={overview} />)

    expect(screen.getByText(/GEO run in progress/i)).toBeTruthy()
    expect(screen.queryByText(/Cited share/i)).toBeNull()
  })

  it('completed overview with queryRuns shows magazine values', async () => {
    const overview = await getGeoOverview('geo-1')
    expect(overview).toBeTruthy()
    render(<GeoOverviewPanel overview={overview!} />)

    expect(screen.getByText(/How answer engines see you/i)).toBeTruthy()
    expect(screen.getByLabelText(/GEO snapshot/i)).toBeTruthy()
    expect(screen.queryByText(/GEO job queued/i)).toBeNull()
    expect(screen.queryByText(/GEO run failed/i)).toBeNull()
  })

  it('failed status shows error, not success zeros', () => {
    const queued = buildQueuedGeoOverview({
      jobId: 'geo-fail',
      projectId: 'proj-1',
      url: 'https://example.com',
      queries: ['best widgets'],
      models: ['gpt-5.4-nano'],
      competitors: [],
    })
    const overview: GeoOverview = {
      ...queued,
      job: {
        ...queued.job,
        status: 'failed',
        completedAt: new Date().toISOString(),
      },
      lede: 'GEO job failed: OPENAI_API_KEY is required',
    }

    render(<GeoOverviewPanel overview={overview} />)

    expect(screen.getByText(/GEO run failed/i)).toBeTruthy()
    expect(screen.getByText(/OPENAI_API_KEY is required/i)).toBeTruthy()
    expect(screen.queryByText(/Cited share/i)).toBeNull()
    expect(screen.queryByText(/How answer engines see you/i)).toBeNull()
  })

  it('completed with empty queryRuns does not look like success', () => {
    const queued = buildQueuedGeoOverview({
      jobId: 'geo-empty-done',
      projectId: 'proj-1',
      url: 'https://example.com',
      queries: ['best widgets'],
      models: ['gpt-5.4-nano'],
      competitors: [],
    })
    const overview = finalizeGeoOverview({
      ...queued,
      job: {
        ...queued.job,
        status: 'completed',
        completedAt: new Date().toISOString(),
      },
      lede: 'Live GEO run finished with no cells.',
      queryRuns: [],
    })

    render(<GeoOverviewPanel overview={overview} />)

    expect(screen.getByText(/GEO run failed/i)).toBeTruthy()
    expect(screen.queryByText(/Cited share/i)).toBeNull()
  })
})
