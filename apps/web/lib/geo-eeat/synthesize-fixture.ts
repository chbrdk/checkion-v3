/**
 * Synthesize a completed GeoOverview when live GEO is off (no OpenAI).
 */

import type { GeoOverview } from '@checkion-v3/contracts'
import { OPENAI_MODEL } from '../llm/config'
import { GEO_OVERVIEWS } from '../fixtures/geo-jobs'
import { normalizeGeoHost } from '../geo-presence'
import {
  buildPositionMatrix,
  finalizeGeoOverview,
  type GeoOverviewDraft,
} from './finalize-overview'

export function synthesizeFixtureGeoOverview(input: {
  jobId: string
  projectId: string
  url: string
  queries: string[]
  models: string[]
  competitors: string[]
  title?: string
}): GeoOverview {
  const template = GEO_OVERVIEWS[0]
  const targetHost = normalizeGeoHost(input.url)
  const models = input.models.length > 0 ? input.models : [OPENAI_MODEL]
  const queries =
    input.queries.length > 0 ? input.queries : (template?.queries ?? ['best vendors'])
  const competitors =
    input.competitors.length > 0
      ? input.competitors.map(normalizeGeoHost)
      : (template?.competitors ?? [])

  const templateRuns =
    template?.queryRuns
      .filter((r) => queries.includes(r.query))
      .map((r) => ({
        ...r,
        modelId: models.includes(r.modelId) ? r.modelId : models[0]!,
      })) ?? []

  const runs =
    templateRuns.length > 0
      ? templateRuns
      : queries.flatMap((query, qi) =>
          models.map((modelId) => ({
            queryId: `q-${qi}`,
            query,
            modelId,
            answerText: `Fixture answer for “${query}” (live GEO off).`,
            citations: [{ domain: targetHost, position: 1, context: 'fixture' }],
            ourPosition: 1 as number | null,
          })),
        )

  const draft: GeoOverviewDraft = {
    job: {
      id: input.jobId,
      title: input.title?.trim() || `GEO — ${targetHost || input.url}`,
      projectId: input.projectId,
      url: input.url,
      status: 'completed',
      overallScore: template?.eeat?.geoFitness ?? 50,
      completedAt: new Date().toISOString(),
      queryCount: queries.length,
      modelCount: models.length,
      citedShare: 0,
    },
    lede: `Synthesized GEO fixture for ${targetHost || input.url} (live GEO off).`,
    targetHost,
    ...(template?.eeat ? { eeat: { ...template.eeat } } : {}),
    models,
    queries,
    competitors,
    positionMatrix: buildPositionMatrix(queries, models, runs),
    queryRuns: runs,
  }
  return finalizeGeoOverview(draft)
}
