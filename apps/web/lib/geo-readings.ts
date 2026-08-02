import type { GeoOverview, GeoQueryRun } from '@checkion-v3/contracts'

export type GeoReadingKind = 'verdict' | 'eeat' | 'placement' | 'queries' | 'query'
export type GeoReadingSource = 'llm' | 'fallback'

export interface GeoReadingResult {
  statement: string
  source: GeoReadingSource
  kind: GeoReadingKind
  query?: string
}

function clampOneLine(text: string, maxWords = 42): string {
  const cleaned = text.replace(/\s+/g, ' ').trim().replace(/^["']|["']$/g, '')
  const words = cleaned.split(' ')
  if (words.length <= maxWords) return cleaned
  return `${words.slice(0, maxWords).join(' ').replace(/[.,;:]+$/, '')}.`
}

function targetSov(overview: GeoOverview) {
  return overview.shareOfVoice.find((s) => s.isTarget) ?? overview.shareOfVoice[0]
}

function rival(overview: GeoOverview) {
  return overview.shareOfVoice.find((s) => !s.isTarget && s.domain !== 'other') ?? null
}

function citeStats(overview: GeoOverview) {
  const cells = overview.positionMatrix.flatMap((row) =>
    overview.models.map((m) => row.positions[m] ?? 0),
  )
  const cited = cells.filter((n) => n > 0)
  const missing = cells.length - cited.length
  const avgPos =
    cited.length === 0 ? 0 : cited.reduce((a, b) => a + b, 0) / cited.length
  const gaps = overview.positionMatrix.filter((row) =>
    overview.models.some((m) => (row.positions[m] ?? 0) === 0),
  )
  return { cited: cited.length, total: cells.length, missing, avgPos, gaps }
}

/** Deterministic magazine sentences when no LLM key. */
export function buildGeoReadingFallback(
  overview: GeoOverview,
  kind: Exclude<GeoReadingKind, 'query'>,
): string {
  const host = overview.targetHost
  const score = overview.job.overallScore ?? 0
  const citedShare = overview.job.citedShare
  const me = targetSov(overview)
  const lead = rival(overview)
  const stats = citeStats(overview)
  const { eeat } = overview

  if (kind === 'verdict') {
    if (citedShare >= 55 && score >= 55) {
      return clampOneLine(
        `${host} holds a workable seat in generative answers (${citedShare}% cited, GEO ${score}) — strong on technical how-tos, thinner when buyers ask who to pick.`,
      )
    }
    if (citedShare < 40) {
      return clampOneLine(
        `${host} is mostly invisible in answer engines (${citedShare}% cited). Category prompts go to ${lead?.domain ?? 'incumbents'}; brand-exact queries are the only reliable door.`,
      )
    }
    return clampOneLine(
      `${host} shows up in about ${citedShare}% of runs (GEO ${score}) — present enough to matter, not yet the default cite when models stack competitors.`,
    )
  }

  if (kind === 'eeat') {
    if (!eeat) {
      return clampOneLine(
        `No on-page E-E-A-T reading is attached to this GEO job — competitive placement stands alone for now.`,
      )
    }
    const weak =
      eeat.authoritativeness < 50
        ? 'authoritativeness lags'
        : eeat.experience < 50
          ? 'lived experience signals are thin'
          : null
    if (eeat.expertise >= 65 && weak) {
      return clampOneLine(
        `Expertise reads strong at ${eeat.expertise}, but ${weak} (${eeat.authoritativeness} auth / ${eeat.experience} experience) — models trust the product story more than the people story.`,
      )
    }
    return clampOneLine(
      `On-page E-E-A-T averages trust ${eeat.trustworthiness}, expertise ${eeat.expertise}, GEO fitness ${eeat.geoFitness} — enough substance to quote, not enough proof to win head-to-heads.`,
    )
  }

  if (kind === 'placement') {
    const worst = stats.gaps[0]
    if (worst && lead) {
      return clampOneLine(
        `Citation rank averages #${stats.avgPos.toFixed(1)} when ${host} appears; ${stats.missing} of ${stats.total} cells are blank. “${worst.queryText.slice(0, 48)}${worst.queryText.length > 48 ? '…' : ''}” is the clearest miss while ${lead.domain} leads share of voice at ${lead.shareOfVoice}%.`,
      )
    }
    return clampOneLine(
      `${host} is cited in ${stats.cited}/${stats.total} model×query cells at average position #${stats.avgPos.toFixed(1)}.`,
    )
  }

  // queries section
  const missN = overview.insights.missVsRival.length
  const notCited = overview.queryRuns.filter((r) => r.ourPosition == null).length
  if (missN > 0) {
    const top = overview.insights.missVsRival[0]!
    return clampOneLine(
      `Across ${overview.queryRuns.length} answers, ${notCited} omit ${host}; the sharpest steal is ${top.rivalDomain} at #${top.rivalPosition} on “${top.query.slice(0, 40)}${top.query.length > 40 ? '…' : ''}” (${top.modelId}).`,
    )
  }
  return clampOneLine(
    `Across ${overview.queryRuns.length} model answers, ${notCited} omit ${host} entirely — comparison phrasing loses more often than how-to phrasing.`,
  )
}

/** Per-prompt magazine reading from insights + sample answers. */
export function buildPromptReadingFallback(overview: GeoOverview, query: string): string {
  const duel = overview.insights.promptDuels.find((d) => d.query === query)
  const host = overview.targetHost
  const runs = overview.queryRuns.filter((r) => r.query === query)
  const miss = overview.insights.missVsRival.filter((m) => m.query === query)
  const sample = runs[0]?.answerText?.slice(0, 120) ?? ''

  if (!duel) {
    return clampOneLine(buildQueryTake(overview, query))
  }

  if (duel.outcome === 'solo') {
    if (duel.targetHitRate === 0) {
      return clampOneLine(
        `No model cited ${host} on this prompt — answers talk past the brand (${sample ? `e.g. “${sample.trim()}…”` : 'empty cite stack'}).`,
      )
    }
    return clampOneLine(
      `${host} is cited in ${duel.targetHitRate}% of models here${duel.targetAvgPosition != null ? ` (avg #${duel.targetAvgPosition})` : ''} — solo run, no rival field to steal the slot.`,
    )
  }

  if (duel.outcome === 'miss') {
    const thief = miss[0]?.rivalDomain ?? duel.leaderDomain ?? 'rivals'
    return clampOneLine(
      `${host} is absent on this prompt while ${thief} takes the cite${miss[0] ? ` (#${miss[0].rivalPosition} in ${miss[0].modelId})` : ''} — close the gap with a quotable comparison page.`,
    )
  }

  if (duel.outcome === 'win') {
    return clampOneLine(
      `${host} leads mention mix on this prompt (${duel.targetHitRate}% cited${duel.targetAvgPosition != null ? `, avg #${duel.targetAvgPosition}` : ''}) — protect the opening definition models already lift.`,
    )
  }

  if (duel.outcome === 'tie') {
    return clampOneLine(
      `${host} ties the field on this prompt with ${duel.leaderDomain ?? 'rivals'} — models name both; first-cite rate is the lever.`,
    )
  }

  // lose
  const steal = miss[0]
  return clampOneLine(
    `${duel.leaderDomain ?? 'A rival'} leads this prompt while ${host} holds ${duel.targetHitRate}% of cells${steal ? `; ${steal.rivalDomain} steals ${steal.modelId}` : ''} — answer framing still defaults elsewhere.`,
  )
}

export function buildQueryTake(overview: GeoOverview, query: string): string {
  // Prefer insights-backed prompt reading when available
  if (overview.insights?.promptDuels?.some((d) => d.query === query)) {
    return buildPromptReadingFallback(overview, query)
  }
  const runs = overview.queryRuns.filter((r) => r.query === query)
  if (!runs.length) return 'No model runs for this query.'
  const cited = runs.filter((r) => r.ourPosition != null)
  const host = overview.targetHost
  if (cited.length === 0) {
    return clampOneLine(
      `No model cited ${host} for this prompt — answers lean on ${runs[0]?.citations[0]?.domain ?? 'category leaders'}.`,
    )
  }
  const avg =
    cited.reduce((a, r) => a + (r.ourPosition ?? 0), 0) / cited.length
  if (cited.length === runs.length && avg <= 1.5) {
    return clampOneLine(
      `${host} leads or ties near #1 across models on this prompt — keep the quotable definition in the opening paragraph.`,
    )
  }
  if (cited.length < runs.length) {
    return clampOneLine(
      `Cited in ${cited.length}/${runs.length} models (avg #${avg.toFixed(1)}) — one engine still skips ${host} when the framing turns competitive.`,
    )
  }
  return clampOneLine(
    `${host} appears in every model here, usually around #${avg.toFixed(1)} — visible, not yet the first lift.`,
  )
}

export function groupRunsByQuery(overview: GeoOverview): Array<{
  query: string
  runs: GeoQueryRun[]
  take: string
}> {
  return overview.queries.map((query) => {
    const runs = overview.queryRuns.filter((r) => r.query === query)
    return { query, runs, take: buildQueryTake(overview, query) }
  })
}

export async function resolveGeoReading(
  overview: GeoOverview,
  kind: GeoReadingKind,
  query?: string,
): Promise<GeoReadingResult> {
  if (kind === 'query') {
    const q = query?.trim()
    if (!q || !overview.queries.includes(q)) {
      return {
        statement: 'Unknown prompt for this GEO job.',
        source: 'fallback',
        kind: 'query',
        query: q,
      }
    }
    const fallback = buildPromptReadingFallback(overview, q)
    const key = process.env.OPENAI_API_KEY?.trim()
    if (!key) return { statement: fallback, source: 'fallback', kind: 'query', query: q }
    try {
      const statement = await callOpenAiPromptReading(key, overview, q)
      if (!statement) return { statement: fallback, source: 'fallback', kind: 'query', query: q }
      return { statement: clampOneLine(statement), source: 'llm', kind: 'query', query: q }
    } catch {
      return { statement: fallback, source: 'fallback', kind: 'query', query: q }
    }
  }

  const fallback = buildGeoReadingFallback(overview, kind)
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) return { statement: fallback, source: 'fallback', kind }

  try {
    const statement = await callOpenAiGeoReading(key, overview, kind)
    if (!statement) return { statement: fallback, source: 'fallback', kind }
    return { statement: clampOneLine(statement), source: 'llm', kind }
  } catch {
    return { statement: fallback, source: 'fallback', kind }
  }
}

async function callOpenAiPromptReading(
  apiKey: string,
  overview: GeoOverview,
  query: string,
): Promise<string | null> {
  const base = (process.env.OPENAI_API_BASE_URL ?? 'https://api.openai.com/v1').replace(
    /\/$/,
    '',
  )
  const model = process.env.AI_OPENAI_MODEL ?? 'gpt-4o-mini'
  const duel = overview.insights.promptDuels.find((d) => d.query === query)
  const cells = overview.insights.cells.filter((c) => c.query === query)
  const runs = overview.queryRuns.filter((r) => r.query === query)
  const context = {
    host: overview.targetHost,
    query,
    duel,
    cells: cells.map((c) => ({
      modelId: c.modelId,
      targetPosition: c.targetPosition,
      firstDomain: c.firstDomain,
      stolenBy: c.stolenBy,
      rivalDomains: c.rivalDomains,
      coCited: c.coCited,
    })),
    answers: runs.map((r) => ({
      modelId: r.modelId,
      excerpt: r.answerText.slice(0, 280),
    })),
  }

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 120,
      messages: [
        {
          role: 'system',
          content:
            'You write CHECKION magazine readings: one tight evaluative English sentence about how models answered this prompt for the target host. No bullets.',
        },
        {
          role: 'user',
          content: `One magazine sentence on this prompt’s competitive answer pattern.\n\nFacts:\n${JSON.stringify(context)}`,
        },
      ],
    }),
  })
  if (!res.ok) return null
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return data.choices?.[0]?.message?.content?.trim() || null
}

