import type { GeoKnowledgeEnrichment } from '../plexon-knowledge-pack'
import { paths } from '../paths'
import {
  brandSeedFromHost,
  isJunkKeywordToken,
  looksLikeSearchQuery,
} from './host-utils'

export type SeoSuggestSurface = 'field' | 'research' | 'ranks'

export class FieldSuggestError extends Error {
  constructor(
    message: string,
    readonly code: 'unconfigured' | 'upstream' | 'invalid',
  ) {
    super(message)
    this.name = 'FieldSuggestError'
  }
}

function openRouterKey(): string {
  return (process.env[paths.envOpenRouterApiKey] ?? '').trim()
}

function openRouterBase(): string {
  const raw = (process.env[paths.envOpenRouterApiBaseUrl] ?? '').trim()
  const base = (raw || paths.openRouterApiBaseDefault).replace(/\/$/, '')
  return base.endsWith('/api/v1') ? base : `${base}/api/v1`
}

function suggestModel(): string {
  const raw = (process.env[paths.envSeoFieldSuggestModel] ?? '').trim()
  return raw || paths.seoFieldSuggestModelDefault
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function brandBitsFor(domain: string): Set<string> {
  const brand = brandSeedFromHost(domain)
  return new Set(
    [brand, domain.replace(/^www\./, '').split('.')[0] ?? '']
      .flatMap((s) => [s, ...s.split(/[-_]/g)])
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 1 && !isJunkKeywordToken(s)),
  )
}

/** Drop junk / bare-brand tokens. Research may keep brand once as a seed. */
export function sanitizeSuggestKeywords(
  keywords: string[],
  domain: string,
  surface: SeoSuggestSurface,
  max = 8,
): string[] {
  const bits = brandBitsFor(domain)
  const host = domain.replace(/^www\./i, '').toLowerCase()
  const out: string[] = []
  const seen = new Set<string>()
  let brandKept = false
  for (const item of keywords) {
    const k = String(item ?? '')
      .trim()
      .replace(/\s+/g, ' ')
    if (!k || k.length > 80) continue
    const lower = k.toLowerCase()
    if (seen.has(lower)) continue
    if (!looksLikeSearchQuery(k) || lower === host) continue
    if (bits.has(lower)) {
      if (surface !== 'research' || brandKept) continue
      brandKept = true
    }
    seen.add(lower)
    out.push(k)
    if (out.length >= max) break
  }
  return out
}

function parseKeywords(raw: unknown, max = 8): string[] {
  const o = asRecord(raw)
  const list = o && Array.isArray(o.keywords) ? o.keywords : Array.isArray(raw) ? raw : null
  if (!list) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of list) {
    const k = String(item ?? '')
      .trim()
      .replace(/\s+/g, ' ')
    if (!k || k.length > 80) continue
    const key = k.toLowerCase()
    if (seen.has(key) || !looksLikeSearchQuery(k)) continue
    seen.add(key)
    out.push(k)
    if (out.length >= max) break
  }
  return out
}

/** Pull searchable seeds from Collection Knowledge Pack (audiences / GEO / research). */
export function candidatesFromKnowledge(
  knowledge: GeoKnowledgeEnrichment | null | undefined,
): string[] {
  if (!knowledge) return []
  return mergeKeywordCandidates(
    knowledge.geoContext?.seedQueries,
    knowledge.geoContext?.queryThemes,
    knowledge.researchBrief?.topics,
  )
}

function nameTokens(projectName: string | undefined): string[] {
  if (!projectName?.trim()) return []
  return projectName
    .trim()
    .split(/[\s|/·—–-]+/)
    .map((t) => t.trim())
    .filter(
      (t) =>
        t.length > 2 &&
        !isJunkKeywordToken(t) &&
        !/^(gmbh|ag|ltd|inc|the|and|und|seo|group)$/i.test(t),
    )
    .slice(0, 3)
}

/**
 * Deterministic fixture suggestions when live SEO Market is off / Qwen returns junk.
 * Grounded in domain brand + project name / industry — never heating or search-engine fixtures.
 */
