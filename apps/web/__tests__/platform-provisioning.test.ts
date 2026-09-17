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
    expect(body.latestCompletedScan).toBeNull()
  })

  it('GET includes latestCompletedScan distillate after a completed scan', async () => {
    const { PUT, GET } = await import('../app/api/platform/provisioning/projects/[id]/route')
    await PUT(
      new Request('http://localhost/api/platform/provisioning/projects/pp-distill', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          contractVersion: PLEXON_FEDERATION_CONTRACT_VERSION,
          name: 'Distillate',
          domain: 'distill.example',
          platformCompanyId: 'comp-1',
          ownerUserId: 'user-1',
        }),
      }),
      { params: Promise.resolve({ id: 'pp-distill' }) },
    )

    const project = await getProjectByPlatformId('pp-distill')
    expect(project).toBeTruthy()
    const scan = await createScan({
      projectId: project!.id,
      mode: 'single',
      url: 'https://distill.example/page',
    })
    expect(scan.status).toBe('completed')

    const res = await GET(
      new Request('http://localhost/api/platform/provisioning/projects/pp-distill', {
        headers: authHeaders({ 'X-Plexon-User-Id': 'user-1' }),
      }),
      { params: Promise.resolve({ id: 'pp-distill' }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.latestCompletedScan?.id).toBe(scan.id)
    expect(body.latestCompletedScan?.source).toBe('standalone')
    expect(body.latestCompletedScan?.scores?.length).toBeGreaterThan(0)
    expect(body.latestCompletedScan?.issueRollup).toBeDefined()
    expect(Array.isArray(body.latestCompletedScan?.topIssues)).toBe(true)
    expect(body.standaloneScans[0]?.status).toBe('completed')
    expect(typeof body.standaloneScans[0]?.issueCount).toBe('number')
    expect(Array.isArray(body.scoreHistory)).toBe(true)
    expect(body.scoreHistory[0]?.id).toBe(scan.id)
    expect(typeof body.scoreHistory[0]?.overallScore).toBe('number')
    expect(body.latestCompletedScan?.source).toBe('standalone')
    expect(body.scoreHistory[0]?.source).toBe('standalone')
  })

  it('GET falls back to domain crawl distillate when no standalone singles', async () => {
    const { PUT, GET } = await import('../app/api/platform/provisioning/projects/[id]/route')
    const { createDomainScan } = await import('../lib/fixtures/scan-store')
    await PUT(
      new Request('http://localhost/api/platform/provisioning/projects/pp-domain-only', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          contractVersion: PLEXON_FEDERATION_CONTRACT_VERSION,
          name: 'Domain only',
          domain: 'domain-only.example',
          platformCompanyId: 'comp-1',
          ownerUserId: 'user-1',
        }),
      }),
      { params: Promise.resolve({ id: 'pp-domain-only' }) },
    )

    const project = await getProjectByPlatformId('pp-domain-only')
    expect(project).toBeTruthy()
    const domain = await createDomainScan({
      projectId: project!.id,
      url: 'https://domain-only.example/',
    })
    expect(domain.status).toBe('completed')

    const res = await GET(
      new Request('http://localhost/api/platform/provisioning/projects/pp-domain-only', {
        headers: authHeaders({ 'X-Plexon-User-Id': 'user-1' }),
      }),
      { params: Promise.resolve({ id: 'pp-domain-only' }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.standaloneScanCount).toBe(0)
    expect(body.domainScanCount).toBeGreaterThanOrEqual(1)
    expect(body.latestCompletedScan?.id).toBe(domain.id)
    expect(body.latestCompletedScan?.source).toBe('domain')
    expect(body.latestCompletedScan?.scores?.length).toBeGreaterThan(0)
    expect(body.scoreHistory.some((h: { id: string }) => h.id === domain.id)).toBe(true)
    expect(body.latestDomainHealth?.id).toBe(domain.id)
    expect(Array.isArray(body.latestDomainHealth?.systemicIssues)).toBe(true)
    expect(body.latestDomainHealth?.performance == null || typeof body.latestDomainHealth.performance.avgLcp === 'number').toBe(true)
    expect(
      body.latestDomainHealth?.ux == null || typeof body.latestDomainHealth.ux.score === 'number',
    ).toBe(true)
    expect(
      body.latestDomainHealth?.eco == null || typeof body.latestDomainHealth.eco.avgCo2 === 'number',
    ).toBe(true)
    expect(Array.isArray(body.latestDomainHealth?.corpusPages)).toBe(true)
  })

  it('GET includes latestGeoDepth when a completed GEO job exists', async () => {
    const { PUT, GET } = await import('../app/api/platform/provisioning/projects/[id]/route')
    await PUT(
      new Request('http://localhost/api/platform/provisioning/projects/pp-geo-depth', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          contractVersion: PLEXON_FEDERATION_CONTRACT_VERSION,
          name: 'GEO depth',
          domain: 'geo-depth.example',
          platformCompanyId: 'comp-1',
          ownerUserId: 'user-1',
        }),
      }),
      { params: Promise.resolve({ id: 'pp-geo-depth' }) },
    )

    const project = await getProjectByPlatformId('pp-geo-depth')
    expect(project).toBeTruthy()
    const job = await createGeoJob({
      projectId: project!.id,
      url: 'https://geo-depth.example/',
      queries: ['best widgets'],
      title: 'GEO depth job',
    })
    expect(job.status).toBe('completed')

    const res = await GET(
      new Request('http://localhost/api/platform/provisioning/projects/pp-geo-depth', {
        headers: authHeaders({ 'X-Plexon-User-Id': 'user-1' }),
      }),
      { params: Promise.resolve({ id: 'pp-geo-depth' }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.latestGeoDepth?.id).toBe(job.id)
    expect(Array.isArray(body.latestGeoDepth?.recommendations)).toBe(true)
    expect(Array.isArray(body.latestGeoDepth?.shareOfVoice)).toBe(true)
    expect(
      body.latestGeoDepth?.presence == null ||
        typeof body.latestGeoDepth.presence.missRate === 'number',
    ).toBe(true)
    expect(Array.isArray(body.latestGeoDepth?.insights?.promptDuels ?? [])).toBe(true)
    expect(Array.isArray(body.latestGeoDepth?.queryRuns)).toBe(true)
    expect(Array.isArray(body.latestGeoDepth?.positionCells)).toBe(true)
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
