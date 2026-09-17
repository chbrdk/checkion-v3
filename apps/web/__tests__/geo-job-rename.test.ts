import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  getGeoOverview,
  resetGeoStoreForTests,
  updateGeoJobTitle,
} from '../lib/fixtures/geo-store'
import { normalizeGeoJobTitle, GEO_JOB_TITLE_MAX } from '../lib/geo-job-title'

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

describe('geo job rename', () => {
  beforeEach(() => {
    resetGeoStoreForTests()
  })

  it('normalizes titles', () => {
    expect(normalizeGeoJobTitle('  Vaillant live  ')).toBe('Vaillant live')
    expect(normalizeGeoJobTitle('')).toBeNull()
    expect(normalizeGeoJobTitle('x'.repeat(GEO_JOB_TITLE_MAX + 1))).toBeNull()
  })

  it('updates memory store title', async () => {
    const updated = await updateGeoJobTitle('geo-1', 'Renamed Dürr GEO')
    expect(updated?.job.title).toBe('Renamed Dürr GEO')
    expect((await getGeoOverview('geo-1'))?.job.title).toBe('Renamed Dürr GEO')
  })

  it('rejects invalid titles in the store helper', async () => {
    expect(await updateGeoJobTitle('geo-1', '   ')).toBeNull()
    expect((await getGeoOverview('geo-1'))?.job.title).toMatch(/Dürr|Competitive/i)
  })

  it('PATCH /api/geo-jobs/:id renames the job', async () => {
    const { PATCH } = await import('../app/api/geo-jobs/[id]/route')
    const res = await PATCH(
      new Request('http://localhost/api/geo-jobs/geo-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Competitive GEO — renamed' }),
      }),
      { params: Promise.resolve({ id: 'geo-1' }) },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { job: { title: string } }
    expect(body.job.title).toBe('Competitive GEO — renamed')
  })

  it('rejects invalid titles via PATCH', async () => {
    const { PATCH } = await import('../app/api/geo-jobs/[id]/route')
    const res = await PATCH(
      new Request('http://localhost/api/geo-jobs/geo-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: '   ' }),
      }),
      { params: Promise.resolve({ id: 'geo-1' }) },
    )
    expect(res.status).toBe(400)
  })
})
