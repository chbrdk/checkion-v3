import { afterEach, describe, expect, it, vi } from 'vitest'
import { shouldRunLiveScans } from '../lib/scan/live-scan-gate'
import {
  setDomainScanRunnerForTests,
  setSingleScanRunnerForTests,
} from '../lib/scan/pipeline'
import { createScan, createDomainScan, getScan, getScanOverview } from '../lib/fixtures/scan-store'
import type { ScanResult } from '../lib/scan/types'
import { adaptScanResultToContracts } from '../lib/scan/adapt-scan-result'

function stubScanResult(url: string, id = 'stub-1'): ScanResult {
  return {
    id,
    url,
    timestamp: new Date().toISOString(),
    standard: 'WCAG2AA',
    device: 'desktop',
    runners: ['axe'],
    issues: [
      {
        code: 'color-contrast',
        type: 'error',
        message: 'Stub contrast issue',
        context: '<button>',
        selector: 'button',
        runner: 'axe',
        wcagLevel: 'AA',
      },
    ],
    passes: [],
    stats: { errors: 1, warnings: 0, notices: 0, total: 1 },
    durationMs: 12,
    score: 88,
    screenshot: '',
    performance: { ttfb: 10, fcp: 20, domLoad: 30, windowLoad: 40, lcp: 50 },
    eco: { co2: 0.1, grade: 'B', pageWeight: 1024 },
  }
}

describe('live scan gate', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('keeps fixture path when DATABASE_URL and live flag unset', () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('CHECKION_LIVE_SCANS', '')
    expect(shouldRunLiveScans()).toBe(false)
  })

  it('enables live when CHECKION_LIVE_SCANS=1', () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('CHECKION_LIVE_SCANS', '1')
    expect(shouldRunLiveScans()).toBe(true)
  })

  it('enables live when DATABASE_URL set', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://u:p@localhost:5432/c')
    vi.stubEnv('CHECKION_LIVE_SCANS', '')
    expect(shouldRunLiveScans()).toBe(true)
  })

  it('forces fixture when CHECKION_LIVE_SCANS=0 even with DATABASE_URL', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://u:p@localhost:5432/c')
    vi.stubEnv('CHECKION_LIVE_SCANS', '0')
    expect(shouldRunLiveScans()).toBe(false)
  })
})

describe('fixture createScan path', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    setSingleScanRunnerForTests(null)
    setDomainScanRunnerForTests(null)
  })

  it('synthesizes completed scan without live env (no browser)', async () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('CHECKION_LIVE_SCANS', '')
    const scan = await createScan({
      projectId: 'proj-1',
      mode: 'single',
      url: 'https://fixture.example/',
    })
    expect(scan.status).toBe('completed')
    expect(scan.issueCount).toBeGreaterThan(0)
    expect(scan.completedAt).toBeTruthy()
  })
})

describe('stubbed live scan path', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    setSingleScanRunnerForTests(null)
    setDomainScanRunnerForTests(null)
  })

  it('runs injected single scanner and persists overview in memory', async () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('CHECKION_LIVE_SCANS', '1')
    setSingleScanRunnerForTests(async (opts) => stubScanResult(opts.url, 'live-stub'))

    const scan = await createScan({
      projectId: 'proj-1',
      mode: 'single',
      url: 'https://live.example/',
      waitForCompletion: true,
    })

    expect(scan.status).toBe('completed')
    expect(scan.url).toBe('https://live.example/')
    expect(scan.issueCount).toBe(1)

    const overview = await getScanOverview(scan.id)
    expect(overview?.lede).toMatch(/Live scan/)
    expect(overview?.topIssues[0]?.ruleId).toBe('color-contrast')
  })

  it('runs injected domain spider via POST helper', async () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('CHECKION_LIVE_SCANS', '1')
    setDomainScanRunnerForTests((async function* (url: string) {
      yield { type: 'progress', scannedCount: 1, total: 2, url, message: 'scanning' }
      const page = stubScanResult(url, 'page-1')
      yield {
        type: 'complete' as const,
        domainResult: {
          id: 'domain-stub',
          domain: url,
          timestamp: new Date().toISOString(),
          status: 'complete' as const,
          progress: { scanned: 1, total: 1 },
          totalPages: 1,
          score: 88,
          pages: [page],
          graph: { nodes: [], links: [] },
          systemicIssues: [
            {
              issueId: 'color-contrast',
              title: 'Contrast',
              count: 1,
              pages: [url],
            },
          ],
        },
      }
    }) as unknown as Parameters<typeof setDomainScanRunnerForTests>[0])

    const domain = await createDomainScan({
      projectId: 'proj-1',
      url: 'https://domain.example/',
      waitForCompletion: true,
    })

    expect(domain.status).toBe('completed')
    expect(domain.pageCount).toBe(1)
    expect(domain.issueCount).toBeGreaterThan(0)
  })
})

describe('adaptScanResultToContracts', () => {
  it('maps v2 severity and scores into contracts', () => {
    const adapted = adaptScanResultToContracts(stubScanResult('https://a.test'), {
      id: 'scan-x',
      projectId: 'proj-1',
      mode: 'single',
    })
    expect(adapted.issues[0]?.severity).toBe('critical')
    expect(adapted.scores.some((s) => s.kind === 'accessibility')).toBe(true)
    expect(adapted.overview.scan.id).toBe('scan-x')
  })
})

describe('getScan after fixture create', () => {
  it('returns the synthesized row', async () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('CHECKION_LIVE_SCANS', '0')
    const created = await createScan({
      projectId: 'proj-1',
      mode: 'single',
      url: 'https://again.example/',
    })
    const got = await getScan(created.id)
    expect(got?.id).toBe(created.id)
  })
})
