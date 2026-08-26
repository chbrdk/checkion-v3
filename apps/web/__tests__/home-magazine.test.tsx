import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { DomainScanLight, ScanSummary } from '@checkion-v3/contracts'
import {
  buildHomeLatestRuns,
  HomeMagazine,
} from '../components/home-magazine'
import { scoreTone } from '../lib/scan-display'

const baseScan = (over: Partial<ScanSummary>): ScanSummary =>
  ({
    id: 'scan-1',
    projectId: 'proj-1',
    url: 'https://example.com/page',
    mode: 'single',
    status: 'completed',
    overallScore: 82,
    issueCount: 3,
    startedAt: '2026-08-20T11:00:00.000Z',
    completedAt: '2026-08-20T12:00:00.000Z',
    ...over,
  }) as ScanSummary

const baseDomain = (over: Partial<DomainScanLight>): DomainScanLight =>
  ({
    id: 'dom-1',
    projectId: 'proj-1',
    rootUrl: 'https://docs.example.com/',
    status: 'completed',
    overallScore: 55,
    startedAt: '2026-08-21T11:00:00.000Z',
    completedAt: '2026-08-21T12:00:00.000Z',
    pageCount: 42,
    issueCount: 7,
    ...over,
  }) as DomainScanLight

describe('buildHomeLatestRuns', () => {
  it('merges singles and deep scans newest first with overview hrefs', () => {
    const runs = buildHomeLatestRuns(
      [
        baseScan({ id: 'old', completedAt: '2026-08-10T12:00:00.000Z', overallScore: 90 }),
        baseScan({
          id: 'queued',
          status: 'queued',
          completedAt: null,
          overallScore: null,
        }),
      ],
      [
        baseDomain({
          id: 'newer',
          completedAt: '2026-08-22T12:00:00.000Z',
          overallScore: 45,
        }),
      ],
      12,
    )
    expect(runs).toHaveLength(2)
    expect(runs[0]).toMatchObject({
      kind: 'deep',
      id: 'newer',
      href: '/domain/newer/overview',
    })
    expect(runs[1]).toMatchObject({
      kind: 'single',
      id: 'old',
      href: '/results/old/overview',
    })
    expect(scoreTone(runs[0].score)).toBe('mid')
    expect(scoreTone(runs[1].score)).toBe('pos')
  })
})

describe('HomeMagazine', () => {
  it('renders cover, pulse, and linked latest-run cards', () => {
    render(
      <HomeMagazine
        projects={[]}
        scans={[baseScan({ id: 's1', overallScore: 88 })]}
        domains={[baseDomain({ id: 'd1', overallScore: 35 })]}
        geoJobs={[]}
        scanCount={1}
        domainCount={1}
      />,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Reading the site' })).toBeTruthy()
    const latest = screen.getByLabelText('Latest runs')
    expect(latest).toBeTruthy()
    const latestLinks = latest.querySelectorAll('a.checkion-home-run-card-link')
    expect([...latestLinks].map((a) => a.getAttribute('href'))).toEqual(
      expect.arrayContaining(['/results/s1/overview', '/domain/d1/overview']),
    )
    expect(document.querySelector('[data-section="home-magazine"]')).toBeTruthy()
    expect(document.querySelector('.checkion-home-run-card[data-tone="pos"]')).toBeTruthy()
    expect(document.querySelector('.checkion-home-run-card[data-tone="neg"]')).toBeTruthy()
  })
})
