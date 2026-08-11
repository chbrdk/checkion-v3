import type { GeoOverview } from '@checkion-v3/contracts'
import { modelsForLaunch } from './geo/model-catalog'

/** Body for POST /api/geo-jobs when re-running from an existing overview. */
export type GeoRerunPayload = {
  projectId: string
  url: string
  queries: string[]
  models: string[]
  competitors: string[]
  title?: string
}

/**
 * Clone launch inputs from a GEO overview for an honest re-run (new job id).
 * Filters models to live-supported ids (same gate as /scan launch).
 */
export function buildGeoRerunPayload(overview: GeoOverview): GeoRerunPayload | null {
  const url = overview.job.url?.trim()
  const projectId = overview.job.projectId?.trim()
  const queries = overview.queries.map((q) => q.trim()).filter(Boolean)
  if (!url || !projectId || queries.length === 0) return null

  const models = modelsForLaunch(overview.models)
  const competitors = overview.competitors.map((c) => c.trim()).filter(Boolean)
  const title = overview.job.title?.trim()

  return {
    projectId,
    url,
    queries,
    models,
    competitors,
    ...(title ? { title } : {}),
  }
}
