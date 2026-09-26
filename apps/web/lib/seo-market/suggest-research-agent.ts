/**
 * Market Suggest Research Agent — corpus → company brief → keywords.
 * Spec: specs/domain/seo-market-suggest-agent.md
 */

import type { GeoKnowledgeEnrichment } from '../plexon-knowledge-pack'
import { enrichmentHasSignal } from '../plexon-knowledge-pack'
import { paths } from '../paths'
import {
  candidatesFromKnowledge,
  FieldSuggestError,
  mergeKeywordCandidates,
  sanitizeSuggestKeywords,
  type SeoSuggestSurface,
} from './field-suggest'
import { displayBrandFromHost } from './host-utils'
import {
  gatherSiteCorpus,
  type SitePageCorpus,
} from './url-suggest-context'

export type SuggestCompanyBrief = {
  summary: string
  category: string | null
  products: string[]
  services: string[]
  audiences: string[]
}

export type SuggestAgentResult = {
  keywords: string[]
  model: string
  brief: SuggestCompanyBrief
  agent: {
    steps: string[]
    pagesFetched: string[]
    usedKnowledge: boolean
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

function asStringArray(v: unknown, max = 12): string[] {
  if (!Array.isArray(v)) return []
  return v
    .map((x) => String(x ?? '').trim())
    .filter(Boolean)
    .slice(0, max)
}

async function openRouterJson(input: {
  system: string
  user: string
  temperature?: number
  maxTokens?: number
}): Promise<{ parsed: unknown; model: string }> {
  const key = openRouterKey()
  if (!key) {
    throw new FieldSuggestError(
      'OPENROUTER_API_KEY is required for Market Suggest Research Agent',
      'unconfigured',
    )
  }
  const model = suggestModel()
  const res = await fetch(`${openRouterBase()}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': paths.openRouterAppReferer,
      'X-Title': paths.openRouterAppTitle,
    },
    body: JSON.stringify({
      model,
      temperature: input.temperature ?? 0.3,
      max_tokens: input.maxTokens ?? 700,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: input.system },
        { role: 'user', content: input.user },
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
  try {
    return { parsed: JSON.parse(content), model }
  } catch {
    throw new FieldSuggestError('Model returned non-JSON', 'invalid')
  }
}

function knowledgeBlock(knowledge: GeoKnowledgeEnrichment | null | undefined): string {
  if (!enrichmentHasSignal(knowledge)) return 'Collection knowledge: (none or empty)'
  const bits: string[] = ['Collection knowledge:']
  if (knowledge?.profile?.displayName) bits.push(`- displayName: ${knowledge.profile.displayName}`)
  if (knowledge?.profile?.industry) bits.push(`- industry: ${knowledge.profile.industry}`)
  if (knowledge?.profile?.tagline) bits.push(`- tagline: ${knowledge.profile.tagline}`)
  if (knowledge?.competitive?.category) bits.push(`- category: ${knowledge.competitive.category}`)
  if (knowledge?.researchBrief?.summary) {
    bits.push(`- research summary: ${knowledge.researchBrief.summary.slice(0, 600)}`)
  }
  if (knowledge?.researchBrief?.topics?.length) {
    bits.push(`- topics: ${knowledge.researchBrief.topics.slice(0, 12).join(', ')}`)
  }
  if (knowledge?.geoContext?.queryThemes?.length) {
    bits.push(`- GEO themes: ${knowledge.geoContext.queryThemes.slice(0, 12).join(', ')}`)
  }
  if (knowledge?.geoContext?.seedQueries?.length) {
    bits.push(`- GEO seeds: ${knowledge.geoContext.seedQueries.slice(0, 12).join(', ')}`)
  }
  return bits.join('\n')
}

function pagesBlock(pages: SitePageCorpus[]): string {
  if (!pages.length) return 'Site pages: (fetch failed — use domain name + knowledge only)'
  return pages
    .map((p, i) => {
      const lines = [
        `### Page ${i + 1} (${p.kind}): ${p.url}`,
        p.title ? `Title: ${p.title}` : null,
        p.description ? `Description: ${p.description}` : null,
        p.h1 ? `H1: ${p.h1}` : null,
        p.bodyExcerpt ? `Body excerpt: ${p.bodyExcerpt.slice(0, 2800)}` : null,
      ]
      return lines.filter(Boolean).join('\n')
    })
    .join('\n\n')
}

function parseBrief(raw: unknown, fallbackSummary: string): SuggestCompanyBrief {
  const o = asRecord(raw) ?? {}
  const summary =
    typeof o.summary === 'string' && o.summary.trim()
      ? o.summary.trim().slice(0, 800)
      : fallbackSummary
  return {
    summary,
    category: typeof o.category === 'string' && o.category.trim() ? o.category.trim().slice(0, 120) : null,
    products: asStringArray(o.products, 12),
    services: asStringArray(o.services, 12),
    audiences: asStringArray(o.audiences, 8),
  }
}

function parseKeywordList(raw: unknown): string[] {
  const o = asRecord(raw)
  const list = o && Array.isArray(o.keywords) ? o.keywords : Array.isArray(raw) ? raw : []
  return list.map((x) => String(x ?? '').trim()).filter(Boolean)
}

