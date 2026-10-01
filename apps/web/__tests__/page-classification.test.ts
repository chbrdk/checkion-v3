import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  classifyPageWithLlm,
  extractMessageContent,
  parseJsonLoose,
  parsePageClassificationPayload,
} from '../lib/scan/llm/page-classification'
import { adaptScanResultToContracts } from '../lib/scan/adapt-scan-result'
import type { ScanResult } from '../lib/scan/types'

function baseResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    id: 'scan-test-1',
    url: 'https://example.com/services',
    timestamp: new Date().toISOString(),
    device: 'desktop',
    score: 80,
    documentTitle: 'Services',
    issues: [],
    passes: [],
    stats: { errors: 0, warnings: 0, notices: 0, total: 0 },
    seo: {
      title: 'Services | Example',
      metaDescription: 'Consulting for automotive production.',
      h1: 'Services',
      canonical: null,
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
      twitterCard: null,
    },
    bodyTextExcerpt:
      'We help OEMs integrate new vehicle architectures into brownfield plants. Focus on space, timing, and IT/OT.',
    ...overrides,
  } as ScanResult
}

describe('page-classification', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.OPENROUTER_API_KEY
    delete process.env.CHECKION_PAGE_CLASSIFY_MODEL
  })

  it('parses tagTiers + shortSummary', () => {
    const parsed = parsePageClassificationPayload({
      shortSummary: 'Page about automotive plant integration.',
      tagTiers: [
        { tag: 'Automotive integration', tier: 5 },
        { tag: 'Brownfield plants', tier: 4 },
        { tag: 'IT/OT', tier: 3 },
      ],
    })
    expect(parsed?.shortSummary).toMatch(/automotive/i)
    expect(parsed?.tagTiers).toHaveLength(3)
    expect(parsed?.tagTiers[0]).toEqual({ tag: 'automotive integration', tier: 5 })
  })

  it('parseJsonLoose tolerates fences and think blocks', () => {
    const payload = {
      shortSummary: 'Career landing for apprentices.',
      tagTiers: [
        { tag: 'apprenticeships', tier: 5 },
        { tag: 'employer branding', tier: 4 },
        { tag: 'insurance careers', tier: 3 },
      ],
    }
    const fenced = `\`\`\`json\n${JSON.stringify(payload)}\n\`\`\``
    expect(parsePageClassificationPayload(parseJsonLoose(fenced))).not.toBeNull()

    const withThink = `<think>plan tags</think>\n${JSON.stringify(payload)}`
    expect(parsePageClassificationPayload(parseJsonLoose(withThink))).not.toBeNull()
  })

  it('extractMessageContent joins content parts', () => {
    expect(
      extractMessageContent({
        content: [{ type: 'text', text: '{"a":1}' }],
      }),
    ).toBe('{"a":1}')
  })

  it('rejects fewer than 3 tags or empty summary', () => {
    expect(
      parsePageClassificationPayload({
        shortSummary: 'Too thin',
        tagTiers: [{ tag: 'one', tier: 3 }],
      }),
    ).toBeNull()
    expect(
      parsePageClassificationPayload({
        shortSummary: '',
        tags: ['a', 'b', 'c'],
      }),
    ).toBeNull()
  })

  it('skips when classifyPageTopics is false', async () => {
    process.env.OPENROUTER_API_KEY = 'sk-test'
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const out = await classifyPageWithLlm(baseResult(), { classifyPageTopics: false })
    expect(out).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fail-open without OPENROUTER_API_KEY', async () => {
    const out = await classifyPageWithLlm(baseResult(), { classifyPageTopics: true })
    expect(out).toBeNull()
  })

  it('maps OpenRouter JSON into classification', async () => {
    process.env.OPENROUTER_API_KEY = 'sk-test'
    process.env.CHECKION_PAGE_CLASSIFY_MODEL = 'qwen/qwen3.7-flash'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          model: 'qwen/qwen3.7-flash',
          usage: { prompt_tokens: 100, completion_tokens: 40 },
          choices: [
            {
              message: {
                content: JSON.stringify({
                  shortSummary: 'Consulting page for plant modernization.',
                  tagTiers: [
                    { tag: 'plant modernization', tier: 5 },
                    { tag: 'oem consulting', tier: 4 },
                    { tag: 'production ramp-up', tier: 3 },
                  ],
                }),
              },
            },
          ],
        }),
      })),
    )

    const out = await classifyPageWithLlm(baseResult(), {
      classifyPageTopics: true,
      userId: 'user-1',
    })
    expect(out?.classification?.tagTiers.length).toBe(3)
    expect(out?.classification?.shortSummary).toMatch(/plant/i)
    expect(out?.usage?.input_tokens).toBe(100)
  })

  it('adapt-scan-result persists classification on overview', () => {
    const result = baseResult({
      pageClassification: {
        shortSummary: 'Topic summary for magazine.',
        tagTiers: [
          { tag: 'topic-a', tier: 5 },
          { tag: 'topic-b', tier: 3 },
          { tag: 'topic-c', tier: 2 },
        ],
      },
    })
    const { overview } = adaptScanResultToContracts(result, {
      id: 'scan-test-1',
      projectId: 'proj-1',
      mode: 'single',
    })
    expect(overview.classification?.tags).toEqual(['topic-a', 'topic-b', 'topic-c'])
    expect(overview.classification?.intensityTier).toBe(5)
    expect(overview.classification?.shortSummary).toMatch(/Topic summary/)
  })
})
