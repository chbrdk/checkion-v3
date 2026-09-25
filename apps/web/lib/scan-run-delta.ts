/**
 * Pure Gegentest / run-delta helpers — specs/domain/scan-run-delta.md (Wave E3).
 */

import type {
  GeoEeatScores,
  GeoMeasurement,
  GeoRecommendation,
  IssueSummary,
  ScanRunDeltaFindingRef,
  ScanRunDeltaKind,
  ScanRunDeltaResult,
  ScanRunDeltaScore,
  ScanRunDeltaScoreKind,
  ScoreCard,
  ScoreKind,
} from '@checkion-v3/contracts'

export type ScanRunDeltaIssueLike = Pick<
  IssueSummary,
  'ruleId' | 'title' | 'severity' | 'section'
>

export type ScanRunDeltaScoreLike = {
  kind: ScanRunDeltaScoreKind
  value: number
  max?: number
}

export type ScanRunBaselineCandidate = {
  id: string
  projectId: string
  /** Normalized URL set (already passed through normalizeScanRunUrl). */
  urlSet: string[]
  status: string
  completedAt: string | null
  startedAt: string
  measurement?: GeoMeasurement
}

/** Unicode NFC → trim → strip hash → drop trailing slash → lowercase host. */
export function normalizeScanRunUrl(raw: string): string {
  const trimmed = raw.normalize('NFC').trim()
  if (!trimmed) return ''
  try {
    const u = new URL(trimmed)
    u.hash = ''
    u.hostname = u.hostname.toLowerCase()
    if (
      (u.protocol === 'http:' && u.port === '80') ||
      (u.protocol === 'https:' && u.port === '443')
    ) {
      u.port = ''
    }
    let path = u.pathname
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
    const pathPart = path === '/' ? '' : path
    return `${u.protocol}//${u.host}${pathPart}${u.search}`
  } catch {
    return trimmed.replace(/\/+$/, '').toLowerCase()
  }
}

