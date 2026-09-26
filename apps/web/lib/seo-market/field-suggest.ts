import type { GeoKnowledgeEnrichment } from '../plexon-knowledge-pack'
import { paths } from '../paths'
import {
  brandSeedFromHost,
  displayBrandFromHost,
  isJunkKeywordToken,
  isTrackWorthyKeyword,
  looksLikeSearchQuery,
} from './host-utils'
import type { UrlSuggestContext } from './url-suggest-context'
import { urlContextHasSignal } from './url-suggest-context'

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

/**
 * Drop junk / addresses / weak brand templates.
 * Research may keep the bare brand once as a seed.
 */
export function sanitizeSuggestKeywords(
  keywords: string[],
  domain: string,
  surface: SeoSuggestSurface,
  max = 8,
): string[] {
  const brand = brandSeedFromHost(domain).toLowerCase()
  const brandShort = displayBrandFromHost(domain).toLowerCase()
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
    if (lower === host) continue
    if (lower === brand || lower === brandShort) {
      if (surface !== 'research' || brandKept) continue
      brandKept = true
      seen.add(lower)
      out.push(k)
      if (out.length >= max) break
      continue
    }
    if (!isTrackWorthyKeyword(k, domain)) continue
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
  ).filter((k) => looksLikeSearchQuery(k) && !isJunkKeywordToken(k))
}

/**
 * Offline / stub fallback only — never a product vertical hardcode.
 * Prefer knowledge seeds; otherwise brand×intent from site title crumbs if any.
 */
