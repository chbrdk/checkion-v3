import type { ScanOverview, ScoreCard, ScoreKind } from '@checkion-v3/contracts'
import { worstScore } from './scan-display'

export type WeakestSignalSource = 'llm' | 'fallback'

export interface WeakestSignalResult {
  statement: string
  source: WeakestSignalSource
}

/** Compact facts for the one-liner prompt — opening-spread context only. */
export function buildWeakestSignalContext(overview: ScanOverview): Record<string, unknown> {
  const worst = worstScore(overview.scores)
  const ranked = [...overview.scores].sort((a, b) => a.value - b.value)
  const stats = overview.scan.issueStats
  const geo = overview.generative
  const ux = overview.ux
  const eco = overview.eco
  const links = overview.links
  const seo = overview.seo
  const perf = overview.performance

  return {
    host: safeHost(overview.scan.url),
    overall: overview.scan.overallScore,
    weakest: worst
      ? { kind: worst.kind, label: worst.label, value: worst.value }
      : null,
    scoreline: ranked.map((s) => ({ label: s.label, value: s.value })),
    issues: stats
      ? {
          errors: stats.errors,
          warnings: stats.warnings,
          notices: stats.notices,
          passed: stats.passed,
          total: stats.total,
        }
      : { issueCount: overview.scan.issueCount },
    topIssues: overview.topIssues.slice(0, 3).map((i) => ({
      title: i.title,
      severity: i.severity,
      section: i.section,
    })),
    generative: geo
      ? {
          score: geo.score,
          discoverability: geo.discoverability,
          repurposing: geo.repurposing,
          hasLlmsTxt: geo.hasLlmsTxt,
          hasFaqSchema: geo.hasFaqSchema,
        }
      : null,
    ux: ux
      ? {
          score: ux.score,
          cls: ux.cls,
          brokenLinkCount: ux.brokenLinkCount,
          tapTargetIssueCount: ux.tapTargetIssueCount,
          readabilityGrade: ux.readabilityGrade,
        }
      : null,
    eco: eco
      ? { co2: eco.co2, grade: eco.grade, pageWeightKb: eco.pageWeightKb }
      : null,
    links: links ?? null,
    seo: seo
      ? {
          titleLength: seo.titleLength,
          metaDescriptionLength: seo.metaDescriptionLength,
          wordCount: seo.wordCount,
          skinnyContent: seo.skinnyContent,
          hasJsonLd: seo.hasJsonLd,
        }
      : null,
    performance: perf
      ? { lcp: perf.lcp, fcp: perf.fcp, ttfb: perf.ttfb, inp: perf.inp ?? null }
      : null,
    classification: overview.classification?.shortSummary ?? null,
  }
}

export function buildWeakestSignalFallback(overview: ScanOverview): string {
  const worst = worstScore(overview.scores)
  if (!worst) {
    return 'No category scores yet — wait for the light payload to finish scoring.'
  }

  const byKind = fallbackByKind(overview, worst)
  if (byKind) return clampOneLine(byKind)

  const stats = overview.scan.issueStats
  const issueBit = stats
    ? `${stats.errors} errors and ${stats.warnings} warnings against ${stats.passed} clean checks`
    : `${overview.scan.issueCount} findings in the light payload`

  return clampOneLine(
    `${worst.label} at ${worst.value} is the softest lens on the scoreline — ${issueBit}.`,
  )
}

export async function resolveWeakestSignalStatement(
  overview: ScanOverview,
): Promise<WeakestSignalResult> {
  const fallback = buildWeakestSignalFallback(overview)
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) return { statement: fallback, source: 'fallback' }

  try {
    const statement = await callOpenAiOneLiner(key, overview)
    if (!statement) return { statement: fallback, source: 'fallback' }
    return { statement: clampOneLine(statement), source: 'llm' }
  } catch {
    return { statement: fallback, source: 'fallback' }
  }
}

async function callOpenAiOneLiner(apiKey: string, overview: ScanOverview): Promise<string | null> {
  const base = (process.env.OPENAI_API_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '')
  const model = process.env.AI_OPENAI_MODEL ?? 'gpt-4o-mini'
  const context = buildWeakestSignalContext(overview)

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 80,
      messages: [
        {
          role: 'system',
          content:
            'You write one editorial magazine sentence (max 28 words) about the weakest quality signal on a web page scan. Use only the provided JSON facts. No quotes, no markdown, no bullet points, no preamble.',
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

function fallbackByKind(overview: ScanOverview, worst: ScoreCard): string | null {
  const stats = overview.scan.issueStats
  const clean = stats ? `${stats.passed} checks already clean` : null

  switch (worst.kind as ScoreKind) {
    case 'generative': {
      const geo = overview.generative
      if (!geo) return null
      const gaps: string[] = []
      if (!geo.hasLlmsTxt) gaps.push('no llms.txt')
      if (!geo.hasFaqSchema) gaps.push('no FAQ schema')
      const gapBit = gaps.length ? gaps.join(' and ') : 'thin machine-readable cues'
      return `GEO at ${worst.value} is the soft underbelly — discoverability ${geo.discoverability} with ${gapBit}${clean ? `, while ${clean}` : ''}.`
    }
    case 'performance': {
      const perf = overview.performance
      if (!perf) return null
      return `Performance at ${worst.value} lags the scoreline — LCP ${Math.round(perf.lcp)}ms and FCP ${Math.round(perf.fcp)}ms set the pace for the rest.`
    }
    case 'seo': {
      const seo = overview.seo
      if (!seo) return null
      const thin = seo.skinnyContent ? 'skinny body copy' : `${seo.wordCount} words on the page`
      return `SEO at ${worst.value} is the weak signal — ${thin}, title ${seo.titleLength} chars, meta ${seo.metaDescriptionLength}.`
    }
    case 'ux': {
      const ux = overview.ux
      if (!ux) return null
      return `UX at ${worst.value} pulls the scoreline down — CLS ${ux.cls}, ${ux.tapTargetIssueCount} tap-target issues, ${ux.brokenLinkCount} broken links.`
    }
    case 'eco': {
      const eco = overview.eco
      if (!eco) return null
      return `Eco at ${worst.value} is the softest mark — grade ${eco.grade}, ${eco.pageWeightKb}kb and ${eco.co2}g CO₂ per view.`
    }
    case 'accessibility': {
      const lead = overview.topIssues.find((i) => i.section === 'accessibility')
      return lead
        ? `Accessibility at ${worst.value} leads the tension — ${lead.title.toLowerCase()}${clean ? `; ${clean}` : ''}.`
        : `Accessibility at ${worst.value} is the weakest lens on this page.`
    }
    case 'best_practices':
      return `Best practices at ${worst.value} is the softest category on the scoreline${clean ? ` — ${clean}` : ''}.`
    default:
      return null
  }
}

function clampOneLine(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim().replace(/^["']|["']$/g, '')
  if (flat.length <= 220) return flat
  return `${flat.slice(0, 217).trim()}…`
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
