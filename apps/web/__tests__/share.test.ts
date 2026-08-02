import { describe, expect, it } from 'vitest'
import { createShare, findShare, getShare, deleteShare } from '../lib/fixtures/share-store'
import { createScan, getScanOverview, deleteScan } from '../lib/fixtures/scan-store'

describe('share store', () => {
  it('creates idempotent shares', () => {
    const a = createShare('single', 'scan-single-1')
    const b = createShare('single', 'scan-single-1')
    expect(a.token).toBe(b.token)
    expect(findShare('single', 'scan-single-1')?.token).toBe(a.token)
    expect(getShare(a.token)?.resourceId).toBe('scan-single-1')
  })

  it('deletes shares', () => {
    const created = createShare('single', 'scan-deep-1')
    expect(deleteShare(created.token)).toBe(true)
    expect(getShare(created.token)).toBeNull()
  })
})

describe('scan lifecycle', () => {
  it('exposes overview for synthesized scans', () => {
    const created = createScan({
      projectId: 'proj-demo-1',
      mode: 'single',
      url: 'https://example.com/x',
    })
    const overview = getScanOverview(created.id)
    expect(overview?.scan.status).toBe('completed')
    expect(overview?.scores.length).toBeGreaterThan(0)
    expect(deleteScan(created.id)).toBe(true)
  })
})
