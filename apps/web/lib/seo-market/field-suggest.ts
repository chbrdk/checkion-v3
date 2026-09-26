import { paths } from '../paths'
import { brandSeedFromHost } from './host-utils'

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
    if (seen.has(key)) continue
    seen.add(key)
    out.push(k)
    if (out.length >= max) break
  }
  return out
}

function brandBitsFor(domain: string): Set<string> {
  const brand = brandSeedFromHost(domain)
  return new Set(
    [brand, domain.replace(/^www\./, '').split('.')[0] ?? '']
      .flatMap((s) => [s, ...s.split(/[-_]/g)])
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 1),
  )
}

function filterBrandOnly(keywords: string[], domain: string): string[] {
  const bits = brandBitsFor(domain)
  const host = domain.toLowerCase()
  return keywords.filter((k) => {
    const lower = k.toLowerCase()
    if (bits.has(lower)) return false
    if (lower === host) return false
    return true
  })
}

/** Deterministic fixture suggestions when live SEO Market is off. */
export function fixtureFieldSuggestions(input: {
  domain: string
  projectName?: string
  locale?: string
  surface?: SeoSuggestSurface
}): string[] {
  const brand = brandSeedFromHost(input.domain)
  const loc = (input.locale ?? 'de').toLowerCase().startsWith('de') ? 'de' : 'en'
  const surface = input.surface ?? 'field'
  if (surface === 'research') {
    if (loc === 'de') {
      return [
        brand,
        `${brand} kaufen`,
        `${brand} erfahrung`,
        'wärmepumpe',
        'heizung modernisieren',
        'smart home heizung',
        'förderung heizung',
      ].slice(0, 7)
    }
    return [
      brand,
      `${brand} buy`,
      `${brand} review`,
      'heat pump',
      'home heating',
      'smart thermostat',
      'boiler replacement',
    ].slice(0, 7)
  }
  if (loc === 'de') {
    return [
      `${brand} vergleich`,
      `${brand} alternative`,
      `${brand} preis`,
      `${brand} erfahrung`,
      `${brand} test`,
      'wärmepumpe fördern',
      'heizung modernisieren',
    ].slice(0, 7)
  }
  return [
    `${brand} vs competitors`,
    `${brand} alternative`,
    `${brand} pricing`,
    `${brand} review`,
    `${brand} best`,
    'heat pump grants',
    'home heating upgrade',
  ].slice(0, 7)
}

function systemPromptFor(surface: SeoSuggestSurface, locale: string): string {
  const lang = locale.startsWith('de') ? 'German' : 'English'
  if (surface === 'research') {
    return [
      'You suggest SEO research seeds (single queries to expand into keyword ideas).',
      'Return JSON only: {"keywords":["..."]} with 5 to 8 strings.',
      'Prefer short, searchable seeds (brand+intent, category, problem). Not slogans.',
      'Do not return the bare brand more than once.',
      `Language of keywords: ${lang}.`,
    ].join(' ')
  }
  if (surface === 'ranks') {
    return [
      'You suggest keywords worth monitoring in a rank tracker.',
      'Return JSON only: {"keywords":["..."]} with 5 to 8 strings.',
      'Prefer stable commercial/informational queries with ranking potential — not one-off news.',
      'Do not return the brand name alone.',
      `Language of keywords: ${lang}.`,
    ].join(' ')
  }
  return [
    'You suggest SEO keywords for competitive SERP-overlap analysis (Field).',
    'Return JSON only: {"keywords":["..."]} with 5 to 8 strings.',
    'Keywords must be searchable queries (commercial or informational), not slogans.',
    'Do not return the brand name alone. Prefer intents that reveal rivals in organic SERPs.',
    `Language of keywords: ${lang}.`,
  ].join(' ')
}

/**
 * OpenRouter Qwen → Market keyword suggestions (Field / Research / Ranks).
 * Spec: `specs/domain/seo-project-workspace.md` § Market smart suggestions.
 */
export async function suggestMarketKeywordsViaQwen(input: {
  surface: SeoSuggestSurface
  domain: string
  projectName: string
  locale?: string
  seedHint?: string
  savedKeywords?: string[]
  candidateKeywords?: string[]
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
  const saved = (input.savedKeywords ?? []).filter(Boolean).slice(0, 8)
  const candidates = (input.candidateKeywords ?? []).filter(Boolean).slice(0, 20)
  const system = systemPromptFor(input.surface, locale)
  const user = [
    `Surface: ${input.surface}`,
    `Domain: ${input.domain}`,
    `Project: ${input.projectName}`,
    `Brand hint: ${brand}`,
    input.seedHint?.trim() ? `Seed hint: ${input.seedHint.trim()}` : null,
    saved.length ? `Saved research keywords: ${saved.join(', ')}` : null,
    candidates.length ? `Candidate keywords to prioritize: ${candidates.join(', ')}` : null,
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
      temperature: 0.4,
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
  const keywords = filterBrandOnly(parseKeywords(parsed), input.domain)
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
  ...lists: Array<string[] | undefined>
): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const list of lists) {
    for (const raw of list ?? []) {
      const k = raw.trim().replace(/\s+/g, ' ')
      if (!k) continue
      const key = k.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(k)
      if (out.length >= 12) return out
    }
  }
  return out
}
