import type {
  GeoAnswerCellAnalysis,
  GeoCitation,
  GeoCoCitationStats,
  GeoInsights,
  GeoMissVsRival,
  GeoModelDisagreement,
  GeoPresenceSolo,
  GeoPromptDuel,
  GeoPromptDuelOutcome,
  GeoPromptIntent,
  GeoPromptIntentTag,
  GeoQueryRun,
  GeoRecommendation,
  GeoShareOfVoice,
} from '@checkion-v3/contracts'
import { normalizeGeoHost } from './geo-presence'

const MISS_VS_RIVAL_CAP = 8
const MOVES_CAP = 5
const MERGED_RECS_CAP = 6
const DISAGREEMENT_CAP = 6

function pct(num: number, den: number): number {
  if (den <= 0) return 0
  return Math.round((100 * num) / den)
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function targetHit(run: GeoQueryRun, targetHost: string): { hit: boolean; position: number | null } {
  const host = normalizeGeoHost(targetHost)
  if (run.ourPosition != null && run.ourPosition > 0) {
    return { hit: true, position: run.ourPosition }
  }
  const cite = run.citations.find((c) => normalizeGeoHost(c.domain) === host)
  if (cite) return { hit: true, position: cite.position > 0 ? cite.position : null }
  return { hit: false, position: null }
}

/** Registrable label for prose match — `durr.com` → `durr`, `shop.msqdx.example` → `msqdx`. */
export function hostMentionToken(host: string): string {
  const h = normalizeGeoHost(host)
  const parts = h.split('.').filter(Boolean)
  if (parts.length >= 2) return parts[parts.length - 2] ?? h
  return parts[0] ?? h
}

export function targetMentionedInAnswer(answerText: string, targetHost: string): boolean {
  const token = hostMentionToken(targetHost)
  if (!token || token.length < 2) return false
  const hay = answerText.toLowerCase()
  const host = normalizeGeoHost(targetHost).toLowerCase()
  if (hay.includes(host)) return true
  return new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(answerText)
}

function sortedStack(citations: GeoCitation[]): GeoCitation[] {
  return [...citations]
    .map((c) => ({ ...c, domain: normalizeGeoHost(c.domain) }))
    .filter((c) => c.domain)
    .sort((a, b) => a.position - b.position || a.domain.localeCompare(b.domain))
}

export function analyzeAnswerCell(
  run: GeoQueryRun,
  targetHost: string,
  rivals: string[],
): GeoAnswerCellAnalysis {
  const target = normalizeGeoHost(targetHost)
  const rivalSet = new Set(rivals.map(normalizeGeoHost))
  const citationStack = sortedStack(run.citations)
  const { hit, position } = targetHit(run, targetHost)
  const targetPosition = hit ? position : null

  const rivalDomains = [
    ...new Set(
      citationStack.map((c) => c.domain).filter((d) => rivalSet.has(d) && d !== target),
    ),
  ].sort()

  const firstDomain = citationStack.find((c) => c.position === 1)?.domain ?? citationStack[0]?.domain ?? null

  let stolenBy: string | null = null
  if (firstDomain && rivalSet.has(firstDomain) && firstDomain !== target) {
    if (!hit || (targetPosition != null && targetPosition > 1)) {
      stolenBy = firstDomain
    }
  }

  return {
    queryId: run.queryId,
    query: run.query,
    modelId: run.modelId,
    citationStack,
    firstDomain,
    targetPosition,
    rivalDomains,
    coCited: hit && rivalDomains.length >= 1,
    stolenBy,
    targetMentionedInAnswer: targetMentionedInAnswer(run.answerText, targetHost),
  }
}

function buildMissVsRival(
  cells: GeoAnswerCellAnalysis[],
  shareOfVoice: GeoShareOfVoice[],
): GeoMissVsRival[] {
  const sov = new Map(shareOfVoice.map((r) => [r.domain, r.shareOfVoice]))
  const rows: GeoMissVsRival[] = []

  for (const cell of cells) {
    if (cell.targetPosition != null) continue
    if (cell.rivalDomains.length === 0) continue

    const rivalCites = cell.citationStack.filter((c) => cell.rivalDomains.includes(c.domain))
    rivalCites.sort((a, b) => a.position - b.position || a.domain.localeCompare(b.domain))
    const best = rivalCites[0]
    if (!best) continue

    rows.push({
      query: cell.query,
      modelId: cell.modelId,
      rivalDomain: best.domain,
      rivalPosition: best.position,
      otherRivals: rivalCites.slice(1).map((c) => c.domain),
    })
  }

  rows.sort((a, b) => {
    if (a.rivalPosition !== b.rivalPosition) return a.rivalPosition - b.rivalPosition
    const sa = sov.get(a.rivalDomain) ?? 0
    const sb = sov.get(b.rivalDomain) ?? 0
    if (sa !== sb) return sb - sa
    return a.query.localeCompare(b.query) || a.modelId.localeCompare(b.modelId)
  })

  return rows.slice(0, MISS_VS_RIVAL_CAP)
}

/** Heuristic prompt intent — fixture overrides win in `resolvePromptIntents`. */
export function inferPromptIntent(query: string, targetHost: string): GeoPromptIntent {
  const q = query.toLowerCase()
  if (
    /\bvs\.?\b|\bversus\b|\bcompare\b|\balternative|\bvergleich|\bgegenüber|\balternativ/.test(q)
  ) {
    return 'comparison'
  }
  if (
    /\bhow to\b|\bhow do\b|\bhow can\b|\bsteps to\b|\bwie\b|\bschritt[e]?\b|\banleitung\b/.test(q)
  ) {
    return 'how-to'
  }
  const host = normalizeGeoHost(targetHost).toLowerCase()
  if (host && q.includes(host)) return 'branded'
  const token = hostMentionToken(targetHost)
  if (token.length >= 2 && new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(query)) {
    return 'branded'
  }
  return 'other'
}

function intentLabelDe(intent: GeoPromptIntent): string {
  if (intent === 'branded') return 'Marken-Prompts'
  if (intent === 'comparison') return 'Vergleichs-Prompts'
  if (intent === 'how-to') return 'How-to-Prompts'
  return 'Suchprompts'
}

export function resolvePromptIntents(
  queries: string[],
  targetHost: string,
  overrides?: Partial<Record<string, GeoPromptIntent>>,
): GeoPromptIntentTag[] {
  return queries.map((query) => {
    const override = overrides?.[query]
    if (override) {
      return { query, intent: override, source: 'fixture' as const }
    }
    return { query, intent: inferPromptIntent(query, targetHost), source: 'heuristic' as const }
  })
}

function buildCoCitation(cells: GeoAnswerCellAnalysis[], rivals: string[]): GeoCoCitationStats | null {
  if (rivals.length === 0) return null
  const cellCount = cells.length
  let coCitedCount = 0
  let aloneCiteCount = 0
  for (const cell of cells) {
    if (cell.coCited) coCitedCount += 1
    else if (cell.targetPosition != null && cell.rivalDomains.length === 0) aloneCiteCount += 1
  }
  return {
    cellCount,
    coCitedCount,
    aloneCiteCount,
    coCitedRate: pct(coCitedCount, cellCount),
    aloneCiteRate: pct(aloneCiteCount, cellCount),
  }
}

function buildDisagreements(cells: GeoAnswerCellAnalysis[], queries: string[]): GeoModelDisagreement[] {
  const out: GeoModelDisagreement[] = []
  for (const query of queries) {
    const group = cells.filter((c) => c.query === query)
    if (group.length < 2) continue

    const hits = group.filter((c) => c.targetPosition != null)
    const misses = group.filter((c) => c.targetPosition == null)
    const domains = [...new Set(group.map((c) => c.firstDomain).filter((d): d is string => !!d))].sort()

    if (hits.length > 0 && misses.length > 0) {
      out.push({
        query,
        kind: 'cite_split',
        hitModels: hits.map((c) => c.modelId).sort(),
        missModels: misses.map((c) => c.modelId).sort(),
        firstDomains: domains,
      })
    }

    if (domains.length >= 2) {
      out.push({
        query,
        kind: 'first_domain_split',
        firstDomains: domains,
      })
    }
  }
  return out.slice(0, DISAGREEMENT_CAP)
}

function slugId(parts: string[]): string {
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64)
}