function surfaceKeywordSystem(surface: SeoSuggestSurface, locale: string): string {
  const lang = locale.startsWith('de') ? 'German' : 'English'
  const common = [
    'Use ONLY the company brief and page evidence. Do not invent unrelated verticals.',
    'Never return URLs, hostnames, www, street addresses, executive names, or search-engine names.',
    'Never return weak templates like "brand vergleich" / "brand preis" / "brand GmbH".',
    'Mix category terms WITHOUT brand and brand+product queries.',
    `Language: ${lang}.`,
    'Return JSON only: {"keywords":["..."]} with 5 to 8 strings.',
  ].join(' ')
  if (surface === 'research') {
    return `You suggest SEO research seeds from a distilled company brief. ${common} Bare brand at most once.`
  }
  if (surface === 'ranks') {
    return `You suggest rank-tracker keywords worth monitoring commercially for this company. ${common}`
  }
  return `You suggest competitive SERP-overlap keywords for Field analysis. ${common}`
}

/**
 * Run the Market Suggest Research Agent.
 */
export async function runMarketSuggestResearchAgent(input: {
  surface: SeoSuggestSurface
  domain: string
  projectName: string
  projectDescription?: string
  locale?: string
  seedHint?: string
  savedKeywords?: string[]
  knowledge?: GeoKnowledgeEnrichment | null
}): Promise<SuggestAgentResult> {
  const steps: string[] = []
  const locale = input.locale ?? 'de'
  const brand = displayBrandFromHost(input.domain)
  const usedKnowledge = enrichmentHasSignal(input.knowledge)

  steps.push('gather_knowledge')
  steps.push('gather_site_corpus')
  const { pages } = await gatherSiteCorpus(input.domain)
  const pagesFetched = pages.map((p) => p.url)

  const corpusUser = [
    `Domain: ${input.domain.replace(/^www\./i, '')}`,
    `Project: ${input.projectName}`,
    `Brand hint: ${brand}`,
    input.projectDescription?.trim()
      ? `Project description: ${input.projectDescription.trim().slice(0, 400)}`
      : null,
    knowledgeBlock(input.knowledge),
    pagesBlock(pages),
    'Task: Research what this company is and does. Extract products, services, category, and audiences from the evidence.',
  ]
    .filter(Boolean)
    .join('\n\n')

  steps.push('distill_brief')
  const distill = await openRouterJson({
    system: [
      'You are a company research analyst for SEO Market suggestions.',
      'Read the site excerpts and Collection knowledge. Infer what the company actually offers.',
      'Do NOT treat legal footer crumbs (GmbH, address, Geschäftsführer) as the product.',
      'Prefer concrete products/services a buyer would search for.',
      'Return JSON only:',
      '{"summary":"2-4 sentences","category":"string|null","products":["..."],"services":["..."],"audiences":["..."]}',
    ].join(' '),
    user: corpusUser,
    temperature: 0.25,
    maxTokens: 700,
  })

  const fallbackSummary =
    pages.find((p) => p.description)?.description ||
    pages.find((p) => p.title)?.title ||
    `${input.projectName} (${input.domain})`
  const brief = parseBrief(distill.parsed, fallbackSummary)
  if (!brief.products.length && !brief.services.length && !brief.category) {
    // Still usable if summary is rich
    if (brief.summary.length < 40) {
      throw new FieldSuggestError('Research brief too thin', 'invalid')
    }
  }

  steps.push('generate_keywords')
  const hint =
    input.seedHint?.trim() && input.seedHint.trim().length > 2 ? input.seedHint.trim() : null
  const keywordUser = [
    `Surface: ${input.surface}`,
    `Brand: ${brand}`,
    `Domain: ${input.domain.replace(/^www\./i, '')}`,
    `Brief summary: ${brief.summary}`,
    brief.category ? `Category: ${brief.category}` : null,
    brief.products.length ? `Products: ${brief.products.join(', ')}` : null,
    brief.services.length ? `Services: ${brief.services.join(', ')}` : null,
    brief.audiences.length ? `Audiences: ${brief.audiences.join(', ')}` : null,
    knowledgeBlock(input.knowledge),
    candidatesFromKnowledge(input.knowledge).length
      ? `Prior seed candidates: ${candidatesFromKnowledge(input.knowledge).slice(0, 12).join(', ')}`
      : null,
    (input.savedKeywords ?? []).length
      ? `Saved research: ${(input.savedKeywords ?? []).slice(0, 8).join(', ')}`
      : null,
    hint ? `Seed hint: ${hint}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const gen = await openRouterJson({
    system: surfaceKeywordSystem(input.surface, locale),
    user: keywordUser,
    temperature: 0.35,
    maxTokens: 450,
  })

  const keywords = sanitizeSuggestKeywords(
    mergeKeywordCandidates(
      parseKeywordList(gen.parsed),
      candidatesFromKnowledge(input.knowledge),
      brief.products,
      brief.services,
      brief.category ? [brief.category] : [],
    ),
    input.domain,
    input.surface,
    8,
  )

  if (keywords.length < 3) {
    throw new FieldSuggestError('Agent returned too few usable keywords', 'invalid')
  }

  steps.push('sanitize')
  return {
    keywords,
    model: gen.model,
    brief,
    agent: {
      steps,
      pagesFetched,
      usedKnowledge,
    },
  }
}