export function normalizeScanRunUrlSet(urls: readonly string[]): string[] {
  const set = new Set<string>()
  for (const raw of urls) {
    const n = normalizeScanRunUrl(raw)
    if (n) set.add(n)
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

export function urlSetsEqual(a: readonly string[], b: readonly string[]): boolean {
  const left = normalizeScanRunUrlSet(a)
  const right = normalizeScanRunUrlSet(b)
  if (left.length !== right.length) return false
  return left.every((u, i) => u === right[i])
}

export function findingKeyForIssue(issue: ScanRunDeltaIssueLike): string {
  return `${issue.section}::${issue.ruleId}`
}

export function findingKeyForGeoRecommendation(rec: Pick<GeoRecommendation, 'id'>): string {
  return `rec::${rec.id}`
}

export function findingRefFromIssue(issue: ScanRunDeltaIssueLike): ScanRunDeltaFindingRef {
  return {
    key: findingKeyForIssue(issue),
    ruleId: issue.ruleId,
    title: issue.title,
    severity: issue.severity,
    section: issue.section,
  }
}

export function findingRefFromGeoRecommendation(
  rec: GeoRecommendation,
): ScanRunDeltaFindingRef {
  return {
    key: findingKeyForGeoRecommendation(rec),
    ruleId: rec.id,
    title: rec.title,
    severity: rec.severity,
  }
}

function scoreMap(
  scores: readonly ScanRunDeltaScoreLike[],
): Map<ScanRunDeltaScoreKind, ScanRunDeltaScoreLike> {
  const map = new Map<ScanRunDeltaScoreKind, ScanRunDeltaScoreLike>()
  for (const s of scores) map.set(s.kind, s)
  return map
}

export function computeScoreDeltas(
  current: readonly ScanRunDeltaScoreLike[],
  previous: readonly ScanRunDeltaScoreLike[],
): ScanRunDeltaScore[] {
  const cur = scoreMap(current)
  const prev = scoreMap(previous)
  const kinds = new Set<ScanRunDeltaScoreKind>([...cur.keys(), ...prev.keys()])
  const ordered = [...kinds].sort((a, b) => a.localeCompare(b))
  return ordered.map((kind) => {
    const c = cur.get(kind)
    const p = prev.get(kind)
    const currentValue = c != null && Number.isFinite(c.value) ? c.value : null
    const previousValue = p != null && Number.isFinite(p.value) ? p.value : null
    const delta =
      currentValue != null && previousValue != null
        ? Math.round((currentValue - previousValue) * 10) / 10
        : null
    const max = c?.max ?? p?.max
    return {
      kind,
      current: currentValue,
      previous: previousValue,
      delta,
      ...(max != null ? { max } : {}),
    }
  })
}

export function computeFindingDelta(
  current: readonly ScanRunDeltaFindingRef[],
  previous: readonly ScanRunDeltaFindingRef[],
): ScanRunDeltaResult['findings'] {
  const cur = new Map(current.map((f) => [f.key, f]))
  const prev = new Map(previous.map((f) => [f.key, f]))
  const newFindings: ScanRunDeltaFindingRef[] = []
  const gone: ScanRunDeltaFindingRef[] = []
  const same: ScanRunDeltaFindingRef[] = []

  for (const [key, ref] of cur) {
    if (prev.has(key)) same.push(ref)
    else newFindings.push(ref)
  }
  for (const [key, ref] of prev) {
    if (!cur.has(key)) gone.push(ref)
  }

  const byKey = (a: ScanRunDeltaFindingRef, b: ScanRunDeltaFindingRef) =>
    a.key.localeCompare(b.key)
  return {
    new: newFindings.sort(byKey),
    gone: gone.sort(byKey),
    same: same.sort(byKey),
  }
}

export function scoreCardsToDeltaInput(scores: readonly ScoreCard[]): ScanRunDeltaScoreLike[] {
  return scores.map((s) => ({ kind: s.kind as ScoreKind, value: s.value, max: s.max }))
}

export function issuesToFindingRefs(
  issues: readonly ScanRunDeltaIssueLike[],
): ScanRunDeltaFindingRef[] {
  const map = new Map<string, ScanRunDeltaFindingRef>()
  for (const issue of issues) {
    const ref = findingRefFromIssue(issue)
    if (!map.has(ref.key)) map.set(ref.key, ref)
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}

export function geoRecommendationsToFindingRefs(
  recs: readonly GeoRecommendation[],
): ScanRunDeltaFindingRef[] {
  return recs
    .map(findingRefFromGeoRecommendation)
    .sort((a, b) => a.key.localeCompare(b.key))
}

export function geoScoresToDeltaInput(input: {
  citedShare: number
  eeat?: GeoEeatScores | null
}): ScanRunDeltaScoreLike[] {
  const out: ScanRunDeltaScoreLike[] = [
    { kind: 'cited_share', value: input.citedShare, max: 100 },
  ]
  if (input.eeat) {
    out.push(
      { kind: 'eeat_experience', value: input.eeat.experience, max: 100 },
      { kind: 'eeat_expertise', value: input.eeat.expertise, max: 100 },
      { kind: 'eeat_authoritativeness', value: input.eeat.authoritativeness, max: 100 },
      { kind: 'eeat_trustworthiness', value: input.eeat.trustworthiness, max: 100 },
      { kind: 'eeat_geo_fitness', value: input.eeat.geoFitness, max: 100 },
    )
  }
  return out
}

/**
 * Compare two run snapshots (findings + scores). Ids / kind / urlSet are supplied by the caller.
 */
export function computeScanRunDelta(input: {
  kind: ScanRunDeltaKind
  currentId: string
  previousId: string
  urlSet: string[]
  currentFindings: readonly ScanRunDeltaFindingRef[]
  previousFindings: readonly ScanRunDeltaFindingRef[]
  currentScores: readonly ScanRunDeltaScoreLike[]
  previousScores: readonly ScanRunDeltaScoreLike[]
  measurement?: GeoMeasurement
}): ScanRunDeltaResult {
  return {
    kind: input.kind,
    currentId: input.currentId,
    previousId: input.previousId,
    urlSet: normalizeScanRunUrlSet(input.urlSet),
    findings: computeFindingDelta(input.currentFindings, input.previousFindings),
    scores: computeScoreDeltas(input.currentScores, input.previousScores),
    ...(input.measurement ? { measurement: input.measurement } : {}),
  }
}

function runInstant(c: ScanRunBaselineCandidate): string {
  return c.completedAt ?? c.startedAt
}

/**
 * Newest completed prior run with the same project + URL set (+ measurement for GEO).
 * Returns null → caller maps to named error `no_baseline`.
 */
export function findPreviousRunBaseline(
  candidates: readonly ScanRunBaselineCandidate[],
  current: ScanRunBaselineCandidate,
): ScanRunBaselineCandidate | null {
  const currentInstant = runInstant(current)
  const eligible = candidates.filter((c) => {
    if (c.id === current.id) return false
    if (c.projectId !== current.projectId) return false
    if (c.status !== 'completed') return false
    if (!c.completedAt) return false
    if (!urlSetsEqual(c.urlSet, current.urlSet)) return false
    if (current.measurement != null || c.measurement != null) {
      if ((c.measurement ?? 'recall') !== (current.measurement ?? 'recall')) return false
    }
    return runInstant(c) < currentInstant
  })
  if (eligible.length === 0) return null
  return eligible.sort((a, b) => runInstant(b).localeCompare(runInstant(a)))[0]!
}