export function buildDerivedMoves(input: {
  missVsRival: GeoMissVsRival[]
  promptDuels: GeoPromptDuel[]
  disagreements: GeoModelDisagreement[]
  solo: GeoPresenceSolo
  targetHost: string
}): GeoRecommendation[] {
  const moves: GeoRecommendation[] = []
  const seenQueries = new Set<string>()
  const host = input.targetHost || 'deine Domain'

  // 1. Miss-vs-rival — one per distinct (query, rivalDomain)
  const missKeys = new Set<string>()
  for (const row of input.missVsRival) {
    const key = `${row.query}::${row.rivalDomain}`
    if (missKeys.has(key)) continue
    missKeys.add(key)
    seenQueries.add(row.query)
    const cue = truncate(row.query, 48)
    moves.push({
      id: slugId(['move-miss', row.rivalDomain, row.query]),
      title: `${row.rivalDomain} zitiert bei „${cue}“ — du nicht`,
      severity: 'high',
      body: `${row.rivalDomain} steht auf Platz #${row.rivalPosition}, ${host} fehlt in der Antwort. Ergänze einen klar zitierbaren Block zur Frage „${truncate(row.query, 96)}“ (kurze Definition, 1–2 Fakten, Quelle/Ansprechpartner), den Modelle direkt übernehmen können.`,
      source: 'derived',
      query: row.query,
    })
    if (moves.length >= MOVES_CAP) return moves
  }

  // 2. Lose / miss duels not already covered
  for (const duel of input.promptDuels) {
    if (duel.outcome !== 'lose' && duel.outcome !== 'miss') continue
    if (seenQueries.has(duel.query)) continue
    seenQueries.add(duel.query)
    const intentDe = intentLabelDe(duel.intent)
    const lead = duel.leaderDomain
      ? ` Aktuell führt ${duel.leaderDomain}.`
      : ''
    moves.push({
      id: slugId(['move-duel', duel.outcome, duel.query]),
      title:
        duel.outcome === 'miss'
          ? `Bei ${intentDe} zitiert werden`
          : `${intentDe}: Führungsposition zurückholen`,
      severity: duel.outcome === 'miss' ? 'high' : 'medium',
      body: `„${truncate(duel.query, 96)}“ ist ein ${duel.outcome === 'miss' ? 'Miss' : 'Rückstand'} (${duel.targetHitRate}% Zitationsrate).${lead} Richte den Seitenanfang so aus, dass Antwortmodelle ${host} zuerst nennen — mit eindeutiger Claim-Zeile und Belegen.`,
      source: 'derived',
      query: duel.query,
    })
    if (moves.length >= MOVES_CAP) return moves
  }

  // 3. First-cite gap
  if (
    input.solo.firstCiteRate != null &&
    input.solo.firstCiteRate < 50 &&
    input.solo.hitCount > 0
  ) {
    moves.push({
      id: 'move-first-cite',
      title: 'Erste Zitationsposition gewinnen',
      severity: 'medium',
      body: `${host} wird in ${input.solo.hitCount} Zellen zitiert, aber nur in ${input.solo.firstCiteRate}% als #1. Schärfe Definitionen und Lead-Absätze, damit Modelle deinen Snippet zuerst heben.`,
      source: 'derived',
    })
    if (moves.length >= MOVES_CAP) return moves
  }

  // 4. Cite-split disagreement
  for (const d of input.disagreements) {
    if (d.kind !== 'cite_split') continue
    if (seenQueries.has(d.query)) continue
    seenQueries.add(d.query)
    const hit = (d.hitModels ?? []).join(', ')
    const miss = (d.missModels ?? []).join(', ')
    moves.push({
      id: slugId(['move-split', d.query]),
      title: 'Modell-Widerspruch bei Zitation auflösen',
      severity: 'medium',
      body: `Bei „${truncate(d.query, 96)}“ zitieren ${hit || 'einige Modelle'} ${host}, während ${miss || 'andere'} dich auslassen. Formuliere den Claim eindeutig und mit Belegen, die über Engines hinweg zitierbar sind.`,
      source: 'derived',
      query: d.query,
    })
    if (moves.length >= MOVES_CAP) return moves
  }

  return moves
}

