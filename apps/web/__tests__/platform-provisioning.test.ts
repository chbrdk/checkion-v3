import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PLEXON_FEDERATION_CONTRACT_VERSION } from '../lib/plexon-contract'
import {
  getProjectByPlatformId,
  resetProjectStore,
} from '../lib/fixtures/project-store'
import { createScan } from '../lib/fixtures/scan-store'
import { createGeoJob, resetGeoStoreForTests } from '../lib/fixtures/geo-store'

vi.mock('../lib/runtime-config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/runtime-config')>()
  return {
    ...actual,
    getPlexonServiceSecret: () => 'test-secret',
  }
})

function authHeaders(extra?: Record<string, string>): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Service-Secret': 'test-secret',
    'X-Plexon-Contract-Version': PLEXON_FEDERATION_CONTRACT_VERSION,
    ...extra,
  }
}

describe('platform provisioning projects', () => {
  beforeEach(() => {
    resetProjectStore()
    resetGeoStoreForTests()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('PUT upserts by platform project id and returns external id', async () => {
    const { PUT } = await import('../app/api/platform/provisioning/projects/[id]/route')
    const res = await PUT(
      new Request('http://localhost/api/platform/provisioning/projects/pp-live-1', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          contractVersion: PLEXON_FEDERATION_CONTRACT_VERSION,
          name: 'Live Collection',
          domain: 'https://live.example/',
          platformCompanyId: 'comp-1',
          ownerUserId: 'user-1',
        }),
      }),
      { params: Promise.resolve({ id: 'pp-live-1' }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('applied')
    expect(body.platformProjectId).toBe('pp-live-1')
    expect(typeof body.externalProjectId).toBe('string')

    const project = await getProjectByPlatformId('pp-live-1')
    expect(project?.name).toBe('Live Collection')
    expect(project?.domain).toBe('live.example')
    expect(project?.capabilityStatus).toBe('in_sync')
  })

  it('PUT rejects unauthorized requests', async () => {
    const { PUT } = await import('../app/api/platform/provisioning/projects/[id]/route')
    const res = await PUT(
      new Request('http://localhost/api/platform/provisioning/projects/pp-x', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: 'pp-x' }) },
    )
    expect(res.status).toBe(401)
  })

  it('GET returns scan summary for bound project', async () => {
    const { PUT, GET } = await import('../app/api/platform/provisioning/projects/[id]/route')
    await PUT(
      new Request('http://localhost/api/platform/provisioning/projects/pp-sum', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          contractVersion: PLEXON_FEDERATION_CONTRACT_VERSION,
          name: 'Summary',
          domain: 'sum.example',
          platformCompanyId: 'comp-1',
          ownerUserId: 'user-1',
        }),
      }),
      { params: Promise.resolve({ id: 'pp-sum' }) },
    )

    const res = await GET(
      new Request('http://localhost/api/platform/provisioning/projects/pp-sum', {
        headers: authHeaders({ 'X-Plexon-User-Id': 'user-1' }),
      }),
      { params: Promise.resolve({ id: 'pp-sum' }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(typeof body.externalProjectId).toBe('string')
    expect(body.scanCount).toBe(0)
    expect(body.domainScanCount).toBe(0)
    expect(body.geoJobCount).toBe(0)
    expect(body.standaloneScans).toEqual([])
    expect(body.geoJobs).toEqual([])
  })

  it('GET returns real store counts after scans and GEO jobs', async () => {
    const { PUT, GET } = await import('../app/api/platform/provisioning/projects/[id]/route')
    await PUT(
      new Request('http://localhost/api/platform/provisioning/projects/pp-counts', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          contractVersion: PLEXON_FEDERATION_CONTRACT_VERSION,
          name: 'Counts',
          domain: 'counts.example',
          platformCompanyId: 'comp-1',
          ownerUserId: 'user-1',
        }),
      }),
      { params: Promise.resolve({ id: 'pp-counts' }) },
    )

    const project = await getProjectByPlatformId('pp-counts')
    expect(project).toBeTruthy()

    await createScan({
      projectId: project!.id,
      mode: 'single',
      url: 'https://counts.example/page',
    })
    await createGeoJob({
      projectId: project!.id,
      url: 'https://counts.example/',
      queries: ['best widgets'],
      title: 'Counts GEO',
    })

    const res = await GET(
      new Request('http://localhost/api/platform/provisioning/projects/pp-counts', {
        headers: authHeaders({ 'X-Plexon-User-Id': 'user-1' }),
      }),
      { params: Promise.resolve({ id: 'pp-counts' }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.scanCount).toBeGreaterThanOrEqual(1)
    expect(body.standaloneScanCount).toBeGreaterThanOrEqual(1)
    expect(body.geoJobCount).toBeGreaterThanOrEqual(1)
    expect(body.standaloneScans[0]?.url).toContain('counts.example')
    expect(body.geoJobs[0]?.title).toBe('Counts GEO')
    expect(body.platformProjectId).toBe('pp-counts')
  })
})
