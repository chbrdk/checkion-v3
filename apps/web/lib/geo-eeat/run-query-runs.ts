/**
 * Multi-provider query×model competitive runs → GeoQueryRun[].
 * OpenAI (structured JSON), Anthropic Messages, Gemini generateContent.
 */

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { GeoQueryRun } from '@checkion-v3/contracts'
import {
  OPENAI_MODEL,
  getAnthropicKey,
  getGeminiKey,
  getOpenAIKey,
  hasAnthropicKey,
  hasGeminiKey,
  hasOpenAIKey,
} from '../llm/config'
import { addOpenAIChatUsage, emptyUsageTotals, type LlmUsageTotals } from '../llm/usage-totals'
import { normalizeGeoHost } from '../geo-presence'
import { getGeoModel, type GeoModelProvider } from '../geo/model-catalog'
import {
  COMPETITIVE_RESPONSE_JSON_SCHEMA,
  buildCompetitiveSystemPrompt,
  parseCompetitiveResponse,
} from './competitive-response'

const COMPETITIVE_RESPONSE_FORMAT = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'competitive_response',
    strict: true,
    schema: COMPETITIVE_RESPONSE_JSON_SCHEMA,
  },
}

function citationMatchesDomain(citationDomain: string, ourDomain: string): boolean {
  const c = citationDomain.toLowerCase().trim()
  const d = ourDomain.toLowerCase().trim()
  if (c === d) return true
  if (d.endsWith('.' + c)) return true
  if (c.endsWith('.' + d)) return true
  const dBase = d.split('.')[0]
  if (dBase && c === dBase) return true
  if (dBase && c.startsWith(dBase + '.')) return true
  return false
}

export type RunQueryRunsResult = {
  queryRuns: GeoQueryRun[]
  usage: LlmUsageTotals
}

export type QueryRunChatClient = {
  chat: {
    completions: {
      create: (args: {
        model: string
        messages: Array<{ role: 'system' | 'user'; content: string }>
        response_format?: unknown
      }) => Promise<{
        choices: Array<{ message?: { content?: string | null } | null }>
        usage?: { prompt_tokens?: number; completion_tokens?: number }
      }>
    }
  }
}

/** Generic complete hook for tests (any provider). */
export type QueryRunCompleteFn = (args: {
  provider: GeoModelProvider
  modelId: string
  systemPrompt: string
  userPrompt: string
}) => Promise<{ content: string; usage?: { input_tokens?: number; output_tokens?: number } }>

let chatClientForTests: QueryRunChatClient | null = null
let completeForTests: QueryRunCompleteFn | null = null

/** Test hook — inject a stub OpenAI client (no network). */
export function setQueryRunChatClientForTests(client: QueryRunChatClient | null): void {
  chatClientForTests = client
}

/** Test hook — inject a provider-agnostic completer (overrides network for all providers). */
export function setQueryRunCompleteForTests(fn: QueryRunCompleteFn | null): void {
  completeForTests = fn
}

function resolveProvider(modelId: string): GeoModelProvider {
  return getGeoModel(modelId)?.provider ?? 'openai'
}

function emptyRun(
  queryId: string,
  query: string,
  modelId: string,
  answerText = '',
): GeoQueryRun {
  return {
    queryId,
    query,
    modelId,
    answerText,
    citations: [],
    ourPosition: null,
  }
}

async function completeOpenAI(args: {
  modelId: string
  systemPrompt: string
  userPrompt: string
  usage: LlmUsageTotals
}): Promise<string> {
  if (chatClientForTests) {
    const res = await chatClientForTests.chat.completions.create({
      model: args.modelId,
      messages: [
        { role: 'system', content: args.systemPrompt },
        { role: 'user', content: args.userPrompt },
      ],
      response_format: COMPETITIVE_RESPONSE_FORMAT,
    })
    addOpenAIChatUsage(args.usage, res.usage)
    return res.choices[0]?.message?.content ?? ''
  }
  if (!hasOpenAIKey()) {
    throw new Error('OPENAI_API_KEY is not set')
  }
  const openai = new OpenAI({ apiKey: getOpenAIKey() })
  const res = await openai.chat.completions.create({
    model: args.modelId,
    messages: [
      { role: 'system', content: args.systemPrompt },
      { role: 'user', content: args.userPrompt },
    ],
    response_format: COMPETITIVE_RESPONSE_FORMAT,
  })
  addOpenAIChatUsage(args.usage, res.usage)
  return res.choices[0]?.message?.content ?? ''
}

