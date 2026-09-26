import type { GeoKnowledgeEnrichment } from '../plexon-knowledge-pack'
import { paths } from '../paths'
import {
  brandSeedFromHost,
  displayBrandFromHost,
  isJunkKeywordToken,
  isTrackWorthyKeyword,
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
  )
}

type VerticalSeeds = {
  label: string
  category: string[]
  brandProduct: (brand: string) => string[]
}

function heatingVertical(locale: 'de' | 'en'): VerticalSeeds {
  if (locale === 'de') {
    return {
      label: 'Heizung / Wärmepumpe',
      category: [
        'wärmepumpe',
        'gastherme',
        'heizung modernisieren',
        'durchlauferhitzer',
        'förderung wärmepumpe',
        'hybrid heizung',
        'heizungsaustausch',
      ],
      brandProduct: (brand) => [
        `${brand} wärmepumpe`,
        `${brand} therme`,
        `${brand} heizung`,
      ],
    }
  }
  return {
    label: 'Heating / heat pump',
    category: [
      'heat pump',
      'boiler replacement',
      'home heating upgrade',
      'tankless water heater',
      'heat pump grants',
      'hybrid heating',
    ],
    brandProduct: (brand) => [
      `${brand} heat pump`,
      `${brand} boiler`,
      `${brand} heating`,
    ],
  }
}

function genericVertical(locale: 'de' | 'en', categoryNoun: string): VerticalSeeds {
  const noun = categoryNoun.trim() || (locale === 'de' ? 'lösung' : 'software')
  if (locale === 'de') {
    return {
      label: noun,
      category: [
        `${noun}`,
        `${noun} anbieter`,
        `${noun} kosten`,
        `beste ${noun}`,
        `${noun} für unternehmen`,
      ],
      brandProduct: (brand) => [`${brand} ${noun}`, `${brand} ${noun} test`],
    }
  }
  return {
    label: noun,
    category: [
      noun,
      `best ${noun}`,
      `${noun} pricing`,
      `${noun} for business`,
      `${noun} providers`,
    ],
    brandProduct: (brand) => [`${brand} ${noun}`, `${brand} ${noun} review`],
  }
}

/**
 * Infer a vertical seed pool from knowledge / domain / project name.
 * Known heating brands (e.g. Vaillant) map to real category queries — not "brand vergleich".
 */
export function inferVerticalSeeds(input: {
  domain: string
  projectName?: string
  locale?: string
  knowledge?: GeoKnowledgeEnrichment | null
}): VerticalSeeds {
  const locale = (input.locale ?? 'de').toLowerCase().startsWith('de') ? 'de' : 'en'
  const hay = [
    input.domain,
    input.projectName ?? '',
    input.knowledge?.profile?.industry ?? '',
    input.knowledge?.profile?.tagline ?? '',
    input.knowledge?.competitive?.category ?? '',
    ...(input.knowledge?.researchBrief?.topics ?? []),
    ...(input.knowledge?.geoContext?.queryThemes ?? []),
  ]
    .join(' ')
    .toLowerCase()

  if (
    /vaillant|wärmepumpe|waermepumpe|heat\s*pump|heizung|therme|boiler|heating|hvac|sanitär|sanitaer/.test(
      hay,
    )
  ) {
    return heatingVertical(locale)
  }

  const industry =
    input.knowledge?.profile?.industry?.trim() ||
    input.knowledge?.competitive?.category?.trim() ||
    ''
  if (industry) return genericVertical(locale, industry)

  // Last resort: project name token that isn't the brand
  const brandShort = displayBrandFromHost(input.domain).toLowerCase()
  const token =
    (input.projectName ?? '')
      .split(/[\s|/·—–-]+/)
      .map((t) => t.trim())
      .find(
        (t) =>
          t.length > 3 &&
          !isJunkKeywordToken(t) &&
          t.toLowerCase() !== brandShort &&
          !/^(gmbh|ag|ltd|inc|the|and|und|seo|group|project|projekt)$/i.test(t),
      ) ?? (locale === 'de' ? 'produkt' : 'product')

  return genericVertical(locale, token)
}

/**
 * Deterministic track-worthy suggestions (live off / Qwen fallback).
 * Category + brand×product — never "Marke vergleich" / addresses.
 */
export function fixtureFieldSuggestions(input: {
  domain: string
  projectName?: string
  locale?: string
  surface?: SeoSuggestSurface
  knowledge?: GeoKnowledgeEnrichment | null
}): string[] {
  const brand = displayBrandFromHost(input.domain)
  const surface = input.surface ?? 'field'
  const vertical = inferVerticalSeeds(input)
  const fromPack = candidatesFromKnowledge(input.knowledge)
  const seeds = [
    surface === 'research' ? brandSeedFromHost(input.domain) : null,
    ...vertical.category,
    ...vertical.brandProduct(brand),
  ].filter(Boolean) as string[]

  return sanitizeSuggestKeywords(
    mergeKeywordCandidates(fromPack, seeds),
    input.domain,
    surface,
    8,
  )
}

function systemPromptFor(surface: SeoSuggestSurface, locale: string): string {
  const lang = locale.startsWith('de') ? 'German' : 'English'
  const ground = [
    'Return real search queries a buyer would type — product/category terms, brand+product, commercial intent.',
    'Never return URLs, hostnames, www, addresses, street names, or search-engine names.',
    'Never return weak templates like "brand vergleich", "brand preis", "brand alternative", or "brand brand".',
    'Prefer mix: ~half category terms WITHOUT brand, ~half brand+product. Not slogans.',
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
      'Only suggest queries where ranking movement would matter commercially.',
      ground,
      `Language of keywords: ${lang}.`,
    ].join(' ')
  }
  return [
    'You suggest SEO keywords for competitive SERP-overlap analysis (Field).',
    'Return JSON only: {"keywords":["..."]} with 5 to 8 strings.',
    'Prefer intents that reveal rivals in organic SERPs for this industry.',
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
  const brand = displayBrandFromHost(input.domain)
  const locale = input.locale ?? 'de'
  const vertical = inferVerticalSeeds({
    domain: input.domain,
    projectName: input.projectName,
    locale,
    knowledge: input.knowledge,
  })
  const saved = sanitizeSuggestKeywords(
    input.savedKeywords ?? [],
    input.domain,
    input.surface,
    8,
  )
  const candidates = sanitizeSuggestKeywords(
    mergeKeywordCandidates(
      input.candidateKeywords,
      candidatesFromKnowledge(input.knowledge),
      vertical.category,
      vertical.brandProduct(brand),
    ),
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
    `Inferred vertical: ${vertical.label}`,
    ...knowledgePromptBits(input.knowledge),
    hint ? `Seed hint: ${hint}` : null,
    saved.length ? `Saved research keywords: ${saved.join(', ')}` : null,
    candidates.length
      ? `Grounded candidates to prioritize (already filtered): ${candidates.join(', ')}`
      : null,
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
      temperature: 0.3,
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
    mergeKeywordCandidates(
      parseKeywords(parsed),
      candidatesFromKnowledge(input.knowledge),
      vertical.category,
      vertical.brandProduct(brand),
    ),
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
