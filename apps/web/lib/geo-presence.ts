import type {
  GeoCitation,
  GeoMeasurement,
  GeoPresence,
  GeoPresenceField,
  GeoPresenceSolo,
  GeoQueryRun,
  GeoRivalSource,
  GeoShareOfVoice,
} from '@checkion-v3/contracts'
import { citationMatchesTargetHost } from './geo-eeat/competitive-response'
import { targetMentionedInAnswer } from './geo-insights'

const MAX_RIVALS = 5

export function normalizeGeoHost(urlOrDomain: string): string {
  let s = urlOrDomain.trim().toLowerCase()
  s = s.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] ?? ''
  return s
}

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
  const cite = run.citations.find((c) => citationMatchesTargetHost(c.domain, host))
  if (cite) return { hit: true, position: cite.position > 0 ? cite.position : null }
  return { hit: false, position: null }
}

function discoverRivalCounts(
  runs: GeoQueryRun[],
  targetHost: string,
): Map<string, number> {
  const target = normalizeGeoHost(targetHost)
  const counts = new Map<string, number>()
  for (const run of runs) {
    for (const c of run.citations) {
      const d = normalizeGeoHost(c.domain)
      if (!d || d === target) continue
      counts.set(d, (counts.get(d) ?? 0) + 1)
    }
  }
  return counts
}

export function resolveRivals(
  explicitCompetitors: string[],
  runs: GeoQueryRun[],
  targetHost: string,
): { rivals: string[]; rivalSource: GeoRivalSource } {
  const target = normalizeGeoHost(targetHost)
  const explicit = [
    ...new Set(
      explicitCompetitors.map(normalizeGeoHost).filter((d) => d && d !== target),
    ),
  ]
  const discovered = [...discoverRivalCounts(runs, target).entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([d]) => d)

  const rivals: string[] = []
  const seen = new Set<string>()
  for (const d of explicit) {
    if (seen.has(d)) continue
    rivals.push(d)
    seen.add(d)
    if (rivals.length >= MAX_RIVALS) break
  }
  for (const d of discovered) {
    if (rivals.length >= MAX_RIVALS) break
    if (seen.has(d)) continue
    rivals.push(d)
    seen.add(d)
  }

  const hasExplicit = explicit.some((d) => rivals.includes(d))
  const hasDiscovered = discovered.some((d) => rivals.includes(d) && !explicit.includes(d))
  let rivalSource: GeoRivalSource = 'none'
  if (rivals.length === 0) rivalSource = 'none'
  else if (hasExplicit && hasDiscovered) rivalSource = 'mixed'
  else if (hasExplicit) rivalSource = 'explicit'
  else rivalSource = 'discovered'

  return { rivals, rivalSource }
}

function buildSolo(
  runs: GeoQueryRun[],
  targetHost: string,
  queries: string[],
  measurement?: GeoMeasurement,
): GeoPresenceSolo {
  const cellCount = runs.length
  const positions: number[] = []
  let hitCount = 0
  let firstCiteHits = 0
  let mentionCount = 0

  const modelMap = new Map<string, { cellCount: number; hitCount: number }>()
  const queryMap = new Map<string, { cellCount: number; hitCount: number }>()

  for (const q of queries) {
    queryMap.set(q, { cellCount: 0, hitCount: 0 })
  }

  for (const run of runs) {
    const { hit, position } = targetHit(run, targetHost)
    const m = modelMap.get(run.modelId) ?? { cellCount: 0, hitCount: 0 }
    m.cellCount += 1
    if (hit) m.hitCount += 1
    modelMap.set(run.modelId, m)

    const q = queryMap.get(run.query) ?? { cellCount: 0, hitCount: 0 }
    q.cellCount += 1
    if (hit) q.hitCount += 1
    queryMap.set(run.query, q)

    if (hit) {
      hitCount += 1
      if (position != null) {
        positions.push(position)
        if (position === 1) firstCiteHits += 1
      }
    }
    if (measurement === 'live' && targetMentionedInAnswer(run.answerText, targetHost)) {
      mentionCount += 1
    }
  }

  const citedShare = pct(hitCount, cellCount)
  const avgPosition = mean(positions)

  return {
    cellCount,
    hitCount,
    citedShare,
    missRate: cellCount === 0 ? 0 : 100 - citedShare,
    avgPosition: avgPosition == null ? null : Math.round(avgPosition * 10) / 10,
    firstCiteRate: hitCount === 0 ? null : pct(firstCiteHits, hitCount),
    ...(measurement === 'live' ? { mentionedShare: pct(mentionCount, cellCount) } : {}),
    byModel: [...modelMap.entries()]
      .map(([modelId, s]) => ({
        modelId,
        cellCount: s.cellCount,
        hitCount: s.hitCount,
        hitRate: pct(s.hitCount, s.cellCount),
      }))
      .sort((a, b) => a.modelId.localeCompare(b.modelId)),
    byQuery: queries.map((query) => {
      const s = queryMap.get(query) ?? { cellCount: 0, hitCount: 0 }
      return {
        query,
        cellCount: s.cellCount,
        hitCount: s.hitCount,
        hitRate: pct(s.hitCount, s.cellCount),
      }
    }),
  }
}

