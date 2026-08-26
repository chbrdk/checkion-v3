import type {
  DomainEeatAggregate,
  DomainGenerativeAggregate,
  DomainOverview,
} from '@checkion-v3/contracts'
import { createTranslator, normalizeLocale, type Locale, type Translator } from './i18n'

export type TrustGeoReadingSource = 'llm' | 'fallback'

export interface TrustGeoReadingResult {
  statement: string
  source: TrustGeoReadingSource
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

function eeatBits(eeat: DomainEeatAggregate): {
  contact: number
  privacy: number
  impressum: number
  about: number
  team: number
  citations: string
  trustAvg: number
  weakAuthorship: boolean
} {
  const contact = pct(eeat.trust.pagesWithContact, eeat.totalPages)
  const privacy = pct(eeat.trust.pagesWithPrivacy, eeat.totalPages)
  const impressum = pct(eeat.trust.pagesWithImpressum, eeat.totalPages)
  const about = pct(eeat.experience.pagesWithAbout, eeat.totalPages)
  const team = pct(eeat.experience.pagesWithTeam, eeat.totalPages)
  const trustAvg = Math.round((contact + privacy + impressum + about) / 4)
  return {
    contact,
    privacy,
    impressum,
    about,
    team,
    citations: eeat.expertise.avgCitationsPerPage.toFixed(2),
    trustAvg,
    weakAuthorship:
      eeat.expertise.pagesWithAuthorBio === 0 &&
      eeat.expertise.pagesWithArticleAuthor === 0,
  }
}

function geoBits(geo: DomainGenerativeAggregate): {
  score: number
  discoverability: number
  repurposing: number
  llms: boolean
  robotsOpen: boolean
} {
  return {
    score: geo.score,
    discoverability: geo.discoverability,
    repurposing: geo.repurposing,
    llms: geo.withLlmsTxt > 0,
    robotsOpen:
      geo.withRobotsAllowingAi != null &&
      geo.withRobotsAllowingAi >= Math.max(1, Math.floor(geo.pageCount * 0.9)),
  }
}

/** Compact facts for the trust/GEO one-liner prompt. */
export function buildTrustGeoReadingContext(overview: DomainOverview): Record<string, unknown> {
  const eeat = overview.eeat
  const geo = overview.generative
  return {
    host: overview.scan.rootUrl,
    pageCount: overview.scan.pageCount,
    overall: overview.scan.overallScore,
    eeat: eeat
      ? {
          ...eeatBits(eeat),
          raw: {
            contact: eeat.trust.pagesWithContact,
            privacy: eeat.trust.pagesWithPrivacy,
            impressum: eeat.trust.pagesWithImpressum,
            about: eeat.experience.pagesWithAbout,
            team: eeat.experience.pagesWithTeam,
            totalPages: eeat.totalPages,
          },
        }
      : null,
    generative: geo ? geoBits(geo) : null,
    themes: overview.classification?.tags?.slice(0, 3) ?? null,
  }
}

function buildFallbackWithT(overview: DomainOverview, t: Translator): string {
  const eeat = overview.eeat
  const geo = overview.generative
  if (!eeat && !geo) {
    return t('domain.trustReadingEmpty')
  }

  const parts: string[] = []

  if (eeat) {
    const e = eeatBits(eeat)
    if (e.team <= 5 && e.weakAuthorship) {
      parts.push(
        t('domain.trustReadingWeakAuth', {
          trustAvg: e.trustAvg,
          contact: e.contact,
          about: e.about,
        }),
      )
    } else if (e.trustAvg >= 70) {
      parts.push(
        t('domain.trustReadingBroad', {
          contact: e.contact,
          privacy: e.privacy,
          about: e.about,
        }),
      )
    } else {
      parts.push(
        t('domain.trustReadingPartial', {
          contact: e.contact,
          impressum: e.impressum,
          privacy: e.privacy,
        }),
      )
    }
    if (Number(e.citations) < 0.5) {
      parts.push(t('domain.trustReadingCitations', { citations: e.citations }))
    }
  }

  if (geo) {
    const g = geoBits(geo)
    const gaps: string[] = []
    if (!g.llms) gaps.push(t('domain.trustReadingGapNoLlms'))
    if (g.repurposing < 40) {
      gaps.push(t('domain.trustReadingGapRepurposing', { repurposing: g.repurposing }))
    }
    if (gaps.length) {
      parts.push(
        t('domain.trustReadingGeoGaps', {
          score: g.score,
          discoverability: g.discoverability,
          gaps: gaps.join(' · '),
        }),
      )
    } else {
      parts.push(
        t('domain.trustReadingGeoOk', {
          score: g.score,
          discoverability: g.discoverability,
          repurposing: g.repurposing,
        }),
      )
    }
  }

  return clampOneLine(parts.join(' — ') + '.')
}

/** Deterministic magazine sentence when no LLM key / call fails. */
export function buildTrustGeoReadingFallback(
  overview: DomainOverview,
  locale: Locale | string = 'en',
): string {
  return buildFallbackWithT(overview, createTranslator(normalizeLocale(locale)))
}

export async function resolveTrustGeoReading(
  overview: DomainOverview,
  locale: Locale | string = 'en',
): Promise<TrustGeoReadingResult> {
  const normalized = normalizeLocale(locale)
  const fallback = buildTrustGeoReadingFallback(overview, normalized)
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) return { statement: fallback, source: 'fallback' }

  try {
    const statement = await callOpenAiTrustGeo(key, overview, normalized)
    if (!statement) return { statement: fallback, source: 'fallback' }
    return { statement: clampOneLine(statement), source: 'llm' }
  } catch {
    return { statement: fallback, source: 'fallback' }
  }
}

async function callOpenAiTrustGeo(
  apiKey: string,
  overview: DomainOverview,
  locale: Locale,
): Promise<string | null> {
  const base = (process.env.OPENAI_API_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '')
  const model = process.env.AI_OPENAI_MODEL ?? 'gpt-4o-mini'
  const context = buildTrustGeoReadingContext(overview)
  const language =
    locale === 'de'
      ? 'Write the sentence in German (natural product German, no English filler).'
      : 'Write the sentence in English.'

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
          content: `You write one editorial magazine sentence (max 34 words) interpreting E-E-A-T coverage and GEO aggregate for a domain crawl. Relate the numbers to what they mean for trust and AI discoverability. Use only the provided JSON facts. No quotes, no markdown, no bullet points, no preamble. ${language}`,
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
