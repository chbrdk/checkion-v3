import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GeoHistoryChapter } from '../components/geo-history-chapter'
import { GeoHistoryTeaser } from '../components/geo-history-teaser'
import { GeoOverviewPanel } from '../components/geo-overview-panel'
import { buildGeoPositionHistory } from '../lib/geo/position-history'
import { GEO_OVERVIEWS } from '../lib/fixtures/geo-jobs'
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

vi.mock('../lib/msqdx-ui-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/msqdx-ui-client')>()
  return {
    ...actual,
    SeriesChart: ({ title }: { title?: string }) => (
      <div data-testid="series-chart" data-title={title ?? ''} />
    ),
  }
})

describe('GeoHistoryChapter', () => {
  it('renders SeriesChart cards for dual-run fixture history', () => {
    const history = buildGeoPositionHistory({
      projectId: 'proj-demo-1',
      measurement: 'recall',
      overviews: GEO_OVERVIEWS,
    })
    render(<GeoHistoryChapter projectId="proj-demo-1" history={history} />)

    expect(screen.getByRole('heading', { name: /Citation position over time/i })).toBeTruthy()
    expect(screen.getByLabelText(/GEO citation position history/i)).toBeTruthy()
    expect(document.querySelectorAll('[data-testid="series-chart"]').length).toBeGreaterThanOrEqual(
      1,
    )
    expect(screen.getByRole('button', { name: /Average/i })).toBeTruthy()
  })

  it('shows empty CTA when no multi-point series', () => {
    const history = buildGeoPositionHistory({
      projectId: 'proj-demo-1',
      measurement: 'recall',
      overviews: GEO_OVERVIEWS.filter((o) => o.job.id === 'geo-1'),
    })
    render(<GeoHistoryChapter projectId="proj-demo-1" history={history} />)
    expect(screen.getByText(/Need at least two completed runs/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /Re-run or launch GEO/i })).toBeTruthy()
    expect(document.querySelector('[data-testid="series-chart"]')).toBeNull()
  })
})

describe('GeoHistoryTeaser', () => {
  it('renders deep-link when seriesCount ≥ 1', () => {
    render(
      <GeoHistoryTeaser
        projectId="proj-demo-1"
        measurement="recall"
        seriesCount={2}
        sampleQuery="best paint application systems"
      />,
    )
    expect(screen.getByTestId('geo-history-teaser')).toBeTruthy()
    expect(screen.getByRole('link', { name: /View GEO History/i })).toHaveAttribute(
      'href',
      '/projects/proj-demo-1?chapter=geo-history',
    )
  })

  it('renders nothing when seriesCount is 0', () => {
    const { container } = render(
      <GeoHistoryTeaser projectId="proj-demo-1" measurement="recall" seriesCount={0} />,
    )
    expect(container.firstChild).toBeNull()
  })
})

describe('GeoOverviewPanel history teaser', () => {
  it('shows teaser only when historyTeaser has series', async () => {
    const overview = await getGeoOverview('geo-1')
    expect(overview).toBeTruthy()

    const { rerender } = render(<GeoOverviewPanel overview={overview!} />)
    expect(screen.queryByTestId('geo-history-teaser')).toBeNull()

    rerender(
      <GeoOverviewPanel
        overview={overview!}
        historyTeaser={{ seriesCount: 2, sampleQuery: 'best paint' }}
      />,
    )
    expect(screen.getByTestId('geo-history-teaser')).toBeTruthy()
  })
})