const EEAT_GAP_MOVES_CAP = 2

/** On-page GEO fitness gaps → actionable moves (DE). */
export function buildEeatGapMoves(input: {
  missingElements?: string[] | null
  targetHost: string
}): GeoRecommendation[] {
  const host = input.targetHost || 'deine Domain'
  const gaps = (input.missingElements ?? [])
    .map((g) => g.trim())
    .filter(Boolean)
    .slice(0, EEAT_GAP_MOVES_CAP)
  return gaps.map((gap, i) => ({
    id: slugId(['move-eeat', gap, String(i)]),
    title: `On-Page-Lücke: ${truncate(gap, 42)}`,
    severity: 'medium' as const,
    body: `Für ${host} fehlt „${gap}“. Ergänze das Element mit klarer Struktur und zitierbaren Fakten (Wer / Was / Nachweis), damit Modelle die Seite als Quelle belohnen.`,
    source: 'derived' as const,
  }))
}

/** Derived moves win; append unique fixture ids. */
export function mergeRecommendations(
  derived: GeoRecommendation[],
  fixture: GeoRecommendation[],
): GeoRecommendation[] {
  if (derived.length === 0) {
    return fixture.map((r) => ({ ...r, source: r.source ?? 'fixture' }))
  }
  const ids = new Set(derived.map((d) => d.id))
  const extras = fixture
    .filter((f) => !ids.has(f.id))
    .map((r) => ({ ...r, source: r.source ?? ('fixture' as const) }))
  return [...derived, ...extras].slice(0, MERGED_RECS_CAP)
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s
  return `${s.slice(0, n - 1)}…`
}

