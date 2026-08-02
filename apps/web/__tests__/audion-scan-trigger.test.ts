import { afterEach, describe, expect, it, vi } from 'vitest'
import { createScan } from '../lib/fixtures/scan-store'
import { paths } from '../lib/paths'
import { hasAudionCorrelation, parseScanCorrelation, withScanCorrelation } from '../lib/scan-correlation'

vi.mock('../auth', () => ({
  auth: vi.fn(async () => null),
}))

describe('scan correlation helpers', () => {
  it('parses optional AUDION correlation fields', () => {
    expect(parseScanCorrelation({})).toBeUndefined()
    expect(
      parseScanCorrelation({
        platformProjectId: ' col-1 ',
        audionRunId: 'run-9',
        stepUrl: 'https://example.com/step',
      }),
    ).toEqual({
      platformProjectId: 'col-1',
      audionRunId: 'run-9',
      stepUrl: 'https://example.com/step',
    })
  })

  it('attaches correlation onto ScanSummary', () => {
    const scan = withScanCorrelation(
      {
        id: 's1',
        projectId: 'p1',
        mode: 'single',
        url: 'https://example.com',
        status: 'completed',
        startedAt: '2026-01-01T00:00:00.000Z',
        completedAt: '2026-01-01T00:00:01.000Z',
        overallScore: 80,
        issueCount: 2,
      },
      { audionRunId: 'inspect-1', platformProjectId: 'plat-1' },
    )
    expect(hasAudionCorrelation(scan)).toBe(true)
    expect(scan.audionRunId).toBe('inspect-1')
    expect(scan.platformProjectId).toBe('plat-1')
  })

  it('builds /scan deep-link with url + mode=single', () => {
    expect(
      paths.routes.scanLaunch({
        projectId: 'proj-1',
        mode: 'single',
        url: 'https://www.bosch-ebike.com/de/',
        audionRunId: 'job-1',
      }),
    ).toBe(
      '/scan?projectId=proj-1&mode=single&url=https%3A%2F%2Fwww.bosch-ebike.com%2Fde%2F&audionRunId=job-1',
    )
  })
})

describe('POST /api/scans correlation', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('persists correlation on createScan (fixture mode)', async () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('CHECKION_LIVE_SCANS', '0')
    const scan = await createScan({
      projectId: 'proj-bosch',
      mode: 'single',
      url: 'https://www.bosch-ebike.com/de/service/produktkombinationen',
      correlation: {
        platformProjectId: 'collection-1',
        audionRunId: 'chat-job-42',
        stepUrl: 'https://www.bosch-ebike.com/de/service/produktkombinationen',
      },
    })
    expect(scan.mode).toBe('single')
    expect(scan.audionRunId).toBe('chat-job-42')
    expect(scan.platformProjectId).toBe('collection-1')
    expect(scan.stepUrl).toContain('produktkombinationen')
  })

  it('accepts correlation via HTTP POST handler', async () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('CHECKION_LIVE_SCANS', '0')
    vi.stubEnv('PLEXON_AUTH_URL', '')
    vi.stubEnv('PLEXON_SERVICE_SECRET', '')
    const { POST } = await import('../app/api/scans/route')
    const res = await POST(
      new Request('http://localhost/api/scans', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          projectId: 'proj-bosch',
          mode: 'single',
          url: 'https://example.com/page',
          platformProjectId: 'plat-9',
          audionRunId: 'wave-run-1',
          stepUrl: 'https://example.com/page',
        }),
      }),
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.audionRunId).toBe('wave-run-1')
    expect(body.platformProjectId).toBe('plat-9')
    expect(body.id).toMatch(/^scan-single-/)
  })
})
