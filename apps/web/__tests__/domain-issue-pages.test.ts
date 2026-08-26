import { describe, expect, it } from 'vitest'
import { listIssueAffectedPages, synthesizeAffectedPageUrl } from '../lib/domain-issue-pages'

describe('domain issue affected pages', () => {
  it('pages through synthetic corpus for a domain issue', async () => {
    const first = await listIssueAffectedPages('domain-1', 'live-d-iss-1', { page: 1, pageSize: 25 })
    expect(first).toBeTruthy()
    expect(first!.total).toBe(3105)
    expect(first!.items).toHaveLength(25)
    expect(first!.sort).toBe('issues-desc')
    expect(first!.items[0]?.url).toMatch(/^https:\/\/www\.durr\.com\//)
    expect(first!.items[0]?.scanId).toMatch(/^dpage__domain-1__live-d-iss-1__/)
    expect(first!.items[0]?.issueCount).toBeGreaterThanOrEqual(first!.items[1]!.issueCount)

    const last = await listIssueAffectedPages('domain-1', 'live-d-iss-1', { page: 125, pageSize: 25 })
    expect(last!.items.length).toBeGreaterThan(0)
    expect(last!.items.length).toBeLessThanOrEqual(25)
    expect((125 - 1) * 25 + last!.items.length).toBe(3105)
  })

  it('links each page to a resolvable single-page scan id', async () => {
    const { getScanOverview } = await import('../lib/fixtures/scan-store')
    const first = (await listIssueAffectedPages('domain-1', 'live-d-iss-1', { page: 1, pageSize: 5 }))!
    for (const item of first.items) {
      expect(item.scanId).toBeTruthy()
      expect(item.scanId.startsWith('dpage__')).toBe(true)
      const overview = await getScanOverview(item.scanId)
      expect(overview).toBeTruthy()
      expect(overview!.scan.url).toBe(item.url)
      expect(overview!.scan.mode).toBe('single')
    }
  })

  it('resolves overview page-sample rows to single-page magazines', async () => {
    const { getDomainOverview, getScanOverview } = await import('../lib/fixtures/scan-store')
    const domain = await getDomainOverview('domain-1')
    const sample = domain!.pageSamples![0]!
    expect(sample.scanId).toMatch(/^dsample__domain-1__0$/)
    const overview = await getScanOverview(sample.scanId!)
    expect(overview).toBeTruthy()
    expect(overview!.scan.url).toBe(sample.url)
    expect(overview!.scan.mode).toBe('single')
  })

  it('sorts fewest issues first when requested', async () => {
    const asc = await listIssueAffectedPages('domain-1', 'live-d-iss-1', {
      page: 1,
      pageSize: 10,
      sort: 'issues-asc',
    })
    expect(asc!.sort).toBe('issues-asc')
    expect(asc!.items[0]!.issueCount).toBeLessThanOrEqual(asc!.items[1]!.issueCount)
  })

  it('filters by issue-load band', async () => {
    const heavy = await listIssueAffectedPages('domain-1', 'live-d-iss-1', {
      page: 1,
      pageSize: 50,
      minIssues: 12,
    })
    expect(heavy!.total).toBeLessThan(3105)
    expect(heavy!.items.every((row) => row.issueCount >= 12)).toBe(true)

    const medium = await listIssueAffectedPages('domain-1', 'live-d-iss-1', {
      page: 1,
      pageSize: 50,
      minIssues: 5,
      maxIssues: 11,
    })
    expect(medium!.items.every((row) => row.issueCount >= 5 && row.issueCount <= 11)).toBe(true)
    expect(medium!.maxIssues).toBe(11)
  })

  it('prefers seed urls before synthesized paths', async () => {
    const url = synthesizeAffectedPageUrl(
      'https://www.durr.com',
      'live-d-iss-1',
      0,
      ['https://www.durr.com/seed'],
    )
    expect(url).toBe('https://www.durr.com/seed')
  })
})
