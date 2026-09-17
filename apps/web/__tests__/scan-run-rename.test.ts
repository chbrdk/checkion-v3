import { describe, expect, it, vi } from 'vitest'
import {
  getDomainOverview,
  getDomainScan,
  getScan,
  getScanOverview,
  updateDomainScanTitle,
  updateScanTitle,
} from '../lib/fixtures/scan-store'
import { JOB_TITLE_MAX, normalizeJobTitle } from '../lib/job-title'
import { displayRunTitle } from '../lib/scan-display'

vi.mock('../lib/runtime-config', async () => {
  const actual = await vi.importActual<typeof import('../lib/runtime-config')>(
    '../lib/runtime-config',
  )
  return {
    ...actual,
    isPlexonAuthConfigured: () => false,
  }
})

vi.mock('../lib/auth-api-token', () => ({
  getRequestUser: async () => null,
}))

describe('scan / domain run rename', () => {
  it('normalizes titles', () => {
    expect(normalizeJobTitle('  Homepage WCAG  ')).toBe('Homepage WCAG')
    expect(normalizeJobTitle('')).toBeNull()
    expect(normalizeJobTitle('x'.repeat(JOB_TITLE_MAX + 1))).toBeNull()
  })

  it('displayRunTitle prefers custom title', () => {
    expect(displayRunTitle('Q3 homepage', 'https://example.com/about')).toBe('Q3 homepage')
    expect(displayRunTitle(null, 'https://example.com/about')).toBe('example.com/about')
  })

  it('updates single-scan memory title and overview', async () => {
    const updated = await updateScanTitle('scan-single-1', 'Renamed WCAG run')
    expect(updated?.title).toBe('Renamed WCAG run')
    expect((await getScan('scan-single-1'))?.title).toBe('Renamed WCAG run')
    expect((await getScanOverview('scan-single-1'))?.scan.title).toBe('Renamed WCAG run')
  })

  it('updates domain memory title and overview', async () => {
    const updated = await updateDomainScanTitle('domain-1', 'Renamed deep crawl')
    expect(updated?.title).toBe('Renamed deep crawl')
    expect((await getDomainScan('domain-1'))?.title).toBe('Renamed deep crawl')
    expect((await getDomainOverview('domain-1'))?.scan.title).toBe('Renamed deep crawl')
  })

  it('rejects invalid titles in store helpers', async () => {
    expect(await updateScanTitle('scan-single-1', '   ')).toBeNull()
    expect(await updateDomainScanTitle('domain-1', '')).toBeNull()
  })

  it('PATCH /api/scans/:id renames the scan', async () => {
    const { PATCH } = await import('../app/api/scans/[id]/route')
    const res = await PATCH(
      new Request('http://localhost/api/scans/scan-single-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'WCAG — renamed' }),
      }),
      { params: Promise.resolve({ id: 'scan-single-1' }) },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { title: string }
    expect(body.title).toBe('WCAG — renamed')
  })

  it('PATCH /api/domain-scans/:id renames the domain scan', async () => {
    const { PATCH } = await import('../app/api/domain-scans/[id]/route')
    const res = await PATCH(
      new Request('http://localhost/api/domain-scans/domain-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Deep — renamed' }),
      }),
      { params: Promise.resolve({ id: 'domain-1' }) },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { title: string }
    expect(body.title).toBe('Deep — renamed')
  })

  it('rejects invalid titles via PATCH', async () => {
    const { PATCH } = await import('../app/api/scans/[id]/route')
    const res = await PATCH(
      new Request('http://localhost/api/scans/scan-single-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: '   ' }),
      }),
      { params: Promise.resolve({ id: 'scan-single-1' }) },
    )
    expect(res.status).toBe(400)
  })
})
