/**
 * Soft-match GEO citation position history — specs/domain/geo-position-history.md
 */

import type {
  GeoHistoryPoint,
  GeoHistoryTrend,
  GeoMeasurement,
  GeoOverview,
  GeoPositionHistoryResult,
  GeoQuestionHistorySeries,
} from '@checkion-v3/contracts'
import { geoJobMeasurement } from './measurement'

export const GEO_HISTORY_JOB_LIMIT_DEFAULT = 30
export const GEO_HISTORY_JOB_LIMIT_MAX = 50

/** Unicode NFC → trim → collapse whitespace → casefold. */
export function normalizeGeoQueryKey(raw: string): string {
  return raw
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('en')
}

export function avgPositionFromModels(
  positionsByModel: Record<string, number | null>,
): number | null {
  const vals = Object.values(positionsByModel).filter(
    (p): p is number => typeof p === 'number' && p > 0,
  )
  if (vals.length === 0) return null
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
}

export function computeGeoHistoryTrend(
  points: Array<{ avgPosition: number | null }>,
): GeoHistoryTrend {
  const valid = points.filter((p): p is { avgPosition: number } => p.avgPosition != null)
  if (valid.length < 2) return 'unknown'
  const first = valid[0]!.avgPosition
  const last = valid[valid.length - 1]!.avgPosition
  const delta = last - first
  if (delta <= -0.5) return 'improving'
  if (delta >= 0.5) return 'declining'
  return 'stable'
}

export function clampGeoHistoryJobLimit(raw: unknown): number {
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : typeof raw === 'number' ? raw : NaN
  if (!Number.isFinite(n) || n < 1) return GEO_HISTORY_JOB_LIMIT_DEFAULT
  return Math.min(Math.floor(n), GEO_HISTORY_JOB_LIMIT_MAX)
}

function recordedAtFor(overview: GeoOverview): string {
  return overview.job.completedAt ?? overview.job.id
}

function pointFromOverview(overview: GeoOverview, queryText: string): GeoHistoryPoint | null {
  const runs = overview.queryRuns.filter((r) => normalizeGeoQueryKey(r.query) === normalizeGeoQueryKey(queryText))
  if (runs.length === 0) {
    const row = overview.positionMatrix.find(
      (r) => normalizeGeoQueryKey(r.queryText) === normalizeGeoQueryKey(queryText),
    )
    if (!row) return null
    const positionsByModel: Record<string, number | null> = {}
    for (const [modelId, pos] of Object.entries(row.positions)) {
      positionsByModel[modelId] = pos > 0 ? pos : null
    }
    return {
      recordedAt: recordedAtFor(overview),
      jobId: overview.job.id,
      positionsByModel,
      avgPosition: avgPositionFromModels(positionsByModel),
    }
  }

  const positionsByModel: Record<string, number | null> = {}
  for (const run of runs) {
    positionsByModel[run.modelId] =
      run.ourPosition != null && run.ourPosition > 0 ? run.ourPosition : null
  }
  return {
    recordedAt: recordedAtFor(overview),
    jobId: overview.job.id,
    positionsByModel,
    avgPosition: avgPositionFromModels(positionsByModel),
  }
}

/**
 * Build soft-match history from completed overviews (already filtered by project).
 * Caller supplies overviews newest-first or unordered; points are sorted chronologically.
 */
export function buildGeoPositionHistory(input: {
  projectId: string
  measurement: GeoMeasurement
  overviews: GeoOverview[]
  limit?: number
}): GeoPositionHistoryResult {
  const limit = clampGeoHistoryJobLimit(input.limit ?? GEO_HISTORY_JOB_LIMIT_DEFAULT)
  const completed = input.overviews
    .filter((o) => o.job.status === 'completed')
    .filter((o) => geoJobMeasurement(o.job) === input.measurement)
    .filter((o) => o.job.projectId === input.projectId)
    .sort((a, b) => {
      const ta = new Date(recordedAtFor(a)).getTime()
      const tb = new Date(recordedAtFor(b)).getTime()
      return tb - ta
    })
    .slice(0, limit)

  const byKey = new Map<
    string,
    { queryText: string; queryKey: string; points: GeoHistoryPoint[] }
  >()

  // Chronological accumulation: walk oldest → newest within the capped set
  const chronological = [...completed].sort(
    (a, b) => new Date(recordedAtFor(a)).getTime() - new Date(recordedAtFor(b)).getTime(),
  )

  let targetHost = ''
  const modelIds = new Set<string>()

  for (const overview of chronological) {
    if (!targetHost) targetHost = overview.targetHost
    for (const m of overview.models) modelIds.add(m)
    const seenKeys = new Set<string>()
    for (const q of overview.queries) {
      const queryKey = normalizeGeoQueryKey(q)
      if (!queryKey || seenKeys.has(queryKey)) continue
      seenKeys.add(queryKey)
      const point = pointFromOverview(overview, q)
      if (!point) continue
      let item = byKey.get(queryKey)
      if (!item) {
        item = { queryText: q.trim(), queryKey, points: [] }
        byKey.set(queryKey, item)
      }
      item.points.push(point)
      for (const mid of Object.keys(point.positionsByModel)) modelIds.add(mid)
    }
  }

  const items: GeoQuestionHistorySeries[] = Array.from(byKey.values()).map((q) => {
    const points = [...q.points].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    )
    const latest = points.length ? points[points.length - 1]!.avgPosition : null
    return {
      queryText: q.queryText,
      queryKey: q.queryKey,
      points,
      latestPosition: latest,
      trend: computeGeoHistoryTrend(points),
    }
  })

  items.sort((a, b) => a.queryText.localeCompare(b.queryText, 'en'))

  return {
    projectId: input.projectId,
    measurement: input.measurement,
    targetHost,
    modelIds: Array.from(modelIds).sort(),
    items,
  }
}

/** Magazine teaser: series for this job’s queries with ≥2 comparable points. */
export function geoHistoryTeaserSeries(
  history: GeoPositionHistoryResult,
  jobQueryTexts: string[],
): GeoQuestionHistorySeries[] {
  const keys = new Set(jobQueryTexts.map(normalizeGeoQueryKey).filter(Boolean))
  return history.items.filter(
    (item) => keys.has(item.queryKey) && item.points.length >= 2,
  )
}