export function fixtureFieldSuggestions(input: {
  domain: string
  projectName?: string
  locale?: string
  surface?: SeoSuggestSurface
  knowledge?: GeoKnowledgeEnrichment | null
  urlContext?: UrlSuggestContext | null
}): string[] {
  const brand = displayBrandFromHost(input.domain)
  const surface = input.surface ?? 'field'
  const loc = (input.locale ?? 'de').toLowerCase().startsWith('de') ? 'de' : 'en'
  const fromPack = candidatesFromKnowledge(input.knowledge)

  // Pull noun-ish crumbs from title/h1 (not addresses) for a thin stub pool.
  const siteText = [input.urlContext?.title, input.urlContext?.h1, input.urlContext?.description]
    .filter(Boolean)
    .join(' ')
  const crumbs = siteText
    .split(/[\s|/·—–,;:·•\-]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(
      (t) =>
        t.length > 3 &&
        !isJunkKeywordToken(t) &&
        t !== brand &&
        !/^(gmbh|ag|ltd|inc|the|and|und|seo|group|home|start|welcome|willkommen)$/i.test(t),
    )
    .slice(0, 4)

  const industry =
    input.knowledge?.profile?.industry?.trim() ||
    input.knowledge?.competitive?.category?.trim() ||
    crumbs[0] ||
    ''

  const stub =
    loc === 'de'
      ? [
          surface === 'research' ? brandSeedFromHost(input.domain) : null,
          industry || null,
          industry ? `${industry} anbieter` : null,
          industry ? `beste ${industry}` : null,
          industry ? `${brand} ${industry}` : `${brand} produkt`,
          crumbs[1] ? `${crumbs[1]}` : null,
          crumbs[2] ? `${brand} ${crumbs[2]}` : null,
        ]
      : [
          surface === 'research' ? brandSeedFromHost(input.domain) : null,
          industry || null,
          industry ? `best ${industry}` : null,
          industry ? `${industry} providers` : null,
          industry ? `${brand} ${industry}` : `${brand} product`,
          crumbs[1] ? `${crumbs[1]}` : null,
          crumbs[2] ? `${brand} ${crumbs[2]}` : null,
        ]

  return sanitizeSuggestKeywords(
    mergeKeywordCandidates(fromPack, stub.filter(Boolean) as string[]),
    input.domain,
    surface,
    8,
  )
}

function systemPromptFor(surface: SeoSuggestSurface, locale: string): string {
  const lang = locale.startsWith('de') ? 'German' : 'English'
  const ground = [
    'Infer the company\'s real products and vertical from the domain URL, homepage chrome, and any Collection knowledge.',
    'Return real search queries a buyer would type — category terms, brand+product, commercial intent.',
    'Never return URLs, hostnames, www, street addresses, or search-engine names.',
    'Never return imprint/legal chrome: GmbH, AG, Geschäftsführer, Impressum, Datenschutz, logo, Technology Center, headquarters.',
    'Never return bare sister-brand or person names without a product (e.g. "saunier", "johann …").',
    'Never return weak templates like "brand vergleich", "brand preis", "brand alternative", or "brand brand".',
    'Mix: roughly half category terms WITHOUT brand, half brand+product. Not slogans.',
    'Works for any industry (heating, pharma, SaaS, retail, industrial, …) — do not invent an unrelated vertical.',
  ].join(' ')
  if (surface === 'research') {
    return [
      'You suggest SEO research seeds (queries to expand into keyword ideas).',
      'Return JSON only: {"keywords":["..."]} with 5 to 8 strings.',
      ground,
      'Bare brand at most once.',
      `Language of keywords: ${lang}.`,
    ].join(' ')
  }
  if (surface === 'ranks') {
    return [
      'You suggest keywords worth MONITORING in a rank tracker for this brand.',
      'Return JSON only: {"keywords":["..."]} with 5 to 8 strings.',
      'Only suggest queries where ranking movement would matter commercially for THIS company.',
      ground,
      `Language of keywords: ${lang}.`,
    ].join(' ')
  }
  return [
    'You suggest SEO keywords for competitive SERP-overlap analysis (Field).',
    'Return JSON only: {"keywords":["..."]} with 5 to 8 strings.',
    'Prefer intents that reveal rivals in organic SERPs for this company\'s vertical.',
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

function urlPromptBits(urlContext: UrlSuggestContext | null | undefined, domain: string): string[] {
  const host = domain.replace(/^www\./i, '')
  const bits = [`Company website URL: https://${host}/`]
  if (!urlContextHasSignal(urlContext)) {
    bits.push(
      'Homepage fetch unavailable — infer vertical strictly from the domain name, brand, and any knowledge below.',
    )
    return bits
  }
  bits.push(`Fetched homepage URL: ${urlContext!.url}`)
  if (urlContext!.title) bits.push(`Homepage title: ${urlContext!.title}`)
  if (urlContext!.description) bits.push(`Homepage description: ${urlContext!.description}`)
  if (urlContext!.h1) bits.push(`Homepage H1: ${urlContext!.h1}`)
  return bits
}

/**
 * OpenRouter Qwen → Market keyword suggestions (Field / Research / Ranks).
 * Primary path: Collection knowledge + homepage URL context → grounded keywords.
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
  urlContext?: UrlSuggestContext | null
}): Promise<{ keywords: string[]; model: string }> {
  const key = openRouterKey()
  if (!key) {
    throw new FieldSuggestError(
      'OPENROUTER_API_KEY is required for Market smart suggestions',
      'unconfigured',
    )
  }
  const model = suggestModel()
  const brand = displayBrandFromHost(input.domain)
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
    input.seedHint?.trim() && isTrackWorthyKeyword(input.seedHint, input.domain)
      ? input.seedHint.trim()
      : null
  const user = [
    `Surface: ${input.surface}`,
    `Domain: ${input.domain.replace(/^www\./i, '')}`,
    `Project: ${input.projectName}`,
    input.projectDescription?.trim()
      ? `Project description: ${input.projectDescription.trim().slice(0, 400)}`
      : null,
    `Brand: ${brand}`,
    ...urlPromptBits(input.urlContext, input.domain),
    ...knowledgePromptBits(input.knowledge),
    hint ? `Seed hint: ${hint}` : null,
    saved.length ? `Saved research keywords: ${saved.join(', ')}` : null,
    candidates.length
      ? `Grounded candidates to prioritize (already filtered): ${candidates.join(', ')}`
      : null,
    'If knowledge is thin, rely on the website URL / homepage chrome to infer the vertical.',
    'Do not invent addresses or office locations as keywords.',
    'Do not return brand+vergleich / brand+preis style filler.',
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
      max_tokens: 450,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(55_000),
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
    mergeKeywordCandidates(parseKeywords(parsed), candidatesFromKnowledge(input.knowledge)),
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
      if (!k || isJunkKeywordToken(k)) continue
      const key = k.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(k)
      if (out.length >= 24) return out
    }
  }
  return out
}
