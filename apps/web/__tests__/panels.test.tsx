import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ProjectListPanel, ProjectWorkspace } from '../components/project-panels'
import { DomainDetailPanel } from '../components/domain-detail-panel'
import { DomainIssuesPanel } from '../components/domain-issues-panel'
import { DomainMagazineShell } from '../components/domain-magazine-shell'
import { DomainOverviewPanel } from '../components/domain-overview-panel'
import { ResultDetailPanel } from '../components/result-detail-panel'
import { ResultOverviewPanel, ResultMagazineShell } from '../components/result-panels'
import { getDomainOverview, getScanIssues, getScanOverview } from '../lib/fixtures/scan-store'
import type { ProjectSummary } from '@checkion-v3/contracts'
import { scoreTone, worstScore } from '../lib/scan-display'

vi.mock('../lib/fixtures/project-store', () => ({
  getProject: async () => ({ id: 'proj-demo-1', name: 'Demo Project' }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}))

describe('panels smoke', () => {
  it('renders project list', async () => {
    const projects: ProjectSummary[] = [
      {
        id: 'p1',
        name: 'Demo',
        domain: 'example.com',
        status: 'active',
        platformProjectId: 'plx-1',
        capabilityStatus: 'in_sync',
        lastScanAt: null,
        scanCount: 2,
      },
    ]
    render(<ProjectListPanel projects={projects} />)
    expect(screen.getByRole('table', { name: /Projects/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Demo' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /New project/i })).toBeTruthy()
  })

  it('renders project workspace cover and tables', async () => {
    render(
      <ProjectWorkspace
        project={{
          id: 'p1',
          name: 'Demo Workspace',
          domain: 'example.com',
          status: 'active',
          platformProjectId: 'plx-1',
          capabilityStatus: 'in_sync',
          lastScanAt: '2026-07-31T10:00:00.000Z',
          scanCount: 1,
          description: 'Workspace lede',
          recentScanIds: ['scan-1'],
        }}
        recentScans={[
          {
            id: 'scan-1',
            projectId: 'p1',
            mode: 'single',
            url: 'https://example.com/page',
            status: 'completed',
            startedAt: '2026-07-31T09:00:00.000Z',
            completedAt: '2026-07-31T10:00:00.000Z',
            overallScore: 72,
            issueCount: 3,
          },
        ]}
        domains={[
          {
            id: 'domain-x',
            projectId: 'p1',
            rootUrl: 'https://example.com',
            status: 'completed',
            pageCount: 120,
            overallScore: 55,
            issueCount: 40,
            startedAt: '2026-07-30T12:00:00.000Z',
            completedAt: '2026-07-31T00:00:00.000Z',
          },
        ]}
      />,
    )
    expect(screen.getByRole('heading', { name: /Demo Workspace/i })).toBeTruthy()
    expect(screen.getByText(/Workspace lede/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /New scan/i })).toHaveAttribute(
      'href',
      '/scan?projectId=p1&mode=single',
    )
    expect(screen.getByRole('table', { name: /Recent single scans/i })).toBeTruthy()
    expect(screen.getByRole('table', { name: /Domain crawls/i })).toBeTruthy()
  })

  it('renders domain corpus magazine (distinct from single)', async () => {
    const overview = await getDomainOverview('domain-1')
    expect(overview).toBeTruthy()
    render(await DomainMagazineShell({ overview: overview!, children: (<><DomainOverviewPanel overview={overview!} /></>) }))
    expect(screen.getByText('durr.com')).toBeTruthy()
    expect(screen.getByText(/pages scanned/i)).toBeTruthy()
    expect(screen.getByLabelText(/Domain score 43/i)).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Seven lenses on the corpus/i })).toBeTruthy()
    expect(screen.getByText(/Corpus signal/i)).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Findings that repeat across pages/i })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Margins & pace/i })).toBeTruthy()
    expect(screen.getByText(/SEO coverage/i)).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Core tags are nearly universal/i })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Share across the corpus/i })).toBeTruthy()
    expect(screen.getByLabelText(/Readability band share/i)).toBeTruthy()
    expect(screen.getByLabelText(/Eco grade share/i)).toBeTruthy()
    expect(document.querySelectorAll('.checkion-donut').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Error findings')).toBeTruthy()
    expect(document.querySelector('.checkion-issues-workspace')).toBeNull()
    expect(document.querySelector('.ds-rank')).toBeTruthy()
    expect(document.querySelector('.checkion-domain-meter-list')).toBeTruthy()
    expect(screen.getByRole('heading', { name: /How the domain presents itself/i })).toBeTruthy()
    expect(screen.getByLabelText(/Trust and GEO reading/i)).toBeTruthy()
    expect(overview!.seoCoverage?.withTitle).toBeGreaterThan(0)
  })

  it('renders domain issues without capture canvas', async () => {
    const overview = await getDomainOverview('domain-1')
    const issues = await getScanIssues('domain-1')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          issueId: 'live-d-iss-1',
          total: 3105,
          page: 1,
          pageSize: 25,
          sort: 'issues-desc',
          minIssues: 0,
          maxIssues: null,
          items: [
            {
              url: 'https://www.durr.com/de/media/news',
              scanId: 'dpage__domain-1__live-d-iss-1__0',
              issueCount: 22,
              criticalCount: 8,
            },
            {
              url: 'https://www.durr.com/en/media/news',
              scanId: 'dpage__domain-1__live-d-iss-1__1',
              issueCount: 18,
              criticalCount: 6,
            },
          ],
        }),
      ),
    )
    render(await DomainMagazineShell({ overview: overview!, variant: "folio", activeSection: "issues", children: (<><DomainIssuesPanel domainId="domain-1" issues={issues} /></>) }))
    expect(screen.getByRole('heading', { name: /Systemic issue groups/i })).toBeTruthy()
    expect(screen.queryByText(/pages affected/i)).toBeNull()
    expect(screen.getByText(/Showing 1–/i)).toBeTruthy()
    expect(document.querySelector('.checkion-issues-workspace')).toBeNull()
    expect(document.querySelector('.checkion-issue-marker')).toBeNull()
    expect(screen.getAllByText(/pages$/i).length).toBeGreaterThan(0)

    fireEvent.click(
      screen.getByRole('button', { name: /Links must have discernible text/i }),
    )
    expect(
      screen.getByRole('button', {
        name: /Links must have discernible text/i,
        expanded: true,
      }),
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: /Rule help/i })).toBeTruthy()
    expect(await screen.findByText(/Affected pages/i)).toBeTruthy()
    expect(await screen.findByRole('table', { name: /Affected pages/i })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: /^Issues$/i })).toBeTruthy()
    expect(await screen.findByRole('link', { name: /\/de\/media\/news/i })).toHaveAttribute(
      'href',
      '/results/dpage__domain-1__live-d-iss-1__0',
    )
    expect(screen.getByText(/Pages 1–25 of/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Most issues/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Heavy$/i })).toBeTruthy()
    vi.unstubAllGlobals()
  })

  it('paginates domain issue groups beyond page size', async () => {
    const overview = await getDomainOverview('domain-1')
    const base = await getScanIssues('domain-1')
    const many = Array.from({ length: 30 }, (_, i) => ({
      ...base[i % base.length]!,
      id: `paged-iss-${i}`,
      title: `Paged issue ${i + 1}`,
      affectedCount: 1000 - i,
    }))
    render(await DomainMagazineShell({ overview: overview!, variant: "folio", activeSection: "issues", children: (<><DomainIssuesPanel domainId="domain-1" issues={many} /></>) }))
    expect(screen.getByText(/Showing 1–25 of 30/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Next$/i })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }))
    expect(screen.getByText(/Showing 26–30 of 30/i)).toBeTruthy()
    expect(screen.getByText(/Paged issue 26/i)).toBeTruthy()
  })

  it('renders domain detail corpus ledger', async () => {
    const overview = await getDomainOverview('domain-1')
    render(await DomainMagazineShell({ overview: overview!, variant: "folio", activeSection: "detail", children: (<><DomainDetailPanel overview={overview!} /></>) }))
    expect(screen.getByRole('heading', { name: /Corpus ledger/i })).toBeTruthy()
    expect(screen.getByLabelText(/Search report/i)).toBeTruthy()
    expect(screen.getByLabelText(/Score ledger/i)).toBeTruthy()
    expect(screen.getByRole('heading', { name: /^Ledger$/i })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /^SEO coverage$/i })).toBeTruthy()
    expect(screen.getAllByText(/Pages with title/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Canonical mismatches/i).length).toBeGreaterThan(0)
    expect(screen.queryByAltText(/Scan capture/i)).toBeNull()
  })

  it('renders single-scan magazine overview', async () => {
    const overview = await getScanOverview('scan-single-1')
    expect(overview).toBeTruthy()
    render(await ResultMagazineShell({ overview: overview!, children: (<><ResultOverviewPanel overview={overview!} /></>) }))
    expect(screen.getByText('durr-consulting.com')).toBeTruthy()
    expect(screen.getByText(/DÜRR Consulting offers specialized expertise/i)).toBeTruthy()
    expect(
      screen.getByLabelText(new RegExp(`Overall score ${overview!.scan.overallScore}`, 'i')),
    ).toBeTruthy()
    expect(screen.getByRole('navigation', { name: /Result sections/i })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Detail/i })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Seven lenses/i })).toBeTruthy()
    expect(screen.getByText(/From the dossier/i)).toBeTruthy()
    expect(screen.getByRole('heading', { name: /How machines find the page/i })).toBeTruthy()
    expect(
      screen.getByLabelText(new RegExp(`GEO score ${overview!.generative?.score}`, 'i')),
    ).toBeTruthy()
    expect(screen.getByLabelText(/Weakest signal/i)).toBeTruthy()
    expect(document.querySelector('.category-rank-item--weakest')).toBeTruthy()
    expect(screen.getAllByText(/color contrast/i).length).toBeGreaterThan(0)
    expect(overview!.performance?.lcp).toBe(4060)
    expect(overview!.seo?.h1).toBe('Automotive Brownfield Integration')
    expect(overview!.passedChecks?.length).toBeGreaterThan(0)
  })

  it('renders Detail chapter report from light snapshots', async () => {
    const overview = await getScanOverview('scan-single-1')
    expect(overview).toBeTruthy()
    render(await ResultMagazineShell({ overview: overview!, variant: "folio", activeSection: "detail", children: (<><ResultDetailPanel overview={overview!} /></>) }))
    expect(screen.getByRole('tab', { name: /Detail/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: /Full report/i })).toBeTruthy()
    expect(screen.getByLabelText(/Search report/i)).toBeTruthy()
    expect(screen.getByLabelText(/Score ledger/i)).toBeTruthy()
    expect(screen.getByRole('heading', { name: /^Performance$/i })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /^SEO$/i })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /^GEO$/i })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /^Infra$/i })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /^Scan$/i })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /^Ledger$/i })).toBeTruthy()
    expect(
      screen.getByText(/Overall = round\(mean of category scores/i),
    ).toBeTruthy()
    expect(
      screen.getByText(/0\.52 × discoverability \+ 0\.48 × repurposing/i),
    ).toBeTruthy()
    expect(screen.getByText(/4\.06 s/)).toBeTruthy()
    expect(screen.getByText('h2')).toBeTruthy()
    expect(screen.getAllByText(/myracloud|TYPO3|Munich/i).length).toBeGreaterThan(0)
    expect(screen.getByAltText(/Scan capture/i)).toBeTruthy()
    expect(screen.getAllByText(/Automotive Brownfield Integration/i).length).toBeGreaterThan(0)
    expect(overview!.scores.length).toBeGreaterThan(0)
    expect(overview!.performance?.inp ?? null).toBeNull()
    expect(overview!.infra?.hostingServer).toBe('myracloud')
    const lcpRow = screen.getByRole('row', { name: /^LCP/i })
    expect(lcpRow).toHaveAttribute('data-tone', 'neg')
    expect(document.querySelector('tr[data-tone="pos"] th')?.textContent).toBeTruthy()
    expect(document.querySelectorAll('.checkion-report__table tbody tr[data-tone]').length).toBeGreaterThan(5)
  })

  it('filters Detail report with smart search', async () => {
    const overview = await getScanOverview('scan-single-1')
    render(await ResultMagazineShell({ overview: overview!, variant: "folio", activeSection: "detail", children: (<><ResultDetailPanel overview={overview!} /></>) }))
    const search = screen.getByLabelText(/Search report/i)
    fireEvent.change(search, { target: { value: 'LCP' } })
    expect(screen.getByRole('heading', { name: /^Performance$/i })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /^SEO$/i })).toBeNull()
    expect(screen.getByRole('row', { name: /^LCP/i })).toBeTruthy()
    fireEvent.change(search, { target: { value: 'bad' } })
    expect(screen.getAllByRole('row').some((row) => row.getAttribute('data-tone') === 'neg')).toBe(
      true,
    )
  })
})

describe('scan display helpers', () => {
  it('maps score tones and weakest category', async () => {
    expect(scoreTone(90)).toBe('pos')
    expect(scoreTone(70)).toBe('low')
    expect(scoreTone(40)).toBe('neg')
    const overview = await getScanOverview('scan-single-1')
    const worst = worstScore(overview!.scores)
    expect(worst?.kind).toBe('accessibility')
  })
})
