/**
 * GEO launch query defaults + AI / fixture suggestions.
 * Fixture path (no OPENAI_API_KEY): host/brand-derived prompt pool.
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

export type GeoSuggestProjectContext = {
  name?: string
  domain?: string
}

export type GeoSuggestKnowledgeContext = {
  profile?: { displayName?: string; industry?: string | null; tagline?: string | null }
  competitive?: { category?: string | null; hosts?: string[] }
  researchBrief?: { summary?: string | null; topics?: string[] }
  geoContext?: { queryThemes?: string[]; seedQueries?: string[] }
}

export function hostFromUrl(raw: string): string {
  try {
    const host = new URL(raw.trim()).hostname.replace(/^www\./i, '')
    return host || 'example.com'
  } catch {
    return 'example.com'
  }
}

const GEO_LAUNCH_FALLBACK_URL = 'https://www.bosch-ebike.com/de/'

/** Slugify a company / brand label for citation URL derivation. */
export function slugifyCompanyName(raw: string): string {
  const slug = raw
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug || 'company'
}

/**
 * When the user provides only a company name, derive a stable citation-target URL
 * so `POST /api/geo-jobs` and host helpers still have a usable `url`.
 */
export function urlFromCompanyName(companyName: string): string {
  const slug = slugifyCompanyName(companyName)
  return `https://${slug}.example/`
}

/**
 * Normalize an explicit GEO URL (adds https:// when missing).
 * Returns null when the value cannot be parsed as a host URL.
 */
export function normalizeGeoUrl(raw: string | undefined | null): string | null {
  const trimmed = raw?.trim() ?? ''
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`)
    if (!parsed.hostname) return null
    return parsed.href
  } catch {
    return null
  }
}

/**
 * Resolve the citation-target URL for GEO create / Suggest.
 * Priority: explicit URL → company-derived URL → first query host → optional fallback.
 */
export function resolveGeoLaunchUrl(
  url: string | undefined,
  queries: string[],
  opts?: { companyName?: string; fallback?: string | null },
): string {
  const fromUrl = normalizeGeoUrl(url)
  if (fromUrl) return fromUrl

  const company = opts?.companyName?.trim()
  if (company) return urlFromCompanyName(company)

  for (const q of queries) {
    const fromQuery = urlFromQueryText(q)
    if (fromQuery) return fromQuery
  }

  const fallback = opts?.fallback === undefined ? GEO_LAUNCH_FALLBACK_URL : opts.fallback
  return fallback ?? ''
}

/**
 * Extract a usable citation-target URL from free-text query prompts.
 * Prefers an explicit http(s) URL; otherwise a bare hostname with a TLD.
 */
export function urlFromQueryText(raw: string): string | null {
  const text = raw.trim()
  if (!text) return null

  const absolute = text.match(/https?:\/\/[^\s<>"']+/i)
  if (absolute) {
    try {
      const cleaned = absolute[0]!.replace(/[),.;:!?]+$/g, '')
      const parsed = new URL(cleaned)
      if (parsed.hostname) return parsed.href
    } catch {
      /* fall through */
    }
  }

  // Require ≥2-char label + ≥2-char TLD to avoid tokens like "e.g."
  const bare = text.match(/\b(?:www\.)?[a-z0-9][a-z0-9-]{1,}(?:\.[a-z]{2,})+\b/i)
  if (bare) {
    try {
      const parsed = new URL(`https://${bare[0]!.toLowerCase()}/`)
      if (parsed.hostname.includes('.')) return parsed.href
    } catch {
      /* fall through */
    }
  }

  return null
}

function brandFromHost(host: string): string {
  return host.split('.')[0] || host
}

export function brandForGeoTarget(opts: {
  url?: string
  companyName?: string
}): string {
  const company = opts.companyName?.trim()
  if (company) return company
  const url = opts.url?.trim()
  if (url) return brandFromHost(hostFromUrl(url))
  return 'brand'
}

/** Sensible GEO prompt defaults derived from the target brand / host. */
export function defaultGeoQueries(
  url: string,
  opts?: { companyName?: string },
): string[] {
  const brand = brandForGeoTarget({ url, companyName: opts?.companyName })
  return [
    `Best alternatives to ${brand}`,
    `Who leads in ${brand} category solutions?`,
    `${brand} vs competitors for enterprise buyers`,
  ]
}