async function completeAnthropic(args: {
  modelId: string
  systemPrompt: string
  userPrompt: string
  usage: LlmUsageTotals
}): Promise<string> {
  if (!hasAnthropicKey()) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }
  const client = new Anthropic({ apiKey: getAnthropicKey() })
  const res = await client.messages.create({
    model: args.modelId,
    max_tokens: 2048,
    system: args.systemPrompt,
    messages: [{ role: 'user', content: args.userPrompt }],
  })
  args.usage.input_tokens += res.usage?.input_tokens ?? 0
  args.usage.output_tokens += res.usage?.output_tokens ?? 0
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
  return text
}

async function completeGemini(args: {
  modelId: string
  systemPrompt: string
  userPrompt: string
  usage: LlmUsageTotals
}): Promise<string> {
  if (!hasGeminiKey()) {
    throw new Error('GEMINI_API_KEY (or GOOGLE_API_KEY) is not set')
  }
  const key = getGeminiKey()
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(args.modelId)}:generateContent?key=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: args.systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: args.userPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Gemini HTTP ${res.status}: ${detail.slice(0, 240)}`)
  }
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
  }
  args.usage.input_tokens += json.usageMetadata?.promptTokenCount ?? 0
  args.usage.output_tokens += json.usageMetadata?.candidatesTokenCount ?? 0
  return json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
}

async function completeForModel(args: {
  provider: GeoModelProvider
  modelId: string
  systemPrompt: string
  userPrompt: string
  usage: LlmUsageTotals
}): Promise<string> {
  if (completeForTests) {
    const out = await completeForTests({
      provider: args.provider,
      modelId: args.modelId,
      systemPrompt: args.systemPrompt,
      userPrompt: args.userPrompt,
    })
    args.usage.input_tokens += out.usage?.input_tokens ?? 0
    args.usage.output_tokens += out.usage?.output_tokens ?? 0
    return out.content
  }
  if (args.provider === 'anthropic') {
    return completeAnthropic(args)
  }
  if (args.provider === 'google') {
    return completeGemini(args)
  }
  return completeOpenAI(args)
}

export async function runQueryRuns(input: {
  targetUrl: string
  competitors: string[]
  queries: string[]
  models: string[]
}): Promise<RunQueryRunsResult> {
  const usage = emptyUsageTotals()
  const targetHost = normalizeGeoHost(input.targetUrl)
  const competitorHosts = input.competitors.map(normalizeGeoHost).filter(Boolean)
  const allDomains = [targetHost, ...competitorHosts].filter(Boolean)
  const systemPrompt = buildCompetitiveSystemPrompt(allDomains)
  const models = input.models.length > 0 ? input.models : [OPENAI_MODEL]
  const queryRuns: GeoQueryRun[] = []

  for (const modelId of models) {
    const provider = resolveProvider(modelId)
    const runPromises = input.queries.map(async (query, q) => {
      const queryId = `q-${q}`
      try {
        const rawContent = await completeForModel({
          provider,
          modelId,
          systemPrompt,
          userPrompt: query,
          usage,
        })
        const parsed = parseCompetitiveResponse(rawContent)
        const match = parsed.citations.find((c) =>
          citationMatchesDomain(c.domain, targetHost),
        )
        return {
          queryId,
          query,
          modelId,
          answerText: parsed.answerText || `(no answer for “${query}”)`,
          citations: parsed.citations,
          ourPosition: match?.position ?? null,
        } satisfies GeoQueryRun
      } catch (e) {
        console.error('[checkion-v3] GEO query run error:', provider, modelId, query, e)
        const hint = e instanceof Error ? e.message : 'provider_error'
        return emptyRun(queryId, query, modelId, `(GEO ${provider} unavailable: ${hint})`)
      }
    })
    queryRuns.push(...(await Promise.all(runPromises)))
  }

  return { queryRuns, usage }
}