type Acc = { mentionCount: number; positions: number[] }

function buildField(
  runs: GeoQueryRun[],
  targetHost: string,
  rivals: string[],
): GeoPresenceField {
  const target = normalizeGeoHost(targetHost)
  const rivalSet = new Set(rivals.map(normalizeGeoHost))
  const acc = new Map<string, Acc>()

  const bump = (domain: string, position: number) => {
    const row = acc.get(domain) ?? { mentionCount: 0, positions: [] }
    row.mentionCount += 1
    if (position > 0) row.positions.push(position)
    acc.set(domain, row)
  }

  for (const run of runs) {
    for (const c of run.citations) {
      const d = normalizeGeoHost(c.domain)
      if (!d) continue
      if (d === target) bump(target, c.position)
      else if (rivalSet.has(d)) bump(d, c.position)
      else bump('other', c.position)
    }
  }

  // Ensure target + rivals appear even with 0 mentions
  if (!acc.has(target)) acc.set(target, { mentionCount: 0, positions: [] })
  for (const r of rivalSet) {
    if (!acc.has(r)) acc.set(r, { mentionCount: 0, positions: [] })
  }

  const total = [...acc.values()].reduce((s, a) => s + a.mentionCount, 0) || 1

  const shareOfVoice: GeoShareOfVoice[] = [...acc.entries()]
    .filter(([domain, a]) => domain !== 'other' || a.mentionCount > 0)
    .map(([domain, a]) => {
      const avg = mean(a.positions)
      return {
        domain,
        shareOfVoice: pct(a.mentionCount, total),
        avgPosition: avg == null ? 0 : Math.round(avg * 10) / 10,
        mentionCount: a.mentionCount,
        isTarget: domain === target ? true : undefined,
      }
    })
    .sort((a, b) => b.shareOfVoice - a.shareOfVoice || a.domain.localeCompare(b.domain))

  const targetRow = shareOfVoice.find((r) => r.isTarget || r.domain === target)
  const leader = shareOfVoice.find((r) => !r.isTarget && r.domain !== 'other') ?? null
  const gapToLead =
    targetRow && leader ? leader.shareOfVoice - targetRow.shareOfVoice : null

  return {
    shareOfVoice,
    gapToLead,
    leaderDomain: leader?.domain ?? null,
  }
}

export type BuildGeoPresenceInput = {
  targetHost: string
  competitors: string[]
  queries: string[]
  queryRuns: GeoQueryRun[]
  measurement?: GeoMeasurement
}

/** Derive competitive presence from runs — specs/domain/geo-competitive-presence.md */
export function buildGeoPresence(input: BuildGeoPresenceInput): GeoPresence {
  const { rivals, rivalSource } = resolveRivals(
    input.competitors,
    input.queryRuns,
    input.targetHost,
  )
  const solo = buildSolo(input.queryRuns, input.targetHost, input.queries, input.measurement)
  const field = rivals.length >= 1 ? buildField(input.queryRuns, input.targetHost, rivals) : null

  return { solo, field, rivals, rivalSource }
}

/** Convenience: field SoV rows or empty when solo-only. */
export function shareOfVoiceFromPresence(presence: GeoPresence): GeoShareOfVoice[] {
  return presence.field?.shareOfVoice ?? []
}

export function citationDomains(citations: GeoCitation[]): string[] {
  return citations.map((c) => normalizeGeoHost(c.domain)).filter(Boolean)
}
