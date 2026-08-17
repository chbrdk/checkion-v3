/**
 * Map live GEO pipeline outputs into GeoOverview (same finalize path as fixtures).
 */

import type {
  GeoEeatScores,
  GeoMeasurement,
  GeoOverview,
  GeoPositionRow,
  GeoQueryRun,
  GeoRecommendation,
} from '@checkion-v3/contracts'
import { geoMeasurementLede, parseGeoMeasurement } from '../geo/measurement'
import { buildEeatGapMoves, buildGeoInsights, mergeRecommendations } from '../geo-insights'
import { buildGeoPresence, normalizeGeoHost, shareOfVoiceFromPresence } from '../geo-presence'
import type { GeoEeatIntensiveResult } from '../scan/types'

export type GeoOverviewDraft = Omit<
  GeoOverview,
  'presence' | 'shareOfVoice' | 'insights' | 'recommendations'
> & {
  recommendations?: GeoRecommendation[]
}

/** Mirror fixture `finalize()` — derive presence + insights from queryRuns. */
export function finalizeGeoOverview(draft: GeoOverviewDraft): GeoOverview {
  const { recommendations: extraRecs = [], ...rest } = draft
  const presence = buildGeoPresence({
    targetHost: rest.targetHost,
    competitors: rest.competitors,
    queries: rest.queries,
    queryRuns: rest.queryRuns,
  })
  const shareOfVoice = shareOfVoiceFromPresence(presence)
  const insights = buildGeoInsights({
    targetHost: rest.targetHost,
    queries: rest.queries,
    queryRuns: rest.queryRuns,
    rivals: presence.rivals,
    shareOfVoice,
    solo: presence.solo,
  })
  return {
    ...rest,
    recommendations: mergeRecommendations(insights.moves, extraRecs),
    presence,
    shareOfVoice,
    insights,
    job: {
      ...rest.job,
      citedShare: presence.solo.citedShare,
    },
  }
}

function score1to5AsPercent(score: number | undefined): number {
  if (score == null || !Number.isFinite(score)) return 0
  return Math.round((Math.max(1, Math.min(5, score)) / 5) * 100)
}

export function eeatScoresFromIntensive(
  payload: GeoEeatIntensiveResult | null | undefined,
): GeoEeatScores | undefined {
  const page = payload?.pages?.[0]
  if (!page?.eeatScores && page?.geoFitnessScore == null) return undefined
  const e = page.eeatScores
  const missing =
    page.missingGeoElements?.map((x) => String(x).trim()).filter(Boolean) ?? []
  return {
    experience: score1to5AsPercent(e?.experience.score),
    expertise: score1to5AsPercent(e?.expertise.score),
    authoritativeness: score1to5AsPercent(e?.authoritativeness?.score ?? e?.expertise.score),
    trustworthiness: score1to5AsPercent(e?.trust.score),
    geoFitness:
      typeof page.geoFitnessScore === 'number'
        ? Math.max(0, Math.min(100, Math.round(page.geoFitnessScore)))
        : 0,
    experienceReasoning: e?.experience.reasoning?.trim() || undefined,
    expertiseReasoning: e?.expertise.reasoning?.trim() || undefined,
    authoritativenessReasoning:
      e?.authoritativeness?.reasoning?.trim() || e?.expertise.reasoning?.trim() || undefined,
    trustworthinessReasoning: e?.trust.reasoning?.trim() || undefined,
    geoFitnessReasoning: page.geoFitnessReasoning?.trim() || undefined,
    missingElements: missing.length ? missing : undefined,
  }
}

export function buildPositionMatrix(
  queries: string[],
  models: string[],
  queryRuns: GeoQueryRun[],
): GeoPositionRow[] {
  return queries.map((queryText, queryIndex) => {
    const positions: Record<string, number> = {}
    for (const modelId of models) {
      const run = queryRuns.find((r) => r.query === queryText && r.modelId === modelId)
      positions[modelId] =
        run?.ourPosition != null && run.ourPosition > 0 ? run.ourPosition : 0
    }
    const label =
      queryText.length > 48 ? `${queryText.slice(0, 45).trimEnd()}…` : queryText
    return {
      queryIndex,
      queryLabel: label,
      queryText,
      positions,
    }
  })
}

export function buildLiveGeoOverview(input: {
  jobId: string
  projectId: string
  title?: string
  url: string
  queries: string[]
  models: string[]
  competitors: string[]
  queryRuns: GeoQueryRun[]
  eeatPayload?: GeoEeatIntensiveResult | null
  completedAt?: string
  measurement?: GeoMeasurement
}): GeoOverview {
  const targetHost = normalizeGeoHost(input.url)
  const models = input.models.length > 0 ? input.models : ['gpt-5.4-nano']
  const eeat = eeatScoresFromIntensive(input.eeatPayload)
  const completedAt = input.completedAt ?? new Date().toISOString()
  const measurement = parseGeoMeasurement(input.measurement)
  const title =
    input.title?.trim() ||
    `GEO — ${targetHost || input.url}`

  const eeatGapMoves = buildEeatGapMoves({
    missingElements: eeat?.missingElements,
    targetHost: targetHost || input.url,
  })

  const draft: GeoOverviewDraft = {
    job: {
      id: input.jobId,
      title,
      projectId: input.projectId,
      url: input.url,
      status: 'completed',
      overallScore: eeat?.geoFitness ?? null,
      completedAt,
      queryCount: input.queries.length,
      modelCount: models.length,
      citedShare: 0,
      measurement,
    },
    lede: geoMeasurementLede(measurement, targetHost || input.url, 'completed', {
      queries: input.queries.length,
      models: models.length,
    }),
    targetHost,
    ...(eeat ? { eeat } : {}),
    models,
    queries: input.queries,
    competitors: input.competitors.map(normalizeGeoHost).filter(Boolean),
    positionMatrix: buildPositionMatrix(input.queries, models, input.queryRuns),
    queryRuns: input.queryRuns,
    recommendations: eeatGapMoves,
  }

  return finalizeGeoOverview(draft)
}

/** Empty queued overview shell while the pipeline runs. */
export function buildQueuedGeoOverview(input: {
  jobId: string
  projectId: string
  title?: string
  url: string
  queries: string[]
  models: string[]
  competitors: string[]
  measurement?: GeoMeasurement
}): GeoOverview {
  const targetHost = normalizeGeoHost(input.url)
  const models = input.models.length > 0 ? input.models : ['gpt-5.4-nano']
  const measurement = parseGeoMeasurement(input.measurement)
  const draft: GeoOverviewDraft = {
    job: {
      id: input.jobId,
      title: input.title?.trim() || `GEO — ${targetHost || input.url}`,
      projectId: input.projectId,
      url: input.url,
      status: 'queued',
      overallScore: null,
      completedAt: null,
      queryCount: input.queries.length,
      modelCount: models.length,
      citedShare: 0,
      measurement,
    },
    lede: geoMeasurementLede(measurement, targetHost || input.url, 'queued'),
    targetHost,
    models,
    queries: input.queries,
    competitors: input.competitors.map(normalizeGeoHost).filter(Boolean),
    positionMatrix: buildPositionMatrix(input.queries, models, []),
    queryRuns: [],
  }
  return finalizeGeoOverview(draft)
}
