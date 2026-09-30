/**
 * Live page topics via OpenRouter Qwen Flash.
 * Spec: `specs/domain/page-classification-llm.md`
 */
import { paths } from '@/lib/paths'
import { parseOpenRouterUsage, reportLlmUsage } from '@/lib/usage-report'
import type { PageClassification, ScanResult, TagTier } from '../types'

const MIN_TAGS = 3
const MAX_TAGS = 8
const EXCERPT_CHARS = 4500

export type ClassifyPageOutcome = {
  classification: PageClassification | null
  usage?: { input_tokens: number; output_tokens: number; model?: string }
}

function openRouterKey(): string {
  return (process.env[paths.envOpenRouterApiKey] ?? '').trim()
}

function openRouterBase(): string {
  const raw = (process.env[paths.envOpenRouterApiBaseUrl] ?? '').trim()
  const base = (raw || paths.openRouterApiBaseDefault).replace(/\/$/, '')
  return base.endsWith('/api/v1') ? base : `${base}/api/v1`
}

function classifyModel(): string {
  const raw = (process.env[paths.envPageClassifyModel] ?? '').trim()
  if (raw) return raw
  const field = (process.env[paths.envSeoFieldSuggestModel] ?? '').trim()
  return field || paths.pageClassifyModelDefault
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function clampTier(n: unknown): TagTier['tier'] | null {
  const v = typeof n === 'number' ? n : typeof n === 'string' ? Number.parseInt(n, 10) : NaN
  if (!Number.isFinite(v)) return null
  const t = Math.round(v)
  if (t < 1 || t > 5) return null
  return t as TagTier['tier']
}

function normalizeTag(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const tag = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 64)
  if (tag.length < 2) return null
  return tag
}

function summaryLocale(result: ScanResult): 'de' | 'en' {
  const lang = (result.geo?.languages?.htmlLang || '').toLowerCase().trim()
  if (lang.startsWith('de')) return 'de'
  if (lang.startsWith('en')) return 'en'
  return 'de'
}

/** Parse + sanitize model JSON into PageClassification. Exported for tests. */
export function parsePageClassificationPayload(raw: unknown): PageClassification | null {
  const o = asRecord(raw)
  if (!o) return null

  const shortSummary =
    typeof o.shortSummary === 'string'
      ? o.shortSummary.trim().replace(/\s+/g, ' ').slice(0, 400)
      : typeof o.summary === 'string'
        ? o.summary.trim().replace(/\s+/g, ' ').slice(0, 400)
        : ''

  const tagTiers: TagTier[] = []
  const seen = new Set<string>()

  const push = (tagRaw: unknown, tierRaw: unknown) => {
    const tag = normalizeTag(tagRaw)
    const tier = clampTier(tierRaw) ?? 3
    if (!tag || seen.has(tag)) return
    seen.add(tag)
    tagTiers.push({ tag, tier })
  }

  if (Array.isArray(o.tagTiers)) {
    for (const row of o.tagTiers) {
      const r = asRecord(row)
      if (!r) continue
      push(r.tag ?? r.name, r.tier ?? r.intensity)
      if (tagTiers.length >= MAX_TAGS) break
    }
  }

  if (tagTiers.length < MIN_TAGS && Array.isArray(o.tags)) {
    for (const item of o.tags) {
      if (typeof item === 'string') {
        push(item, 3)
      } else {
        const r = asRecord(item)
        if (r) push(r.tag ?? r.name, r.tier ?? r.intensity ?? 3)
      }
      if (tagTiers.length >= MAX_TAGS) break
    }
  }

  if (tagTiers.length < MIN_TAGS || !shortSummary) return null
  return { tagTiers: tagTiers.slice(0, MAX_TAGS), shortSummary }
}

function buildPrompt(result: ScanResult): { system: string; user: string } {
  const locale = summaryLocale(result)
  const title = result.seo?.title?.trim() || ''
  const h1 = result.seo?.h1?.trim() || ''
  const meta = result.seo?.metaDescription?.trim() || ''
  const excerpt = (result.bodyTextExcerpt || '').trim().slice(0, EXCERPT_CHARS)

  const system = [
    'You classify a web page into topic tags for an audit product.',
    'Return JSON only with keys: shortSummary (string), tagTiers (array of {tag, tier}).',
    `shortSummary: 1–2 sentences in ${locale === 'de' ? 'German' : 'English'} describing what the page is about.`,
    `tagTiers: ${MIN_TAGS}–${MAX_TAGS} lowercase topic tokens (English preferred for tags), each with tier 1–5 (5 = core page theme).`,
    'No markdown. No boilerplate tags like "website", "homepage", "page", "content".',
  ].join(' ')

  const user = [
    `URL: ${result.url}`,
    title ? `Title: ${title}` : null,
    h1 ? `H1: ${h1}` : null,
    meta ? `Meta description: ${meta}` : null,
    excerpt ? `Body excerpt:\n${excerpt}` : 'Body excerpt: (empty)',
  ]
    .filter(Boolean)
    .join('\n')

  return { system, user }
}

/**
 * Classify page topics. Fail-open: returns null when disabled, unconfigured, or on error.
 * @param opts.classifyPageTopics — default true (single scans); deep scans pass false unless flagged.
 */
export async function classifyPageWithLlm(
  result: ScanResult,
  opts?: { classifyPageTopics?: boolean; userId?: string },
): Promise<ClassifyPageOutcome | null> {
  if (opts?.classifyPageTopics === false) return null

  const key = openRouterKey()
  if (!key) return null

  const { system, user } = buildPrompt(result)
  if (!result.bodyTextExcerpt?.trim() && !result.seo?.title?.trim() && !result.seo?.h1?.trim()) {
    return null
  }

  const model = classifyModel()
  const url = `${openRouterBase()}/chat/completions`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': paths.openRouterAppReferer,
        'X-Title': 'CHECKION page classification',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: AbortSignal.timeout(paths.pageClassifyTimeoutMs),
    })

    const raw = (await res.json()) as unknown
    const usage = parseOpenRouterUsage(raw, { system, user, model })

    if (!res.ok) {
      console.warn(
        '[checkion] page classification upstream',
        res.status,
        result.url.slice(0, 120),
      )
      return { classification: null, usage }
    }

    const root = asRecord(raw)
    const choice = Array.isArray(root?.choices) ? asRecord(root!.choices[0]) : null
    const message = choice ? asRecord(choice.message) : null
    const content = typeof message?.content === 'string' ? message.content : ''
    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      console.warn('[checkion] page classification non-JSON', result.url.slice(0, 120))
      return { classification: null, usage: { ...usage, ...parseOpenRouterUsage(raw, { system, user, content, model }) } }
    }

    const classification = parsePageClassificationPayload(parsed)
    if (!classification) {
      console.warn('[checkion] page classification empty/invalid', result.url.slice(0, 120))
    }

    if (opts?.userId && usage) {
      reportLlmUsage({
        userId: opts.userId,
        usage,
        surface: 'page_classification',
        idempotencyKey: `page_classify:${result.id}`,
      })
    }

    return { classification, usage }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[checkion] page classification failed', result.url.slice(0, 120), msg)
    return { classification: null }
  }
}
