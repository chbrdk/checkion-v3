import { afterEach, describe, expect, it, vi } from 'vitest'
import { shouldRunLiveGeo } from '../lib/geo-eeat/live-geo-gate'
import { setGeoPageScanRunnerForTests } from '../lib/geo-eeat/pipeline'
import { setQueryRunChatClientForTests } from '../lib/geo-eeat/run-query-runs'
import { parseEeatResponse, parseGeoFitnessResponse } from '../lib/geo-eeat/run-llm-stages'
import { parseCompetitiveResponse } from '../lib/geo-eeat/competitive-response'
import {
  createGeoJob,
  getGeoOverview,
  resetGeoStoreForTests,
} from '../lib/fixtures/geo-store'
import type { ScanResult } from '../lib/scan/types'

function stubScanResult(url: string): ScanResult {
  return {
    id: 'stub-geo-scan',
    url,
    timestamp: new Date().toISOString(),
    standard: 'WCAG2AA',
    device: 'desktop',
    runners: ['axe'],
    issues: [],
    passes: [],
    stats: { errors: 0, warnings: 0, notices: 0, total: 0 },
    durationMs: 5,
    score: 90,
    screenshot: '',
    performance: { ttfb: 1, fcp: 2, domLoad: 3, windowLoad: 4, lcp: 5 },
    eco: { co2: 0.1, grade: 'A', pageWeight: 500 },
    bodyTextExcerpt: 'Expert paint systems for automotive OEMs with named engineers.',
    seo: { title: 'Paint systems' } as ScanResult['seo'],
    privacy: { hasPrivacyPolicy: true } as ScanResult['privacy'],
    eeatSignals: { hasImpressum: true, hasAboutLink: true } as ScanResult['eeatSignals'],
  }
}

describe('live geo gate', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('keeps fixture path when DATABASE_URL and live flag unset', () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('CHECKION_LIVE_GEO', '')
    expect(shouldRunLiveGeo()).toBe(false)
  })

  it('enables live when CHECKION_LIVE_GEO=1', () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('CHECKION_LIVE_GEO', '1')
    expect(shouldRunLiveGeo()).toBe(true)
  })

  it('enables live when DATABASE_URL set', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://u:p@localhost:5432/c')
    vi.stubEnv('CHECKION_LIVE_GEO', '')
    expect(shouldRunLiveGeo()).toBe(true)
  })

  it('forces fixture when CHECKION_LIVE_GEO=0 even with DATABASE_URL', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://u:p@localhost:5432/c')
    vi.stubEnv('CHECKION_LIVE_GEO', '0')
    expect(shouldRunLiveGeo()).toBe(false)
  })
})

describe('fixture createGeoJob path', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    resetGeoStoreForTests()
    setGeoPageScanRunnerForTests(null)
    setQueryRunChatClientForTests(null)
  })

  it('synthesizes completed GEO without OPENAI', async () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('CHECKION_LIVE_GEO', '')
    vi.stubEnv('OPENAI_API_KEY', '')

    const job = await createGeoJob({
      projectId: 'proj-1',
      url: 'https://example.com',
      queries: ['best widgets'],
      models: ['gpt-5.4-nano'],
    })

    expect(job.status).toBe('completed')
    expect(job.queryCount).toBe(1)
    const overview = await getGeoOverview(job.id)
    expect(overview?.queryRuns.length).toBeGreaterThan(0)
    expect(overview?.presence.solo.cellCount).toBeGreaterThan(0)
  })

  it('keeps seeded fixtures readable', async () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('CHECKION_LIVE_GEO', '')
    const geo1 = await getGeoOverview('geo-1')
    expect(geo1?.job.title).toMatch(/Dürr|Competitive/i)
    expect(geo1?.queryRuns.length).toBeGreaterThan(0)
  })
})

describe('stubbed live geo path', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    resetGeoStoreForTests()
    setGeoPageScanRunnerForTests(null)
    setQueryRunChatClientForTests(null)
  })

  it('runs mocked LLM query runs and finalizes presence', async () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('CHECKION_LIVE_GEO', '1')
    vi.stubEnv('OPENAI_API_KEY', 'sk-test-not-real')

    setGeoPageScanRunnerForTests(async (opts) => stubScanResult(opts.url))
    setQueryRunChatClientForTests({
      chat: {
        completions: {
          create: async ({ messages }) => {
            const user = messages.find((m) => m.role === 'user')?.content ?? ''
            return {
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      answer: `Answer about example.com for: ${user}`,
                      citations: [
                        { domain: 'example.com', position: 1 },
                        { domain: 'rival.com', position: 2 },
                      ],
                    }),
                  },
                },
              ],
              usage: { prompt_tokens: 10, completion_tokens: 20 },
            }
          },
        },
      },
    })

    // Skip EEAT LLM stages that hit real OpenAI by skipping page scan;
    // query runs use the stub client above.
    const job = await createGeoJob({
      projectId: 'proj-1',
      url: 'https://example.com',
      queries: ['best widgets for OEMs'],
      models: ['gpt-5.4-nano'],
      competitors: ['rival.com'],
      includePageScan: false,
      waitForCompletion: true,
    })

    expect(job.status).toBe('completed')
    const overview = await getGeoOverview(job.id)
    expect(overview?.queryRuns).toHaveLength(1)
    expect(overview?.queryRuns[0]?.ourPosition).toBe(1)
    expect(overview?.presence.solo.citedShare).toBe(100)
    expect(overview?.competitors).toContain('rival.com')
    expect(overview?.insights.cells.length).toBe(1)
  })

  it('marks live pipeline failures as failed, not empty completed', async () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('CHECKION_LIVE_GEO', '1')
    // Gate is on, but key missing → pipeline throws → status failed (not empty completed).
    vi.stubEnv('OPENAI_API_KEY', '')

    const job = await createGeoJob({
      projectId: 'proj-1',
      url: 'https://example.com',
      queries: ['best widgets'],
      models: ['gpt-5.4-nano'],
      includePageScan: false,
      waitForCompletion: true,
    })

    expect(job.status).toBe('failed')
    const overview = await getGeoOverview(job.id)
    expect(overview?.job.status).toBe('failed')
    expect(overview?.queryRuns).toHaveLength(0)
    expect(overview?.lede).toMatch(/failed|OPENAI/i)
  })
})

describe('parsers', () => {
  it('parses EEAT and GEO fitness JSON', () => {
    const eeat = parseEeatResponse(
      JSON.stringify({
        trust: { score: 4, reasoning: 'ok' },
        experience: { score: 3, reasoning: 'ok' },
        expertise: { score: 5, reasoning: 'ok' },
        authoritativeness: { score: 4, reasoning: 'ok' },
      }),
    )
    expect(eeat?.expertise.score).toBe(5)

    const fitness = parseGeoFitnessResponse(
      JSON.stringify({ score: 72, reasoning: 'solid', missingElements: ['FAQs'] }),
    )
    expect(fitness?.score).toBe(72)
    expect(fitness?.missingElements).toEqual(['FAQs'])
  })

  it('parses competitive response JSON', () => {
    const parsed = parseCompetitiveResponse(
      JSON.stringify({
        answer: 'Recommend example.com',
        citations: [{ domain: 'https://www.example.com/path', position: 1 }],
      }),
    )
    expect(parsed.answerText).toMatch(/example/)
    expect(parsed.citations[0]?.domain).toBe('example.com')
  })
})