export function fixtureFieldSuggestions(input: {
  domain: string
  projectName?: string
  locale?: string
  surface?: SeoSuggestSurface
  knowledge?: GeoKnowledgeEnrichment | null
}): string[] {
  const brand = brandSeedFromHost(input.domain)
  const loc = (input.locale ?? 'de').toLowerCase().startsWith('de') ? 'de' : 'en'
  const surface = input.surface ?? 'field'
  const industry =
    input.knowledge?.profile?.industry?.trim() ||
    input.knowledge?.competitive?.category?.trim() ||
    ''
  const fromPack = candidatesFromKnowledge(input.knowledge)
  const tokens = nameTokens(input.projectName)
  const category = industry || tokens[0] || brand

  const grounded =
    loc === 'de'
      ? [
          surface === 'research' ? brand : null,
          `${brand} ${category}`.trim(),
          `${category} vergleich`,
          `${category} alternative`,
          `${brand} erfahrung`,
          `${category} kosten`,
          `${brand} test`,
          industry ? `${industry} anbieter` : `${brand} preis`,
          tokens[1] ? `${tokens[1]} ${brand}` : null,
        ]
      : [
          surface === 'research' ? brand : null,
          `${brand} ${category}`.trim(),
          `${category} vs competitors`,
          `${category} alternative`,
          `${brand} review`,
          `${category} pricing`,
          `${brand} best`,
          industry ? `${industry} providers` : `${brand} pricing`,
          tokens[1] ? `${tokens[1]} ${brand}` : null,
        ]

  return sanitizeSuggestKeywords(
    mergeKeywordCandidates(fromPack, grounded.filter(Boolean) as string[]),
    input.domain,
    surface,
    7,
  )
}

function systemPromptFor(surface: SeoSuggestSurface, locale: string): string {
  const lang = locale.startsWith('de') ? 'German' : 'English'
  const ground = [
    'Ground every keyword in the provided industry, audiences, competitors, and domain — never invent unrelated verticals.',
    'Never return URLs, hostnames, www, http, google, yahoo, bing, or other search-engine names.',
    'Never return the brand name alone (except research may include brand once as a seed).',
    'Keywords must be human search queries a buyer would type — not domains.',
  ].join(' ')
  if (surface === 'research') {
    return [
      'You suggest SEO research seeds (single queries to expand into keyword ideas).',
      'Return JSON only: {"keywords":["..."]} with 5 to 8 strings.',
      'Prefer short, searchable seeds (brand+intent, category, problem, audience need). Not slogans.',
      ground,
      `Language of keywords: ${lang}.`,
    ].join(' ')
  }
  if (surface === 'ranks') {
    return [
      'You suggest keywords worth monitoring in a rank tracker.',
      'Return JSON only: {"keywords":["..."]} with 5 to 8 strings.',
      'Prefer stable commercial/informational queries with ranking potential — not one-off news.',
      ground,
      `Language of keywords: ${lang}.`,
    ].join(' ')
  }
  return [
    'You suggest SEO keywords for competitive SERP-overlap analysis (Field).',
    'Return JSON only: {"keywords":["..."]} with 5 to 8 strings.',
    'Keywords must be searchable queries (commercial or informational), not slogans.',
    'Prefer intents that reveal rivals in organic SERPs for this industry and audiences.',
    ground,
    `Language of keywords: ${lang}.`,
  ].join(' ')
}

function knowledgePromptBits(knowledge: GeoKnowledgeEnrichment | null | undefined): string[] {
  if (!knowledge) return []
  const bits: string[] = []
  if (knowledge.profile?.displayName) bits.push(`Brand display name: ${knowledge.profile.displayName}`)
  if (knowledge.profile?.industry) bits.push(`Industry: ${knowledge.profile.industry}`)
  if (knowledge.profile?.tagline) bits.push(`Tagline: ${knowledge.profile.tagline}`)
  if (knowledge.profile?.primaryDomain) bits.push(`Primary domain: ${knowledge.profile.primaryDomain}`)
  if (knowledge.competitive?.category) bits.push(`Category: ${knowledge.competitive.category}`)
  if (knowledge.competitive?.hosts?.length) {
    bits.push(
      `Known rival hosts (context only, do NOT return as keywords): ${knowledge.competitive.hosts.slice(0, 12).join(', ')}`,
    )
  }
  if (knowledge.researchBrief?.summary) {
    bits.push(`Audience / research brief: ${knowledge.researchBrief.summary.slice(0, 500)}`)
  }
  if (knowledge.researchBrief?.topics?.length) {
    bits.push(`Audience topics: ${knowledge.researchBrief.topics.slice(0, 12).join(', ')}`)
  }
  if (knowledge.geoContext?.queryThemes?.length) {
    bits.push(`Query themes: ${knowledge.geoContext.queryThemes.slice(0, 12).join(', ')}`)
  }
  if (knowledge.geoContext?.seedQueries?.length) {
    bits.push(`Prior seed queries: ${knowledge.geoContext.seedQueries.slice(0, 12).join(', ')}`)
  }
  if (knowledge.geoContext?.knownCompetitors?.length) {
    bits.push(
      `GEO rival hosts (context only, do NOT return as keywords): ${knowledge.geoContext.knownCompetitors.slice(0, 12).join(', ')}`,
    )
  }
  return bits
}

