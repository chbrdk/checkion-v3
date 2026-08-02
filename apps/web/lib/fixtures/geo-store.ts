import type { GeoJobSummary, GeoOverview } from '@checkion-v3/contracts'
import { GEO_OVERVIEWS } from './geo-jobs'
import { isDatabaseConfigured } from '../db/config'

/** Fixture-backed GEO store. Live LLM job create / worker pipeline is deferred — see knowledge/dummy-data-mode.md. */

async function dbApi() {
  return import('../db/geo-jobs')
}

export async function listGeoJobs(): Promise<GeoJobSummary[]> {
  if (isDatabaseConfigured()) return (await dbApi()).dbListGeoJobs()
  return GEO_OVERVIEWS.map((o) => ({ ...o.job }))
}

export async function getGeoOverview(id: string): Promise<GeoOverview | null> {
  if (isDatabaseConfigured()) return (await dbApi()).dbGetGeoOverview(id)
  const found = GEO_OVERVIEWS.find((o) => o.job.id === id)
  return found ? structuredClone(found) : null
}

export async function getGeoJob(id: string): Promise<GeoJobSummary | null> {
  if (isDatabaseConfigured()) return (await dbApi()).dbGetGeoJob(id)
  return (await getGeoOverview(id))?.job ?? null
}

// TODO(geo-live): createGeoJob({ targetUrl, queries, models, competitors? }) → enqueue queryRuns → finalize via buildGeoPresence + buildGeoInsights.
