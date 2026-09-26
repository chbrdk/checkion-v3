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
  evidenceKeywordPool,
  formatEvidenceForPrompt,
  type SuggestEvidence,
} from './suggest-evidence'
import { gatherSiteCorpus, type SitePageCorpus } from './url-suggest-context'

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
    usedField?: boolean
    usedGsc?: boolean
    usedQuality?: boolean
    publishedToPack?: boolean
    publishError?: string
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
  })
  if (!res.ok) {
    throw new FieldSuggestError(`OpenRouter HTTP ${res.status}`, 'upstream')
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = json.choices?.[0]?.message?.content ?? '{}'
  let parsed: unknown = {}
  try {
    parsed = JSON.parse(content)
  } catch {
    const m = content.match(/\{[\s\S]*\}/)
    if (m) {
      try {
        parsed = JSON.parse(m[0])
      } catch {
        parsed = {}
      }
    }
  }
  return { parsed, model }
}

function knowledgeBlock(knowledge: GeoKnowledgeEnrichment | null | undefined): string | null {
  if (!enrichmentHasSignal(knowledge)) return null
  const bits: string[] = []
  if (knowledge?.profile?.industry) bits.push(`Industry: ${knowledge.profile.industry}`)
  if (knowledge?.profile?.tagline) bits.push(`Tagline: ${knowledge.profile.tagline}`)
  if (knowledge?.researchBrief?.summary) {
    bits.push(`Research brief: ${knowledge.researchBrief.summary.slice(0, 600)}`)
  }
  const topics = candidatesFromKnowledge(knowledge)
  if (topics.length) bits.push(`Pack topics: ${topics.slice(0, 12).join(', ')}`)
  return bits.length ? bits.join('\n') : null
}

function pagesBlock(pages: SitePageCorpus[]): string {
  return pages
    .map((p, i) => {
      const bits = [
        `[${p.kind} ${i + 1}] ${p.url}`,
        p.title ? `Title: ${p.title}` : null,
        p.description ? `Meta: ${p.description}` : null,
        p.h1 ? `H1: ${p.h1}` : null,
        p.bodyExcerpt ? `Excerpt: ${p.bodyExcerpt.slice(0, 1200)}` : null,
      ].filter(Boolean)
      return bits.join('\n')
    })
    .join('\n\n')
}

function parseBrief(parsed: unknown, fallbackSummary: string): SuggestCompanyBrief {
  const o = asRecord(parsed) ?? {}
  return {
    summary: String(o.summary ?? fallbackSummary).trim().slice(0, 800) || fallbackSummary,
    category: o.category == null || o.category === '' ? null : String(o.category).trim().slice(0, 120),
    products: asStringArray(o.products, 12),
    services: asStringArray(o.services, 12),
    audiences: asStringArray(o.audiences, 12),
  }
}

function parseKeywordList(parsed: unknown): string[] {
  const o = asRecord(parsed)
  if (!o) return []
  return asStringArray(o.keywords ?? o.seeds ?? o.queries, 16)
}

function surfaceKeywordSystem(surface: SeoSuggestSurface, locale: string): string {
  const common = [
    `Locale: ${locale}.`,
    'Return JSON: {"keywords":["..."]} with 5–8 track-worthy search queries.',
    'No www/hosts/addresses/legal entity names (GmbH, AG), roles (Geschäftsführer), logos, Technology Center, or imprint crumbs.',
    'No bare sister brands or person names without a product/service term.',
    'Prefer buyer-intent product/service queries (category and brand+product).',
    'Use ONLY the company brief and evidence. Do not invent unrelated verticals.',
  ].join(' ')
  if (surface === 'research') {
    return `You suggest SEO research seeds from a distilled company brief + evidence (GSC, quality gaps, products). ${common} Bare brand at most once.`
  }
  if (surface === 'ranks') {
    return `You suggest rank-tracker keywords worth monitoring. Prefer GSC queries and domain tops that are not already tracked. ${common}`
  }
  return `You suggest competitive SERP-overlap keywords for Field. Prefer queries where rivals already appear in Field evidence. ${common}`
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
  evidence?: SuggestEvidence | null
}): Promise<SuggestAgentResult> {
  const steps: string[] = []
  const locale = input.locale ?? 'de'
  const brand = displayBrandFromHost(input.domain)
  const usedKnowledge = enrichmentHasSignal(input.knowledge)
  const evidence = input.evidence ?? null

  steps.push('gather_knowledge')
  steps.push('gather_evidence')
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
    evidence ? formatEvidenceForPrompt(evidence, input.surface) : null,
    pagesBlock(pages),
    'Task: Research what this company is and does. Extract products, services, category, and audiences from the evidence.',
  ]
    .filter(Boolean)
    .join('\n\n')

  steps.push('distill_brief')
  const distill = await openRouterJson({
    system: [
      'You are a company research analyst for SEO Market suggestions.',
      'Read the site excerpts, Collection knowledge, and market evidence. Infer what the company actually offers.',
      'Do NOT treat legal footer crumbs (GmbH, address, Geschäftsführer, logo, Technology Center) as the product.',
      'Do NOT treat sister brands or person names without a product as offerings.',
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
    if (brief.summary.length < 40) {
      throw new FieldSuggestError('Research brief too thin', 'invalid')
    }
  }

  steps.push('generate_keywords')
  const hint =
    input.seedHint?.trim() && input.seedHint.trim().length > 2 ? input.seedHint.trim() : null
  const cleanPackSeeds = sanitizeSuggestKeywords(
    candidatesFromKnowledge(input.knowledge),
    input.domain,
    input.surface,
    12,
  )
  const cleanEvidenceSeeds = evidence
    ? sanitizeSuggestKeywords(evidenceKeywordPool(evidence, input.domain), input.domain, input.surface, 12)
    : []
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
    evidence ? formatEvidenceForPrompt(evidence, input.surface) : null,
    cleanPackSeeds.length ? `Prior seed candidates: ${cleanPackSeeds.slice(0, 12).join(', ')}` : null,
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
      brief.products,
      brief.services,
      brief.category ? [brief.category] : [],
      cleanEvidenceSeeds,
      cleanPackSeeds,
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
      usedField: evidence?.usedField ?? false,
      usedGsc: evidence?.usedGsc ?? false,
      usedQuality: evidence?.usedQuality ?? false,
    },
  }
}