/**
 * OpenRouter Qwen → Market keyword suggestions (Field / Research / Ranks).
 * Spec: `specs/domain/seo-project-workspace.md` § Market smart suggestions.
 */
export async function suggestMarketKeywordsViaQwen(input: {
  surface: SeoSuggestSurface
  domain: string
  projectName: string
  projectDescription?: string
  locale?: string
  seedHint?: string
  savedKeywords?: string[]
  candidateKeywords?: string[]
  knowledge?: GeoKnowledgeEnrichment | null
}): Promise<{ keywords: string[]; model: string }> {
  const key = openRouterKey()
  if (!key) {
    throw new FieldSuggestError(
      'OPENROUTER_API_KEY is required for Market smart suggestions',
      'unconfigured',
    )
  }
  const model = suggestModel()
  const brand = brandSeedFromHost(input.domain)
  const locale = input.locale ?? 'de'
  const saved = sanitizeSuggestKeywords(
    input.savedKeywords ?? [],
    input.domain,
    input.surface,
    8,
  )
  const candidates = sanitizeSuggestKeywords(
    mergeKeywordCandidates(input.candidateKeywords, candidatesFromKnowledge(input.knowledge)),
    input.domain,
    input.surface,
    20,
  )
  const system = systemPromptFor(input.surface, locale)
  const hint =
    input.seedHint?.trim() && looksLikeSearchQuery(input.seedHint)
      ? input.seedHint.trim()
      : null
  const seedHintForPrompt =
    hint && !brandBitsFor(input.domain).has(hint.toLowerCase()) ? hint : null
  const user = [
    `Surface: ${input.surface}`,
    `Domain: ${input.domain.replace(/^www\./i, '')}`,
    `Project: ${input.projectName}`,
    input.projectDescription?.trim()
      ? `Project description: ${input.projectDescription.trim().slice(0, 400)}`
      : null,
    `Brand hint: ${brand}`,
    ...knowledgePromptBits(input.knowledge),
    seedHintForPrompt ? `Seed hint: ${seedHintForPrompt}` : null,
    saved.length ? `Saved research keywords: ${saved.join(', ')}` : null,
    candidates.length
      ? `Prioritize / refine these grounded candidates: ${candidates.join(', ')}`
      : null,
    'If industry or audience context is present, keywords must reflect that vertical — do not invent unrelated categories.',
    'Do not return any URL, hostname, or search-engine name as a keyword.',
  ]
    .filter(Boolean)
    .join('\n')

  const url = `${openRouterBase()}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': paths.openRouterAppReferer,
      'X-Title': paths.openRouterAppTitle,
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      max_tokens: 400,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  })
  const raw = (await res.json()) as Record<string, unknown>
  if (!res.ok) {
    const msg =
      typeof raw.error === 'object' && raw.error && 'message' in (raw.error as object)
        ? String((raw.error as { message?: string }).message)
        : `OpenRouter HTTP ${res.status}`
    throw new FieldSuggestError(msg, 'upstream')
  }
  const choice = Array.isArray(raw.choices) ? asRecord(raw.choices[0]) : null
  const message = choice ? asRecord(choice.message) : null
  const content = typeof message?.content === 'string' ? message.content : ''
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new FieldSuggestError('Model returned non-JSON suggestions', 'invalid')
  }
  const keywords = sanitizeSuggestKeywords(
    mergeKeywordCandidates(candidatesFromKnowledge(input.knowledge), parseKeywords(parsed)),
    input.domain,
    input.surface,
  )
  if (keywords.length < 3) {
    throw new FieldSuggestError('Model returned too few usable keywords', 'invalid')
  }
  return { keywords, model }
}

/** @deprecated prefer suggestMarketKeywordsViaQwen({ surface: 'field', … }) */
export async function suggestFieldKeywordsViaQwen(input: {
  domain: string
  projectName: string
  locale?: string
  seedHint?: string
  savedKeywords?: string[]
}): Promise<{ keywords: string[]; model: string }> {
  return suggestMarketKeywordsViaQwen({ ...input, surface: 'field' })
}

/** Merge unique keywords preserving order. */
export function mergeKeywordCandidates(
  ...lists: Array<string[] | undefined | null>
): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const list of lists) {
    for (const raw of list ?? []) {
      const k = raw.trim().replace(/\s+/g, ' ')
      if (!k || !looksLikeSearchQuery(k)) continue
      const key = k.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(k)
      if (out.length >= 24) return out
    }
  }
  return out
}
