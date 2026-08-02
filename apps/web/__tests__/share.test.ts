import { describe, expect, it } from 'vitest'
import { createShare, findShare, getShare, deleteShare } from '../lib/fixtures/share-store'
import { createScan, getScanOverview, deleteScan } from '../lib/fixtures/scan-store'

describe('share store', () => {
  it('creates idempotent shares', async () => {
    const a = await createShare('single', 'scan-single-1')
    const b = await createShare('single', 'scan-single-1')
    expect(a.token).toBe(b.token)
    expect(((await findShare('single', 'scan-single-1'))?.token)).toBe(a.token)
    expect((((await getShare(a.token)))?.resourceId)).toBe('scan-single-1')
  })

  it('deletes shares', async () => {
    const created = await createShare('single', 'scan-deep-1')
    expect((await deleteShare(created.token))).toBe(true)
    expect((await getShare(created.token))).toBeNull()
  })
})

describe('scan lifecycle', () => {
  it('exposes overview for synthesized scans', async () => {
    const created = await createScan({
      projectId: 'proj-demo-1',
      mode: 'single',
      url: 'https://example.com/x',
    })
    const overview = await getScanOverview(created.id)
    expect(overview?.scan.status).toBe('completed')
    expect(overview?.scores.length).toBeGreaterThan(0)
    expect((await deleteScan(created.id))).toBe(true)
  })
})
