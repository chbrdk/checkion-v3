/**
 * Multi-provider query×model competitive runs → GeoQueryRun[].
 * Layer 1 (`recall`): OpenAI structured JSON, Anthropic Messages, Gemini generateContent.
 * Layer 2 (`live`): Responses web_search / Anthropic web_search / Gemini google_search.
 */

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { GeoCitation, GeoMeasurement, GeoQueryRun } from '@checkion-v3/contracts'
import { parseGeoMeasurement } from '../geo/measurement'
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
import { geminiGenerateContentUrl, paths } from '../paths'
import { resolveSearchMarket, searchUserLocation, type GeoSearchMarket } from '../geo/search-market'
import { normalizeGeoHost } from '../geo-presence'
import {
  COMPETITIVE_RESPONSE_JSON_SCHEMA,
  buildCompetitiveSystemPrompt,
  buildGroundedSystemPrompt,
  citationMatchesTargetHost,
  parseCompetitiveResponse,
} from './competitive-response'
import { getGeoModel, type GeoModelProvider } from '../geo/model-catalog'
import {
  citationsFromSourceUrls,
  extractAnthropicGroundedSources,
  extractGeminiGroundedSources,
  extractOpenAiGroundedSources,
} from './grounded-citations'

export { resolveSearchMarket }
export type { GeoSearchMarket }

const COMPETITIVE_RESPONSE_FORMAT = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'competitive_response',
    strict: true,
    schema: COMPETITIVE_RESPONSE_JSON_SCHEMA,
  },
}

export type RunQueryRunsResult = {
  queryRuns: GeoQueryRun[]
  usage: LlmUsageTotals
  /** Resolved search market when measurement is live. */
  searchMarket?: string
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
  measurement: GeoMeasurement
}) => Promise<{
  content: string
  citations?: GeoCitation[]
  searchQueries?: string[]
  usage?: { input_tokens?: number; output_tokens?: number }
}>

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

