import type {
  DomainEeatAggregate,
  DomainGenerativeAggregate,
  DomainOverview,
} from '@checkion-v3/contracts'

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

/** Deterministic magazine sentence when no LLM key / call fails. */
export function buildTrustGeoReadingFallback(overview: DomainOverview): string {
  const eeat = overview.eeat
  const geo = overview.generative
  if (!eeat && !geo) {
    return 'Trust and GEO chapters are still empty for this crawl.'
  }

  const parts: string[] = []

  if (eeat) {
    const e = eeatBits(eeat)
    if (e.team <= 5 && e.weakAuthorship) {
      parts.push(
        `E-E-A-T shows institutional trust around ${e.trustAvg}% of pages (contact ${e.contact}%, about ${e.about}%), but team and authorship barely register`,
      )
    } else if (e.trustAvg >= 70) {
      parts.push(
        `E-E-A-T coverage is comparatively broad across the crawl — contact ${e.contact}%, privacy ${e.privacy}%, about ${e.about}%`,
      )
    } else {
      parts.push(
        `E-E-A-T is partial across the corpus — contact ${e.contact}%, impressum ${e.impressum}%, privacy only ${e.privacy}%`,
      )
    }
    if (Number(e.citations) < 0.5) {
      parts.push(`citation density stays thin at ${e.citations} per page`)
    }
  }

  if (geo) {
    const g = geoBits(geo)
    const gaps: string[] = []
    if (!g.llms) gaps.push('no llms.txt')
    if (g.repurposing < 40) gaps.push(`repurposing at ${g.repurposing}`)
    if (gaps.length) {
      parts.push(
        `GEO ${g.score} leans on discoverability ${g.discoverability} while ${gaps.join(' and ')} hold answer engines back`,
      )
    } else {
      parts.push(
        `GEO ${g.score} looks balanced — discoverability ${g.discoverability}, repurposing ${g.repurposing}`,
      )
    }
  }

  return clampOneLine(parts.join(' — ') + '.')
}

export async function resolveTrustGeoReading(
  overview: DomainOverview,
): Promise<TrustGeoReadingResult> {
  const fallback = buildTrustGeoReadingFallback(overview)
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) return { statement: fallback, source: 'fallback' }

  try {
    const statement = await callOpenAiTrustGeo(key, overview)
    if (!statement) return { statement: fallback, source: 'fallback' }
    return { statement: clampOneLine(statement), source: 'llm' }
  } catch {
    return { statement: fallback, source: 'fallback' }
  }
}

async function callOpenAiTrustGeo(
  apiKey: string,
  overview: DomainOverview,
): Promise<string | null> {
  const base = (process.env.OPENAI_API_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '')
  const model = process.env.AI_OPENAI_MODEL ?? 'gpt-4o-mini'
  const context = buildTrustGeoReadingContext(overview)

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
            'You write one editorial magazine sentence (max 34 words) interpreting E-E-A-T coverage and GEO aggregate for a domain crawl. Relate the numbers to what they mean for trust and AI discoverability. Use only the provided JSON facts. No quotes, no markdown, no bullet points, no preamble.',
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
