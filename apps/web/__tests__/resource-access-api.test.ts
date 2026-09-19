import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/runtime-config', async () => {
  const actual = await vi.importActual<typeof import('../lib/runtime-config')>(
    '../lib/runtime-config',
  )
  return {
    ...actual,
    isPlexonAuthConfigured: () => true,
  }
})

vi.mock('../lib/auth-api-token', () => ({
  getRequestUser: async () => ({ id: 'user-1', email: 'u@example.com' }),
}))

vi.mock('../lib/resource-access', () => ({
  listScansForViewer: vi.fn(async () => [{ id: 'scan-visible', projectId: 'proj-mine' }]),
  viewerCanAccessScan: vi.fn(async (id: string) => id === 'scan-visible'),
  viewerCanAccessProjectId: vi.fn(async () => true),
  listDomainScansForViewer: vi.fn(async () => []),
  listGeoJobsForViewer: vi.fn(async () => []),
  viewerCanAccessDomainScan: vi.fn(async () => false),
  viewerCanAccessGeoJob: vi.fn(async () => false),
}))

describe('scan API Access Model B gates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET /api/scans returns viewer-scoped items', async () => {
    const { GET } = await import('../app/api/scans/route')
    const { listScansForViewer } = await import('../lib/resource-access')
    const res = await GET(new Request('http://localhost/api/scans'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: Array<{ id: string }> }
    expect(body.items.map((i) => i.id)).toEqual(['scan-visible'])
    expect(listScansForViewer).toHaveBeenCalled()
  })

  it('GET /api/scans/:id/overview returns 403 for foreign scans', async () => {
    const { GET } = await import('../app/api/scans/[id]/overview/route')
    const res = await GET(new Request('http://localhost/api/scans/scan-foreign/overview'), {
      params: Promise.resolve({ id: 'scan-foreign' }),
    })
    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('forbidden')
  })
})