function toQueryRun(args: {
  queryId: string
  query: string
  modelId: string
  answerText: string
  citations: GeoCitation[]
  targetHost: string
  searchQueries?: string[]
}): GeoQueryRun {
  const match = args.citations.find((c) => citationMatchesTargetHost(c.domain, args.targetHost))
  return {
    queryId: args.queryId,
    query: args.query,
    modelId: args.modelId,
    answerText: args.answerText,
    citations: args.citations,
    ourPosition: match?.position ?? null,
    ...(args.searchQueries?.length ? { searchQueries: args.searchQueries } : {}),
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
  const url = geminiGenerateContentUrl(args.modelId, getGeminiKey())
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

type GroundedComplete = {
  answerText: string
  citations: GeoCitation[]
  searchQueries: string[]
}

function addResponsesUsage(
  totals: LlmUsageTotals,
  usage: { input_tokens?: number; output_tokens?: number } | null | undefined,
): void {
  if (!usage) return
  totals.input_tokens += usage.input_tokens ?? 0
  totals.output_tokens += usage.output_tokens ?? 0
}

async function completeOpenAIGrounded(args: {
  modelId: string
  systemPrompt: string
  userPrompt: string
  usage: LlmUsageTotals
  market: GeoSearchMarket
}): Promise<GroundedComplete> {
  if (!hasOpenAIKey()) {
    throw new Error('OPENAI_API_KEY is not set')
  }
  const openai = new OpenAI({ apiKey: getOpenAIKey() })
  const res = await openai.responses.create({
    model: args.modelId,
    tools: [
      {
        type: paths.openaiWebSearchTool,
        user_location: searchUserLocation(args.market),
        search_context_size: 'high',
      },
    ],
    tool_choice: 'required',
    input: [
      { role: 'system', content: args.systemPrompt },
      { role: 'user', content: args.userPrompt },
    ],
  })
  addResponsesUsage(args.usage, res.usage)
  const extracted = extractOpenAiGroundedSources(res)
  return {
    answerText: extracted.answerText,
    citations: citationsFromSourceUrls(extracted.sources),
    searchQueries: extracted.searchQueries,
  }
}

async function completeAnthropicGrounded(args: {
  modelId: string
  systemPrompt: string
  userPrompt: string
  usage: LlmUsageTotals
  market: GeoSearchMarket
}): Promise<GroundedComplete> {
  if (!hasAnthropicKey()) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }
  const client = new Anthropic({ apiKey: getAnthropicKey() })
  const res = await client.messages.create({
    model: args.modelId,
    max_tokens: 4096,
    system: args.systemPrompt,
    tools: [
      {
        type: paths.anthropicWebSearchTool,
        name: 'web_search',
        user_location: searchUserLocation(args.market),
      } as unknown as Anthropic.Messages.Tool,
    ],
    messages: [{ role: 'user', content: args.userPrompt }],
  })
  args.usage.input_tokens += res.usage?.input_tokens ?? 0
  args.usage.output_tokens += res.usage?.output_tokens ?? 0
  const extracted = extractAnthropicGroundedSources(res)
  return {
    answerText: extracted.answerText,
    citations: citationsFromSourceUrls(extracted.sources),
    searchQueries: extracted.searchQueries,
  }
}

async function completeGeminiGrounded(args: {
  modelId: string
  systemPrompt: string
  userPrompt: string
  usage: LlmUsageTotals
}): Promise<GroundedComplete> {
  if (!hasGeminiKey()) {
    throw new Error('GEMINI_API_KEY (or GOOGLE_API_KEY) is not set')
  }
  const url = geminiGenerateContentUrl(args.modelId, getGeminiKey())
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: args.systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: args.userPrompt }] }],
      tools: [{ google_search: {} }],
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Gemini HTTP ${res.status}: ${detail.slice(0, 240)}`)
  }
  const json = (await res.json()) as {
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
  }
  args.usage.input_tokens += json.usageMetadata?.promptTokenCount ?? 0
  args.usage.output_tokens += json.usageMetadata?.candidatesTokenCount ?? 0
  const extracted = extractGeminiGroundedSources(json)
  return {
    answerText: extracted.answerText,
    citations: citationsFromSourceUrls(extracted.sources),
    searchQueries: extracted.searchQueries,
  }
}

async function completeRecallForModel(args: {
  provider: GeoModelProvider
  modelId: string
  systemPrompt: string
  userPrompt: string
  usage: LlmUsageTotals
}): Promise<string> {
  if (args.provider === 'anthropic') return completeAnthropic(args)
  if (args.provider === 'google') return completeGemini(args)
  return completeOpenAI(args)
}

async function completeLiveForModel(args: {
  provider: GeoModelProvider
  modelId: string
  systemPrompt: string
  userPrompt: string
  usage: LlmUsageTotals
  market: GeoSearchMarket
}): Promise<GroundedComplete> {
  if (args.provider === 'anthropic') return completeAnthropicGrounded(args)
  if (args.provider === 'google') return completeGeminiGrounded(args)
  return completeOpenAIGrounded(args)
}

export async function runQueryRuns(input: {
  targetUrl: string
  competitors: string[]
  queries: string[]
  models: string[]
  measurement?: GeoMeasurement
}): Promise<RunQueryRunsResult> {
  const usage = emptyUsageTotals()
  const targetHost = normalizeGeoHost(input.targetUrl)
  const measurement = parseGeoMeasurement(input.measurement)
  const market = measurement === 'live' ? resolveSearchMarket(input.targetUrl) : null
  const systemPrompt =
    measurement === 'live'
      ? buildGroundedSystemPrompt({ country: market?.country })
      : buildCompetitiveSystemPrompt()
  const models = input.models.length > 0 ? input.models : [OPENAI_MODEL]
  const queryRuns: GeoQueryRun[] = []

  for (const modelId of models) {
    const provider = resolveProvider(modelId)
    const runPromises = input.queries.map(async (query, q) => {
      const queryId = `q-${q}`
      try {
        if (completeForTests) {
          const out = await completeForTests({
            provider,
            modelId,
            systemPrompt,
            userPrompt: query,
            measurement,
          })
          usage.input_tokens += out.usage?.input_tokens ?? 0
          usage.output_tokens += out.usage?.output_tokens ?? 0
          if (measurement === 'live' && out.citations) {
            return toQueryRun({
              queryId,
              query,
              modelId,
              answerText: out.content || `(no answer for “${query}”)`,
              citations: out.citations,
              targetHost,
              searchQueries: out.searchQueries,
            })
          }
          const parsed = parseCompetitiveResponse(out.content)
          return toQueryRun({
            queryId,
            query,
            modelId,
            answerText: parsed.answerText || `(no answer for “${query}”)`,
            citations: parsed.citations,
            targetHost,
          })
        }

        if (measurement === 'live' && market) {
          const grounded = await completeLiveForModel({
            provider,
            modelId,
            systemPrompt,
            userPrompt: query,
            usage,
            market,
          })
          return toQueryRun({
            queryId,
            query,
            modelId,
            answerText: grounded.answerText || `(no answer for “${query}”)`,
            citations: grounded.citations,
            targetHost,
            searchQueries: grounded.searchQueries,
          })
        }

        const rawContent = await completeRecallForModel({
          provider,
          modelId,
          systemPrompt,
          userPrompt: query,
          usage,
        })
        const parsed = parseCompetitiveResponse(rawContent)
        return toQueryRun({
          queryId,
          query,
          modelId,
          answerText: parsed.answerText || `(no answer for “${query}”)`,
          citations: parsed.citations,
          targetHost,
        })
      } catch (e) {
        console.error('[checkion-v3] GEO query run error:', provider, modelId, query, e)
        const hint = e instanceof Error ? e.message : 'provider_error'
        return emptyRun(queryId, query, modelId, `(GEO ${provider} unavailable: ${hint})`)
      }
    })
    queryRuns.push(...(await Promise.all(runPromises)))
  }

  return {
    queryRuns,
    usage,
    ...(market ? { searchMarket: market.country } : {}),
  }
}
