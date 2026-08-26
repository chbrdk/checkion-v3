import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { DomainScanLight, ProjectSummary, ScanSummary } from '@checkion-v3/contracts'
import {
  buildHomeRecentProjects,
  buildHomeSingleRuns,
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

const baseProject = (over: Partial<ProjectSummary>): ProjectSummary =>
  ({
    id: 'proj-1',
    name: 'Alpha',
    domain: 'alpha.example.com',
    status: 'active',
    platformProjectId: 'plx-1',
    capabilityStatus: 'in_sync',
    lastScanAt: '2026-08-20T12:00:00.000Z',
    scanCount: 3,
    ...over,
  }) as ProjectSummary

describe('buildHomeSingleRuns', () => {
  it('keeps completed singles newest first and skips queued', () => {
    const runs = buildHomeSingleRuns(
      [
        baseScan({ id: 'old', completedAt: '2026-08-10T12:00:00.000Z', overallScore: 90 }),
        baseScan({
          id: 'queued',
          status: 'queued',
          completedAt: null,
          overallScore: null,
        }),
        baseScan({ id: 'new', completedAt: '2026-08-22T12:00:00.000Z', overallScore: 45 }),
      ],
      8,
    )
    expect(runs).toHaveLength(2)
    expect(runs[0]).toMatchObject({
      id: 'new',
      href: '/results/new/overview',
    })
    expect(runs[1]).toMatchObject({
      id: 'old',
      href: '/results/old/overview',
    })
    expect(scoreTone(runs[0].score)).toBe('mid')
    expect(scoreTone(runs[1].score)).toBe('pos')
  })
})

describe('buildHomeRecentProjects', () => {
  it('orders by lastScanAt then name and caps at limit', () => {
    const list = buildHomeRecentProjects(
      [
        baseProject({ id: 'a', name: 'Zebra', lastScanAt: '2026-08-10T12:00:00.000Z' }),
        baseProject({ id: 'b', name: 'Alpha', lastScanAt: '2026-08-22T12:00:00.000Z' }),
        baseProject({ id: 'c', name: 'Beta', lastScanAt: null }),
        baseProject({ id: 'd', name: 'Gamma', lastScanAt: '2026-08-21T12:00:00.000Z' }),
        baseProject({ id: 'e', name: 'Delta', lastScanAt: '2026-08-20T12:00:00.000Z' }),
        baseProject({ id: 'f', name: 'Extra', lastScanAt: '2026-08-19T12:00:00.000Z' }),
      ],
      5,
    )
    expect(list.map((p) => p.id)).toEqual(['b', 'd', 'e', 'f', 'a'])
  })
})

describe('HomeMagazine', () => {
  it('renders three run columns, launch CTAs, and project tiles', () => {
    render(
      <HomeMagazine
        projects={[baseProject({ id: 'p1', name: 'North' })]}
        scans={[baseScan({ id: 's1', overallScore: 88 })]}
        domains={[baseDomain({ id: 'd1', overallScore: 35 })]}
        geoJobs={[]}
        scanCount={1}
        domainCount={1}
      />,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Reading the site' })).toBeTruthy()
    expect(screen.getByLabelText('Latest runs by mode')).toBeTruthy()
    expect(screen.getByLabelText('Single scans')).toBeTruthy()
    expect(screen.getByLabelText('Deep scans')).toBeTruthy()
    expect(screen.getByLabelText('GEO runs')).toBeTruthy()

    const singles = screen.getByLabelText('Single scans')
    expect(singles.querySelector('a.checkion-project-run-list__title')?.getAttribute('href')).toBe(
      '/results/s1/overview',
    )
    const deep = screen.getByLabelText('Deep scans')
    expect(deep.querySelector('a.checkion-project-run-list__title')?.getAttribute('href')).toBe(
      '/domain/d1/overview',
    )

    const launch = screen.getByLabelText('Launch actions')
    const ctaHrefs = [...launch.querySelectorAll('a.checkion-home-cta')].map((a) =>
      a.getAttribute('href'),
    )
    expect(ctaHrefs).toEqual(
      expect.arrayContaining([
        expect.stringContaining('mode=single'),
        expect.stringContaining('mode=deep'),
        expect.stringContaining('mode=geo'),
      ]),
    )
    expect(screen.getByLabelText('Recent projects')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: 'North' })).toBeTruthy()
    expect(document.querySelector('[data-section="home-magazine"]')).toBeTruthy()
  })
})
