import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addLlmUsage,
  parseOpenRouterUsage,
  reportLlmUsage,
  reportSeoDataForSeoUsage,
  reportUsage,
} from '../lib/usage-report'

describe('usage-report', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('parses OpenRouter usage when present', () => {
    const usage = parseOpenRouterUsage({
      model: 'qwen/qwen3.7-flash',
      usage: { prompt_tokens: 1200, completion_tokens: 340 },
    })
    expect(usage).toEqual({
      input_tokens: 1200,
      output_tokens: 340,
      model: 'qwen/qwen3.7-flash',
    })
  })

  it('estimates when usage missing', () => {
    const usage = parseOpenRouterUsage(
      {},
      { system: 'abcd', user: 'efghijkl', content: 'mnop', model: 'm' },
    )
    expect(usage.estimated).toBe(true)
    expect(usage.input_tokens).toBeGreaterThan(0)
    expect(usage.output_tokens).toBeGreaterThan(0)
  })

  it('adds usage totals', () => {
    expect(
      addLlmUsage(
        { input_tokens: 10, output_tokens: 2 },
        { input_tokens: 5, output_tokens: 3, estimated: true, model: 'x' },
      ),
    ).toEqual({ input_tokens: 15, output_tokens: 5, estimated: true, model: 'x' })
  })

  it('POSTs llm_request and seo_dataforseo to Plexon when configured', async () => {
    vi.stubEnv('PLEXON_AUTH_URL', 'https://plexon.test')
    vi.stubEnv('PLEXON_SERVICE_SECRET', 'sec')
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }))
    vi.stubGlobal('fetch', fetchMock)

    reportLlmUsage({
      userId: 'user-1',
      usage: { input_tokens: 100, output_tokens: 40, model: 'qwen/x' },
      surface: 'research',
      idempotencyKey: 'k1',
    })
    reportSeoDataForSeoUsage({
      userId: 'user-1',
      costUsd: 0.0025,
      endpoint: 'keywords',
      projectId: 'p1',
      softCapUnits: 1,
    })

    // fire-and-forget — allow microtask flush
    await Promise.resolve()
    expect(fetchMock).toHaveBeenCalled()
    const bodies = fetchMock.mock.calls.map((c) => JSON.parse(String(c[1]?.body)))
    expect(bodies.some((b) => b.event_type === 'llm_request' && b.raw_units.input_tokens === 100)).toBe(
      true,
    )
    expect(
      bodies.some((b) => b.event_type === 'seo_dataforseo' && b.raw_units.cost_usd === 0.0025),
    ).toBe(true)
    expect(bodies.every((b) => b.service === 'checkion')).toBe(true)
  })

  it('skips reportUsage without userId or plexon config', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    reportUsage({ userId: '', eventType: 'llm_request', rawUnits: {} })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
