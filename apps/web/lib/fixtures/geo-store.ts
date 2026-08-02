import type { GeoJobSummary, GeoOverview } from '@checkion-v3/contracts'
import { GEO_OVERVIEWS } from './geo-jobs'

/** Fixture-backed GEO store. Live LLM job create / worker pipeline is deferred — see knowledge/dummy-data-mode.md. */

export function listGeoJobs(): GeoJobSummary[] {
  return GEO_OVERVIEWS.map((o) => ({ ...o.job }))
}

export function getGeoOverview(id: string): GeoOverview | null {
  const found = GEO_OVERVIEWS.find((o) => o.job.id === id)
  return found ? structuredClone(found) : null
}

export function getGeoJob(id: string): GeoJobSummary | null {
  return getGeoOverview(id)?.job ?? null
}

// TODO(geo-live): createGeoJob({ targetUrl, queries, models, competitors? }) → enqueue queryRuns → finalize via buildGeoPresence + buildGeoInsights.
