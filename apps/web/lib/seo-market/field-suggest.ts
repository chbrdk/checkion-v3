import { paths } from '../paths'
import { brandSeedFromHost } from './host-utils'

export const DEFAULT_FIELD_SUGGEST_MODEL = 'qwen/qwen3.7-flash'

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
  // Accept both https://openrouter.ai and …/api/v1
  return base.endsWith('/api/v1') ? base : `${base}/api/v1`
}

function suggestModel(): string {
  const raw = (process.env[paths.envSeoFieldSuggestModel] ?? '').trim()
  return raw || paths.seoFieldSuggestModelDefault
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function parseKeywords(raw: unknown): string[] {
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
    if (out.length >= 8) break
  }
  return out
}

/** Deterministic fixture suggestions when live SEO Market is off. */
export function fixtureFieldSuggestions(input: {
  domain: string
  projectName?: string
  locale?: string
}): string[] {
  const brand = brandSeedFromHost(input.domain)
  const loc = (input.locale ?? 'de').toLowerCase().startsWith('de') ? 'de' : 'en'
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

/**
 * OpenRouter Qwen → Field keyword set suggestions.
 * Spec: `specs/domain/seo-project-workspace.md` § Field smart suggestions.
 */
export async function suggestFieldKeywordsViaQwen(input: {
  domain: string
  projectName: string
  locale?: string
  seedHint?: string
  savedKeywords?: string[]
}): Promise<{ keywords: string[]; model: string }> {
  const key = openRouterKey()
  if (!key) {
    throw new FieldSuggestError(
      'OPENROUTER_API_KEY is required for Field smart suggestions',
      'unconfigured',
    )
  }
  const model = suggestModel()
  const brand = brandSeedFromHost(input.domain)
  const locale = input.locale ?? 'de'
  const saved = (input.savedKeywords ?? []).filter(Boolean).slice(0, 8)
  const system = [
    'You suggest SEO keywords for competitive SERP-overlap analysis (Field).',
    'Return JSON only: {"keywords":["..."]} with 5 to 8 strings.',
    'Keywords must be searchable queries (commercial or informational), not slogans.',
    'Do not return the brand name alone. Prefer intents that reveal rivals in organic SERPs.',
    `Language of keywords: ${locale.startsWith('de') ? 'German' : 'English'}.`,
  ].join(' ')
  const user = [
    `Domain: ${input.domain}`,
    `Project: ${input.projectName}`,
    `Brand hint: ${brand}`,
    input.seedHint?.trim() ? `Seed hint: ${input.seedHint.trim()}` : null,
    saved.length ? `Saved research keywords: ${saved.join(', ')}` : null,
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
  const brandBits = new Set(
    [brand, input.domain.replace(/^www\./, '').split('.')[0] ?? '']
      .flatMap((s) => [s, ...s.split(/[-_]/g)])
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 1),
  )
  const keywords = parseKeywords(parsed).filter((k) => {
    const lower = k.toLowerCase()
    if (brandBits.has(lower)) return false
    if (lower === input.domain.toLowerCase()) return false
    return true
  })
  if (keywords.length < 3) {
    throw new FieldSuggestError('Model returned too few usable keywords', 'invalid')
  }
  return { keywords, model }
}