function promptDuelForQuery(
  query: string,
  runs: GeoQueryRun[],
  targetHost: string,
  rivals: string[],
  intent: GeoPromptIntent,
): GeoPromptDuel {
  const target = normalizeGeoHost(targetHost)
  const field = new Set([target, ...rivals.map(normalizeGeoHost)])

  if (rivals.length === 0) {
    const hits = runs.filter((r) => targetHit(r, targetHost).hit)
    const positions = hits
      .map((r) => targetHit(r, targetHost).position)
      .filter((p): p is number => p != null)
    const avg = mean(positions)
    return {
      query,
      outcome: 'solo',
      targetHitRate: pct(hits.length, runs.length),
      targetAvgPosition: avg == null ? null : Math.round(avg * 10) / 10,
      leaderDomain: hits.length > 0 ? target : null,
      intent,
    }
  }

  const hitResults = runs.map((r) => targetHit(r, targetHost))
  const hitCount = hitResults.filter((h) => h.hit).length
  const targetHitRate = pct(hitCount, runs.length)
  const positions = hitResults
    .map((h) => h.position)
    .filter((p): p is number => p != null)
  const targetAvgPosition = mean(positions)
  const roundedAvg =
    targetAvgPosition == null ? null : Math.round(targetAvgPosition * 10) / 10

  if (hitCount === 0) {
    const mention = mentionStats(runs, field)
    const leaderDomain = pickLeader(mention, target)
    return {
      query,
      outcome: 'miss',
      targetHitRate: 0,
      targetAvgPosition: null,
      leaderDomain,
      intent,
    }
  }

  const mention = mentionStats(runs, field)
  const leaders = topDomains(mention)
  const leaderDomain = pickLeader(mention, target)

  let outcome: GeoPromptDuelOutcome
  if (leaders.includes(target) && leaders.length === 1) outcome = 'win'
  else if (leaders.includes(target) && leaders.length > 1) outcome = 'tie'
  else outcome = 'lose'

  return {
    query,
    outcome,
    targetHitRate,
    targetAvgPosition: roundedAvg,
    leaderDomain,
    intent,
  }
}

type MentionAcc = Map<string, { count: number; positions: number[] }>

