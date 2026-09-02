import { afterEach, describe, expect, it, vi } from 'vitest'
import { listDomainCorpusPages } from '../lib/domain-corpus-pages'
import { setDomainScanRunnerForTests } from '../lib/scan/pipeline'

describe('listDomainCorpusPages', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    setDomainScanRunnerForTests(null)
  })
  it('returns paginated pageSamples fallback for legacy domain-1 fixture', async () => {
    const result = await listDomainCorpusPages('domain-1', { page: 1, pageSize: 5 })
    expect(result).toBeTruthy()
    expect(result!.corpusMode).toBe('samples-only')
    expect(result!.rootUrl).toMatch(/durr\.com/)
    expect(result!.items).toHaveLength(5)
    expect(result!.pageCount).toBeGreaterThan(5)
    expect(result!.totalPages).toBeGreaterThan(1)
    expect(result!.items[0]?.url).toMatch(/^https:\/\//)
    expect(result!.items[0]?.resultsPath).toMatch(/^\/results\//)
  })

  it('filters by URL query', async () => {
    const result = await listDomainCorpusPages('domain-1', {
      page: 1,
      pageSize: 25,
      q: '/de/media/news',
    })
    expect(result!.corpusMode).toBe('samples-only')
    expect(result!.pageCount).toBeGreaterThan(0)
    expect(result!.items.every((row) => row.url.toLowerCase().includes('/de/media/news'))).toBe(true)
  })

  it('sorts by url ascending', async () => {
    const result = await listDomainCorpusPages('domain-1', {
      page: 1,
      pageSize: 10,
      sort: 'url_asc',
    })
    const urls = result!.items.map((row) => row.url)
    const sorted = [...urls].sort((a, b) => a.localeCompare(b))
    expect(urls).toEqual(sorted)
    expect(result!.sort).toBe('url_asc')
  })

  it('returns null for unknown domain scan', async () => {
    const result = await listDomainCorpusPages('missing-domain-scan')
    expect(result).toBeNull()
  })

  it('uses persisted corpus rows when available', async () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('CHECKION_LIVE_SCANS', '1')

    const { setDomainScanRunnerForTests } = await import('../lib/scan/pipeline')
    const { createDomainScan } = await import('../lib/fixtures/scan-store')
    const { adaptScanResultToContracts } = await import('../lib/scan/adapt-scan-result')
    type ScanResult = import('../lib/scan/types').ScanResult

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
        stats: { errors: 1, warnings: 2, notices: 0, total: 3 },
        durationMs: 12,
        score: 88,
        screenshot: '',
        performance: { ttfb: 10, fcp: 20, domLoad: 30, windowLoad: 40, lcp: 50 },
        eco: { co2: 0.1, grade: 'B', pageWeight: 1024 },
      }
    }

    setDomainScanRunnerForTests(async function* (url: string) {
      yield { type: 'progress', scannedCount: 1, total: 1, url, message: 'scanning' }
      const page = stubScanResult(url, 'page-1')
      page.screenshot = '/api/scans/page-1/screenshot'
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
          systemicIssues: [],
        },
      }
    })

    const domain = await createDomainScan({
      projectId: 'proj-1',
      url: 'https://corpus-pages.example/',
      waitForCompletion: true,
    })

    const result = await listDomainCorpusPages(domain.id, { page: 1, pageSize: 25 })
    expect(result!.corpusMode).toBe('corpus')
    expect(result!.items).toHaveLength(1)
    expect(result!.items[0]?.url).toBe('https://corpus-pages.example/')
    expect(result!.items[0]?.scanId).toBe(`${domain.id}-p0`)
    expect(result!.items[0]?.errors).toBeGreaterThanOrEqual(1)

    setDomainScanRunnerForTests(null)
  })
})
