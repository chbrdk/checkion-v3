import type { DomainOverview, DomainSeoCoverage } from '@checkion-v3/contracts'

export type SeoReadingSource = 'llm' | 'fallback'

export interface SeoReadingResult {
  statement: string
  source: SeoReadingSource
}

function pct(have: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((100 * have) / total)
}

function clampOneLine(text: string, maxWords = 36): string {
  const cleaned = text.replace(/\s+/g, ' ').trim().replace(/^["']|["']$/g, '')
  const words = cleaned.split(' ')
  if (words.length <= maxWords) return cleaned
  return `${words.slice(0, maxWords).join(' ').replace(/[.,;:]+$/, '')}.`
}

function seoBits(seo: DomainSeoCoverage) {
  return {
    title: pct(seo.withTitle, seo.totalPages),
    h1: pct(seo.withH1, seo.totalPages),
    meta: pct(seo.withMetaDescription, seo.totalPages),
    canonical: pct(seo.withCanonical, seo.totalPages),
    og: seo.withOgTitle != null ? pct(seo.withOgTitle, seo.totalPages) : null,
    twitter: seo.withTwitterCard != null ? pct(seo.withTwitterCard, seo.totalPages) : null,
    mismatches: seo.canonicalMismatchCount,
    dupTitles: seo.duplicateTitleGroupCount,
    dupMeta: seo.duplicateMetaGroupCount ?? null,
    hreflangConflict: seo.hreflangXDefaultConflict ?? null,
    keywords: seo.topKeywords?.slice(0, 4) ?? [],
    totalPages: seo.totalPages,
  }
}

export function buildSeoReadingContext(overview: DomainOverview): Record<string, unknown> {
  const seo = overview.seoCoverage
  return {
    host: overview.scan.rootUrl,
    pageCount: overview.scan.pageCount,
    seo: seo ? seoBits(seo) : null,
  }
}

export function buildSeoReadingFallback(overview: DomainOverview): string {
  const seo = overview.seoCoverage
  if (!seo) return 'SEO coverage is not available for this crawl.'

  const s = seoBits(seo)
  const coreAvg = Math.round((s.title + s.h1 + s.meta + s.canonical) / 4)
  const parts: string[] = []

  if (coreAvg >= 90) {
    parts.push(
      `Core tags are nearly universal — title ${s.title}%, H1 ${s.h1}%, meta ${s.meta}%, canonical ${s.canonical}%`,
    )
  } else if (coreAvg >= 70) {
    parts.push(
      `Core SEO presence is solid but uneven — title ${s.title}%, H1 ${s.h1}%, meta ${s.meta}%, canonical ${s.canonical}%`,
    )
  } else {
    parts.push(
      `Basic SEO coverage is thin across the crawl — title ${s.title}%, H1 ${s.h1}%, meta ${s.meta}%`,
    )
  }

  const gaps: string[] = []
  if (s.og != null && s.og < 20) gaps.push(`Open Graph almost missing at ${s.og}%`)
  if (s.mismatches > 0) {
    gaps.push(`${s.mismatches.toLocaleString()} canonical mismatches`)
  }
  if (s.dupTitles > 0) {
    gaps.push(`${s.dupTitles.toLocaleString()} duplicate title groups`)
  }
  if (s.hreflangConflict) gaps.push('hreflang x-default conflict')

  if (gaps.length) {
    parts.push(`yet ${gaps.slice(0, 3).join(', ')} still confuse crawlers`)
  } else if (s.twitter != null && s.twitter >= 90) {
    parts.push(`Twitter cards keep social previews covered at ${s.twitter}%`)
  }

  return clampOneLine(parts.join(' — ') + '.')
}

export async function resolveSeoReading(overview: DomainOverview): Promise<SeoReadingResult> {
  const fallback = buildSeoReadingFallback(overview)
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) return { statement: fallback, source: 'fallback' }

  try {
    const statement = await callOpenAiSeo(key, overview)
    if (!statement) return { statement: fallback, source: 'fallback' }
    return { statement: clampOneLine(statement), source: 'llm' }
  } catch {
    return { statement: fallback, source: 'fallback' }
  }
}

async function callOpenAiSeo(apiKey: string, overview: DomainOverview): Promise<string | null> {
  const base = (process.env.OPENAI_API_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '')
  const model = process.env.AI_OPENAI_MODEL ?? 'gpt-4o-mini'
  const context = buildSeoReadingContext(overview)

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 90,
      messages: [
        {
          role: 'system',
          content:
            'You write one editorial magazine sentence (max 34 words) interpreting SEO coverage across a domain crawl. Relate presence percentages and conflicts to what they mean for indexing and previews. Use only the provided JSON facts. No quotes, no markdown, no bullet points, no preamble.',
        },
        {
          role: 'user',
          content: JSON.stringify(context),
        },
      ],
    }),
  })

  if (!res.ok) return null
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>
  }
  const raw = data.choices?.[0]?.message?.content?.trim()
  return raw || null
}