/** Expanded brand-derived pool used when OpenAI is unavailable (fixture / CI). */
export function fixtureSuggestPool(
  url: string,
  opts?: { companyName?: string },
): string[] {
  const brand = brandForGeoTarget({ url, companyName: opts?.companyName })
  return [
    ...defaultGeoQueries(url, opts),
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

async function suggestViaOpenAI(opts: {
  url: string
  companyName?: string
  project?: GeoSuggestProjectContext
  knowledge?: GeoSuggestKnowledgeContext
  existing: string[]
  max: number
}): Promise<string[]> {
  const brand = brandForGeoTarget({ url: opts.url, companyName: opts.companyName })
  const host = hostFromUrl(opts.url)
  const projectBits = [
    opts.project?.name?.trim() ? `Project name: ${opts.project.name.trim()}` : null,
    opts.project?.domain?.trim() ? `Project domain: ${opts.project.domain.trim()}` : null,
  ].filter(Boolean)
  const knowledgeBits: string[] = []
  if (opts.knowledge?.profile?.displayName) {
    knowledgeBits.push(`Shared display name: ${opts.knowledge.profile.displayName}`)
  }
  if (opts.knowledge?.profile?.industry) {
    knowledgeBits.push(`Industry: ${opts.knowledge.profile.industry}`)
  }
  if (opts.knowledge?.profile?.tagline) {
    knowledgeBits.push(`Tagline: ${opts.knowledge.profile.tagline}`)
  }
  if (opts.knowledge?.competitive?.category) {
    knowledgeBits.push(`Category: ${opts.knowledge.competitive.category}`)
  }
  if (opts.knowledge?.competitive?.hosts?.length) {
    knowledgeBits.push(`Known rivals: ${opts.knowledge.competitive.hosts.join(', ')}`)
  }
  if (opts.knowledge?.researchBrief?.summary) {
    knowledgeBits.push(`Research brief: ${opts.knowledge.researchBrief.summary.slice(0, 600)}`)
  }
  if (opts.knowledge?.researchBrief?.topics?.length) {
    knowledgeBits.push(`Topics: ${opts.knowledge.researchBrief.topics.join(', ')}`)
  }
  if (opts.knowledge?.geoContext?.queryThemes?.length) {
    knowledgeBits.push(`Prior GEO themes: ${opts.knowledge.geoContext.queryThemes.join(', ')}`)
  }
  if (opts.knowledge?.geoContext?.seedQueries?.length) {
    knowledgeBits.push(
      `Prior seed queries:\n- ${opts.knowledge.geoContext.seedQueries.slice(0, 8).join('\n- ')}`,
    )
  }
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
          `Target URL: ${opts.url.trim() || 'https://example.com'}`,
          `Company / brand: ${brand}`,
          `Host: ${host}`,
          ...projectBits,
          ...knowledgeBits,
          opts.existing.length
            ? `Already selected:\n- ${opts.existing.join('\n- ')}`
            : 'No queries selected yet.',
          `Suggest ${opts.max} distinct English prompts a buyer might ask an LLM where this brand might be cited.`,
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
 * Without OPENAI_API_KEY → fixture brand pool (CI / local dummy).
 * With key → OpenAI; falls back to fixture pool on parse/API failure.
 */
export async function suggestGeoQueries(opts: {
  url?: string
  companyName?: string
  project?: GeoSuggestProjectContext
  knowledge?: GeoSuggestKnowledgeContext
  existing?: string[]
  max?: number
}): Promise<GeoSuggestQueriesResult & { usedCollectionKnowledge?: boolean }> {
  const companyName =
    opts.companyName?.trim() ||
    opts.knowledge?.profile?.displayName?.trim() ||
    undefined
  const url =
    normalizeGeoUrl(opts.url) ||
    (companyName ? urlFromCompanyName(companyName) : '') ||
    'https://example.com'
  const existing = (opts.existing ?? []).map((q) => q.trim()).filter(Boolean)
  const max = Math.min(Math.max(opts.max ?? 4, 1), 8)
  const existingKeys = new Set(existing.map((q) => q.toLowerCase()))
  const brand = brandForGeoTarget({ url, companyName })
  const usedCollectionKnowledge = Boolean(
    opts.knowledge &&
      (opts.knowledge.profile?.displayName ||
        opts.knowledge.competitive?.hosts?.length ||
        opts.knowledge.researchBrief?.summary ||
        opts.knowledge.geoContext?.seedQueries?.length ||
        opts.knowledge.geoContext?.queryThemes?.length),
  )

  const toSuggestions = (titles: string[], source: 'fixture' | 'openai', stubbed: boolean) => {
    const seedBoost = opts.knowledge?.geoContext?.seedQueries ?? []
    const combined = [...seedBoost, ...titles]
    const filtered = combined
      .map((t) => t.trim())
      .filter((t) => t && !existingKeys.has(t.toLowerCase()))
      .filter((t, i, arr) => arr.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i)
      .slice(0, max)
    return {
      suggestions: filtered.map((title, i) => ({
        id: `${source}-${i + 1}`,
        title,
        description:
          source === 'fixture'
            ? `Brand-derived default for ${brand}`
            : `Suggested for ${brand}`,
      })),
      source,
      stubbed,
      usedCollectionKnowledge,
    }
  }

  if (!hasOpenAIKey()) {
    return toSuggestions(fixtureSuggestPool(url, { companyName }), 'fixture', true)
  }

  try {
    const live = await suggestViaOpenAI({
      url,
      companyName,
      project: opts.project,
      knowledge: opts.knowledge,
      existing,
      max,
    })
    if (live.length > 0) return toSuggestions(live, 'openai', false)
  } catch {
    /* fall through to fixture */
  }
  return toSuggestions(fixtureSuggestPool(url, { companyName }), 'fixture', true)
}