function mentionStats(runs: GeoQueryRun[], field: Set<string>): MentionAcc {
  const acc: MentionAcc = new Map()
  for (const run of runs) {
    for (const c of run.citations) {
      const d = normalizeGeoHost(c.domain)
      if (!d || !field.has(d)) continue
      const row = acc.get(d) ?? { count: 0, positions: [] }
      row.count += 1
      if (c.position > 0) row.positions.push(c.position)
      acc.set(d, row)
    }
  }
  return acc
}

function topDomains(acc: MentionAcc): string[] {
  if (acc.size === 0) return []
  const max = Math.max(...[...acc.values()].map((v) => v.count))
  return [...acc.entries()]
    .filter(([, v]) => v.count === max)
    .map(([d]) => d)
    .sort()
}

function pickLeader(acc: MentionAcc, target: string): string | null {
  const leaders = topDomains(acc)
  if (leaders.length === 0) return null
  if (leaders.length === 1) return leaders[0] ?? null

  let best: string | null = null
  let bestAvg = Infinity
  for (const d of leaders) {
    const avg = mean(acc.get(d)?.positions ?? []) ?? Infinity
    if (avg < bestAvg || (avg === bestAvg && (best == null || d.localeCompare(best) < 0))) {
      bestAvg = avg
      best = d
    }
  }
  return best
}

export type BuildGeoInsightsInput = {
  targetHost: string
  queries: string[]
  queryRuns: GeoQueryRun[]
  rivals: string[]
  shareOfVoice?: GeoShareOfVoice[]
  /** Optional fixture intent overrides keyed by exact query text. */
  queryIntents?: Partial<Record<string, GeoPromptIntent>>
  /** Solo presence metrics for first-cite moves (optional). */
  solo?: GeoPresenceSolo
}

/** Derive answer insights — specs/domain/geo-answer-insights.md */
export function buildGeoInsights(input: BuildGeoInsightsInput): GeoInsights {
  const rivals = input.rivals.map(normalizeGeoHost).filter(Boolean)
  const cells = input.queryRuns.map((run) =>
    analyzeAnswerCell(run, input.targetHost, rivals),
  )
  const missVsRival =
    rivals.length === 0
      ? []
      : buildMissVsRival(cells, input.shareOfVoice ?? [])

  const intents = resolvePromptIntents(input.queries, input.targetHost, input.queryIntents)
  const intentByQuery = new Map(intents.map((t) => [t.query, t.intent]))

  const promptDuels = input.queries.map((query) => {
    const runs = input.queryRuns.filter((r) => r.query === query)
    return promptDuelForQuery(
      query,
      runs,
      input.targetHost,
      rivals,
      intentByQuery.get(query) ?? 'other',
    )
  })

  const coCitation = buildCoCitation(cells, rivals)
  const disagreements = buildDisagreements(cells, input.queries)

  const solo: GeoPresenceSolo = input.solo ?? {
    cellCount: cells.length,
    hitCount: cells.filter((c) => c.targetPosition != null).length,
    citedShare: 0,
    missRate: 0,
    avgPosition: null,
    firstCiteRate: null,
    byModel: [],
    byQuery: [],
  }

  const moves = buildDerivedMoves({
    missVsRival,
    promptDuels,
    disagreements,
    solo,
    targetHost: normalizeGeoHost(input.targetHost),
  })

  return {
    promptDuels,
    missVsRival,
    cells,
    intents,
    coCitation,
    disagreements,
    moves,
  }
}

export function cellKey(queryId: string, modelId: string): string {
  return `${queryId}::${modelId}`
}

export function findCellAnalysis(
  insights: GeoInsights,
  queryId: string,
  modelId: string,
): GeoAnswerCellAnalysis | undefined {
  return insights.cells.find((c) => c.queryId === queryId && c.modelId === modelId)
}

export function findDisagreement(
  insights: GeoInsights,
  query: string,
): GeoModelDisagreement | undefined {
  const rows = insights.disagreements.filter((d) => d.query === query)
  return rows.find((d) => d.kind === 'cite_split') ?? rows[0]
}

export function findIntent(insights: GeoInsights, query: string): GeoPromptIntentTag | undefined {
  return insights.intents.find((t) => t.query === query)
}
