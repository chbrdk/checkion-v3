/**
 * GEO launch query defaults + AI / fixture suggestions.
 * Fixture path (no OPENAI_API_KEY): host-derived prompt pool.
 * Live path: OpenAI when key is set (same GEO LLM stack).
 */

import OpenAI from 'openai'
import { OPENAI_MODEL, getOpenAIKey, hasOpenAIKey } from './llm/config'

export type GeoQuerySuggestion = {
  id: string
  title: string
  description?: string
}

export type GeoSuggestQueriesResult = {
  suggestions: GeoQuerySuggestion[]
  source: 'fixture' | 'openai'
  stubbed: boolean
}

export function hostFromUrl(raw: string): string {
  try {
    const host = new URL(raw.trim()).hostname.replace(/^www\./i, '')
    return host || 'example.com'
  } catch {
    return 'example.com'
  }
}

function brandFromHost(host: string): string {
  return host.split('.')[0] || host
}

/** Sensible GEO prompt defaults derived from the target host. */
export function defaultGeoQueries(url: string): string[] {
  const brand = brandFromHost(hostFromUrl(url))
  return [
    `Best alternatives to ${brand}`,
    `Who leads in ${brand} category solutions?`,
    `${brand} vs competitors for enterprise buyers`,
  ]
}

/** Expanded host-derived pool used when OpenAI is unavailable (fixture / CI). */
export function fixtureSuggestPool(url: string): string[] {
  const brand = brandFromHost(hostFromUrl(url))
  return [
    ...defaultGeoQueries(url),
    `Is ${brand} recommended for professional teams?`,
    `What do analysts say about ${brand}?`,
    `${brand} strengths and weaknesses compared to rivals`,
    `Which ${brand} products are cited most often?`,
    `How does ${brand} rank for sustainability and trust?`,
  ]
}

export function sameQueryList(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((q, i) => q === b[i])
}

export function mergeQuerySuggestions(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing.map((q) => q.trim().toLowerCase()).filter(Boolean))
  const next = [...existing]
  for (const raw of incoming) {
    const q = raw.trim()
    if (!q) continue
    const key = q.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    next.push(q)
  }
  return next
}

function extractJsonArray(content: string): string[] | null {
  const trimmed = content.trim()
  const codeBlock = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m)
  const body = codeBlock ? codeBlock[1]!.trim() : trimmed
  const start = body.indexOf('[')
  const end = body.lastIndexOf(']')
  if (start < 0 || end <= start) return null
  try {
    const parsed = JSON.parse(body.slice(start, end + 1)) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed.map((item) => String(item).trim()).filter(Boolean)
  } catch {
    return null
  }
}

async function suggestViaOpenAI(
  url: string,
  existing: string[],
  max: number,
): Promise<string[]> {
  const host = hostFromUrl(url)
  const brand = brandFromHost(host)
  const openai = new OpenAI({ apiKey: getOpenAIKey() })
  const res = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.6,
    messages: [
      {
        role: 'system',
        content:
          'You suggest short buyer-intent prompts for generative-engine optimization (GEO) citation checks. Reply with a JSON array of strings only.',
      },
      {
        role: 'user',
        content: [
          `Target URL: ${url.trim() || 'https://example.com'}`,
          `Host / brand: ${host} / ${brand}`,
          existing.length ? `Already selected:\n- ${existing.join('\n- ')}` : 'No queries selected yet.',
          `Suggest ${max} distinct English prompts a buyer might ask an LLM where this brand might be cited.`,
          'Prefer comparison, recommendation, and category-leadership framings. No numbering.',
        ].join('\n'),
      },
    ],
  })
  const content = res.choices[0]?.message?.content ?? ''
  return extractJsonArray(content) ?? []
}

/**
 * Propose GEO queries for launch.
 * Without OPENAI_API_KEY → fixture host pool (CI / local dummy).
 * With key → OpenAI; falls back to fixture pool on parse/API failure.
 */
export async function suggestGeoQueries(opts: {
  url: string
  existing?: string[]
  max?: number
}): Promise<GeoSuggestQueriesResult> {
  const url = opts.url?.trim() || 'https://example.com'
  const existing = (opts.existing ?? []).map((q) => q.trim()).filter(Boolean)
  const max = Math.min(Math.max(opts.max ?? 4, 1), 8)
  const existingKeys = new Set(existing.map((q) => q.toLowerCase()))

  const toSuggestions = (titles: string[], source: 'fixture' | 'openai', stubbed: boolean) => {
    const filtered = titles
      .map((t) => t.trim())
      .filter((t) => t && !existingKeys.has(t.toLowerCase()))
      .slice(0, max)
    return {
      suggestions: filtered.map((title, i) => ({
        id: `${source}-${i + 1}`,
        title,
        description:
          source === 'fixture'
            ? `Host-derived default for ${hostFromUrl(url)}`
            : `Suggested for ${hostFromUrl(url)}`,
      })),
      source,
      stubbed,
    } satisfies GeoSuggestQueriesResult
  }

  if (!hasOpenAIKey()) {
    return toSuggestions(fixtureSuggestPool(url), 'fixture', true)
  }

  try {
    const live = await suggestViaOpenAI(url, existing, max)
    if (live.length > 0) return toSuggestions(live, 'openai', false)
  } catch {
    /* fall through to fixture */
  }
  return toSuggestions(fixtureSuggestPool(url), 'fixture', true)
}
