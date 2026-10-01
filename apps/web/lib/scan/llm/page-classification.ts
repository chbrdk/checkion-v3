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
const MAX_TOKENS = 800
const CLASSIFY_CONCURRENCY = 2
const RETRY_429_MAX = 3

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

/** Pull assistant text from OpenRouter/OpenAI-shaped message content. */
export function extractMessageContent(message: Record<string, unknown> | null): string {
  if (!message) return ''
  const content = message.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        const r = asRecord(part)
        if (!r) return ''
        if (typeof r.text === 'string') return r.text
        if (typeof r.content === 'string') return r.content
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  // Some providers put the final answer in reasoning when content is empty.
  if (typeof message.reasoning === 'string' && message.reasoning.trim()) {
    return message.reasoning
  }
  if (typeof message.reasoning_content === 'string' && message.reasoning_content.trim()) {
    return message.reasoning_content
  }
  return ''
}

/**
 * Tolerate markdown fences, think-blocks, and leading prose around a JSON object.
 * Exported for tests.
 */
export function parseJsonLoose(raw: string): unknown | null {
  let text = raw.trim()
  if (!text) return null

  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  text = text.replace(/```(?:json)?\s*([\s\S]*?)```/gi, '$1').trim()

  try {
    return JSON.parse(text)
  } catch {
    /* fall through */
  }

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1))
    } catch {
      return null
    }
  }
  return null
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
    'Return a single JSON object only with keys: shortSummary (string), tagTiers (array of {tag, tier}).',
    `shortSummary: 1–2 sentences in ${locale === 'de' ? 'German' : 'English'} describing what the page is about.`,
    `tagTiers: ${MIN_TAGS}–${MAX_TAGS} lowercase topic tokens (English preferred for tags), each with tier 1–5 (5 = core page theme).`,
    'No markdown. No code fences. No preamble. No boilerplate tags like "website", "homepage", "page", "content".',
  ].join(' ')

  const user = [
    `URL: ${result.url}`,
    title ? `Title: ${title}` : null,
    h1 ? `H1: ${h1}` : null,
    meta ? `Meta description: ${meta}` : null,
    excerpt ? `Body excerpt:\n${excerpt}` : 'Body excerpt: (empty)',
    // Qwen hybrid-thinking models honor this turn-level off switch.
    '/no_think',
  ]
    .filter(Boolean)
    .join('\n')

  return { system, user }
}

/** Process-wide slot so deep crawls don't stampede OpenRouter. */
let activeClassify = 0
const classifyWaiters: Array<() => void> = []

async function acquireClassifySlot(): Promise<void> {
  if (activeClassify < CLASSIFY_CONCURRENCY) {
    activeClassify += 1
    return
  }
  await new Promise<void>((resolve) => {
    classifyWaiters.push(resolve)
  })
  activeClassify += 1
}

function releaseClassifySlot(): void {
  activeClassify = Math.max(0, activeClassify - 1)
  const next = classifyWaiters.shift()
  if (next) next()
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Classify page topics. Fail-open: returns null when disabled, unconfigured, or on error.
 * @param opts.classifyPageTopics — default true (single + deep); pass false to skip.
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

  await acquireClassifySlot()
  try {
    let lastUsage: ClassifyPageOutcome['usage'] | undefined

    for (let attempt = 0; attempt <= RETRY_429_MAX; attempt += 1) {
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
          max_tokens: MAX_TOKENS,
          response_format: { type: 'json_object' },
          // Qwen3.7 Flash defaults to thinking; thinking burns max_tokens and
          // leaves empty/non-JSON content. Force non-thinking for structured output.
          reasoning: { effort: 'none' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
        signal: AbortSignal.timeout(paths.pageClassifyTimeoutMs),
      })

      const raw = (await res.json()) as unknown
      const usage = parseOpenRouterUsage(raw, { system, user, model })
      lastUsage = usage

      if (res.status === 429 && attempt < RETRY_429_MAX) {
        const backoffMs = 1500 * 2 ** attempt
        console.warn(
          '[checkion] page classification 429 retry',
          attempt + 1,
          result.url.slice(0, 120),
        )
        await sleep(backoffMs)
        continue
      }

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
      const content = extractMessageContent(message)
      const parsed = parseJsonLoose(content)

      if (!parsed) {
        console.warn(
          '[checkion] page classification non-JSON',
          result.url.slice(0, 120),
          content.slice(0, 80).replace(/\s+/g, ' '),
        )
        return {
          classification: null,
          usage: { ...usage, ...parseOpenRouterUsage(raw, { system, user, content, model }) },
        }
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
    }

    return { classification: null, usage: lastUsage }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[checkion] page classification failed', result.url.slice(0, 120), msg)
    return { classification: null }
  } finally {
    releaseClassifySlot()
  }
}
