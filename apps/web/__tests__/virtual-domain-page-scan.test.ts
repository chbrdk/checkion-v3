import { describe, expect, it } from 'vitest'
import {
  buildVirtualPageScanOverview,
  buildVirtualPageScanSummary,
} from '../lib/virtual-domain-page-scan'
import { synthesizeDomainPageScanId } from '../lib/domain-issue-page-synth'

describe('virtual domain page scan', () => {
  it('builds a resolvable overview without a seeded scan-single-1 row', () => {
    const id = synthesizeDomainPageScanId('domain-1787668678099', 'domain-1787668678099-sys-0', 2)
    const scan = buildVirtualPageScanSummary({
      id,
      projectId: 'proj-x',
      url: 'https://www.provinzial.de/west/',
      domainScanId: 'domain-1787668678099',
      overallScore: 73,
      issueCount: 10,
      startedAt: '2026-08-26T10:00:00.000Z',
      completedAt: '2026-08-26T10:05:00.000Z',
    })
    const overview = buildVirtualPageScanOverview(scan)
    expect(overview).toBeTruthy()
    expect(overview!.scan.id).toBe(id)
    expect(overview!.scan.url).toBe('https://www.provinzial.de/west/')
    expect(overview!.scan.mode).toBe('single')
    expect(overview!.scores.length).toBeGreaterThan(0)
    expect(overview!.topIssues.every((issue) => issue.scanId === id)).toBe(true)
  })
})
