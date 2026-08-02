import { describe, expect, it } from 'vitest'
import { listProjects, getProjectByPlatformId } from '../lib/fixtures/project-store'
import {
  getScanOverview,
  getScanIssues,
  getDomainOverview,
  createScan,
} from '../lib/fixtures/scan-store'

describe('fixture stores', () => {
  it('lists projects with collection binding', () => {
    const items = listProjects()
    expect(items.length).toBeGreaterThan(0)
    expect(getProjectByPlatformId('plx-collection-demo-1')?.id).toBe('proj-demo-1')
  })

  it('builds light scan overview', () => {
    const overview = getScanOverview('scan-single-1')
    expect(overview?.scores.length).toBeGreaterThan(0)
    expect(getScanIssues('scan-single-1').length).toBeGreaterThan(0)
  })

  it('builds domain corpus overview', () => {
    const overview = getDomainOverview('domain-1')
    expect(overview?.scan.rootUrl).toMatch(/durr\.com/)
    expect(overview?.scan.pageCount).toBeGreaterThan(1000)
    expect(overview?.scan.overallScore).toBe(43)
    expect(overview?.lede).toMatch(/pages/i)
    expect(overview?.systemicIssues.length).toBeGreaterThan(0)
    expect(overview?.seoCoverage?.totalPages).toBeGreaterThan(0)
    expect(overview?.seoCoverage?.withTitle).toBeGreaterThan(0)
    expect(overview?.performance?.avgLcp).toBeGreaterThan(0)
    expect(overview?.generative?.score).toBe(51)
    expect(overview?.classification?.tags.length).toBeGreaterThan(0)
    expect(getScanIssues('domain-1').length).toBeGreaterThan(10)
  })

  it('synthesizes a completed dummy scan on launch', () => {
    const created = createScan({
      projectId: 'proj-demo-1',
      mode: 'single',
      url: 'https://example.com',
    })
    expect(created.status).toBe('completed')
    expect(created.id).toMatch(/^scan-single-/)
    expect(created.overallScore).not.toBeNull()
    expect(getScanIssues(created.id).length).toBeGreaterThan(0)
    expect(getScanOverview(created.id)?.scores.length).toBeGreaterThan(0)
  })
})