async function callOpenAiGeoReading(
  apiKey: string,
  overview: GeoOverview,
  kind: Exclude<GeoReadingKind, 'query'>,
): Promise<string | null> {
  const base = (process.env.OPENAI_API_BASE_URL ?? 'https://api.openai.com/v1').replace(
    /\/$/,
    '',
  )
  const model = process.env.AI_OPENAI_MODEL ?? 'gpt-4o-mini'
  const me = targetSov(overview)
  const lead = rival(overview)
  const stats = citeStats(overview)

  const context = {
    kind,
    host: overview.targetHost,
    score: overview.job.overallScore,
    citedShare: overview.job.citedShare,
    eeat: overview.eeat,
    shareOfVoice: overview.shareOfVoice.slice(0, 5),
    target: me,
    rival: lead,
    placement: stats,
    sampleQueries: overview.queries.slice(0, 4),
    missVsRival: overview.insights.missVsRival.slice(0, 3),
    promptDuels: overview.insights.promptDuels.slice(0, 4),
  }

  const brief: Record<Exclude<GeoReadingKind, 'query'>, string> = {
    verdict:
      'One magazine sentence: overall GEO competitive verdict for the target host. No bullets.',
    eeat: 'One magazine sentence judging on-page E-E-A-T / GEO fitness. No bullets.',
    placement:
      'One magazine sentence on citation placement vs rivals. Mention one concrete gap if useful. No bullets.',
    queries:
      'One magazine sentence on how LLM answers treat the target across queries. Prefer a concrete miss-vs-rival if present. No bullets.',
  }

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 120,
      messages: [
        {
          role: 'system',
          content:
            'You write CHECKION magazine readings: one tight evaluative English sentence, concrete numbers when useful, no hype.',
        },
        {
          role: 'user',
          content: `${brief[kind]}\n\nFacts:\n${JSON.stringify(context)}`,
        },
      ],
    }),
  })
  if (!res.ok) return null
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return data.choices?.[0]?.message?.content?.trim() || null
}
