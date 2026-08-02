/**
 * OpenAI query×model competitive runs → GeoQueryRun[].
 * Skips multi-provider cron / Claude+Gemini suites (Phase 3 out of scope).
 */

import OpenAI from 'openai'
import type { GeoQueryRun } from '@checkion-v3/contracts'
import { OPENAI_MODEL, getOpenAIKey } from '../llm/config'
import { addOpenAIChatUsage, emptyUsageTotals, type LlmUsageTotals } from '../llm/usage-totals'
import { normalizeGeoHost } from '../geo-presence'
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

let chatClientForTests: QueryRunChatClient | null = null

/** Test hook — inject a stub OpenAI client (no network). */
export function setQueryRunChatClientForTests(client: QueryRunChatClient | null): void {
  chatClientForTests = client
}

export async function runQueryRuns(input: {
  targetUrl: string
  competitors: string[]
  queries: string[]
  models: string[]
}): Promise<RunQueryRunsResult> {
  const usage = emptyUsageTotals()
  let openai: QueryRunChatClient
  try {
    openai =
      chatClientForTests ??
      (new OpenAI({ apiKey: getOpenAIKey() }) as unknown as QueryRunChatClient)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'openai_unavailable'
    throw new Error(`GEO query client unavailable: ${message}`)
  }

  const targetHost = normalizeGeoHost(input.targetUrl)
  const competitorHosts = input.competitors.map(normalizeGeoHost).filter(Boolean)
  const allDomains = [targetHost, ...competitorHosts].filter(Boolean)
  const systemPrompt = buildCompetitiveSystemPrompt(allDomains)
  const models = input.models.length > 0 ? input.models : [OPENAI_MODEL]
  const queryRuns: GeoQueryRun[] = []

  for (const modelId of models) {
    const runPromises = input.queries.map(async (query, q) => {
      const queryId = `q-${q}`
      try {
        const res = await openai.chat.completions.create({
          model: modelId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query },
          ],
          response_format: COMPETITIVE_RESPONSE_FORMAT,
        })
        addOpenAIChatUsage(usage, res.usage)
        const rawContent = res.choices[0]?.message?.content ?? ''
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
        console.error('[checkion-v3] GEO query run error:', modelId, query, e)
        return {
          queryId,
          query,
          modelId,
          answerText: '',
          citations: [],
          ourPosition: null,
        } satisfies GeoQueryRun
      }
    })
    queryRuns.push(...(await Promise.all(runPromises)))
  }

  return { queryRuns, usage }
}
