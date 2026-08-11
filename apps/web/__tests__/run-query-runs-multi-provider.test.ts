import { afterEach, describe, expect, it } from 'vitest'
import {
  runQueryRuns,
  setQueryRunChatClientForTests,
  setQueryRunCompleteForTests,
} from '../lib/geo-eeat/run-query-runs'

describe('runQueryRuns multi-provider', () => {
  afterEach(() => {
    setQueryRunChatClientForTests(null)
    setQueryRunCompleteForTests(null)
  })

  it('routes openai/anthropic/google through the complete hook', async () => {
    const seen: string[] = []
    const prompts: string[] = []
    setQueryRunCompleteForTests(async ({ provider, modelId, userPrompt, systemPrompt }) => {
      seen.push(`${provider}:${modelId}`)
      prompts.push(systemPrompt)
      return {
        content: JSON.stringify({
          answer: `${provider} answer for ${userPrompt}`,
          citations: [{ domain: 'example.com', position: 1 }],
        }),
        usage: { input_tokens: 1, output_tokens: 2 },
      }
    })

    const out = await runQueryRuns({
      targetUrl: 'https://example.com',
      competitors: ['rival.example'],
      queries: ['best widgets'],
      models: ['gpt-5.6-luna', 'claude-sonnet-5', 'gemini-3.6-flash'],
    })

    expect(seen).toEqual([
      'openai:gpt-5.6-luna',
      'anthropic:claude-sonnet-5',
      'google:gemini-3.6-flash',
    ])
    expect(out.queryRuns).toHaveLength(3)
    expect(out.queryRuns.every((r) => r.ourPosition === 1)).toBe(true)
    expect(out.usage.input_tokens).toBe(3)
    expect(out.usage.output_tokens).toBe(6)
    expect(
      prompts.every(
        (p) =>
          !/\bexample\.com\b/.test(p) &&
          !p.includes('rival.example') &&
          !/known domains/i.test(p),
      ),
    ).toBe(true)
  })

  it('soft-fails a model cell when the completer throws', async () => {
    setQueryRunCompleteForTests(async ({ provider }) => {
      if (provider === 'anthropic') throw new Error('ANTHROPIC_API_KEY is not set')
      return {
        content: JSON.stringify({
          answer: 'ok',
          citations: [{ domain: 'example.com', position: 1 }],
        }),
      }
    })

    const out = await runQueryRuns({
      targetUrl: 'https://example.com',
      competitors: [],
      queries: ['q'],
      models: ['gpt-5.6-luna', 'claude-sonnet-5'],
    })

    expect(out.queryRuns[0]?.ourPosition).toBe(1)
    expect(out.queryRuns[1]?.answerText).toMatch(/ANTHROPIC_API_KEY/)
    expect(out.queryRuns[1]?.citations).toEqual([])
  })
})
