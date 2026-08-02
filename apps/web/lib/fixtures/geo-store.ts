import type { GeoJobSummary, GeoOverview } from '@checkion-v3/contracts'
import { GEO_OVERVIEWS } from './geo-jobs'
import { isDatabaseConfigured } from '../db/config'
import { OPENAI_MODEL } from '../llm/config'
import { shouldRunLiveGeo } from '../geo-eeat/live-geo-gate'
import { buildQueuedGeoOverview } from '../geo-eeat/finalize-overview'
import { executeLiveGeoPipeline, newGeoJobId } from '../geo-eeat/pipeline'
import { synthesizeFixtureGeoOverview } from '../geo-eeat/synthesize-fixture'

/** GEO store: fixtures by default; live LLM pipeline when `shouldRunLiveGeo()`. */

async function dbApi() {
  return import('../db/geo-jobs')
}

let memoryOverviews: GeoOverview[] = GEO_OVERVIEWS.map((o) => structuredClone(o))

export async function listGeoJobs(): Promise<GeoJobSummary[]> {
  if (isDatabaseConfigured()) return (await dbApi()).dbListGeoJobs()
  return memoryOverviews.map((o) => ({ ...o.job }))
}

export async function getGeoOverview(id: string): Promise<GeoOverview | null> {
  if (isDatabaseConfigured()) return (await dbApi()).dbGetGeoOverview(id)
  const found = memoryOverviews.find((o) => o.job.id === id)
  return found ? structuredClone(found) : null
}

export async function getGeoJob(id: string): Promise<GeoJobSummary | null> {
  if (isDatabaseConfigured()) return (await dbApi()).dbGetGeoJob(id)
  return (await getGeoOverview(id))?.job ?? null
}

function memoryUpsert(overview: GeoOverview): void {
  const idx = memoryOverviews.findIndex((o) => o.job.id === overview.job.id)
  if (idx >= 0) {
    memoryOverviews = [
      ...memoryOverviews.slice(0, idx),
      structuredClone(overview),
      ...memoryOverviews.slice(idx + 1),
    ]
  } else {
    memoryOverviews = [structuredClone(overview), ...memoryOverviews]
  }
}

async function memoryCreateGeoJob(input: {
  projectId: string
  url: string
  queries: string[]
  models?: string[]
  competitors?: string[]
  title?: string
  includePageScan?: boolean
  waitForCompletion?: boolean
}): Promise<GeoJobSummary> {
  const jobId = newGeoJobId()
  const models = input.models?.length ? input.models : [OPENAI_MODEL]
  const competitors = input.competitors ?? []
  const queries = input.queries

  if (!shouldRunLiveGeo()) {
    const overview = synthesizeFixtureGeoOverview({
      jobId,
      projectId: input.projectId,
      url: input.url,
      queries,
      models,
      competitors,
      title: input.title,
    })
    memoryUpsert(overview)
    return overview.job
  }

  const queued = buildQueuedGeoOverview({
    jobId,
    projectId: input.projectId,
    title: input.title,
    url: input.url,
    queries,
    models,
    competitors,
  })
  memoryUpsert(queued)

  const run = async () => {
    try {
      await executeLiveGeoPipeline({
        jobId,
        projectId: input.projectId,
        url: input.url,
        queries,
        models,
        competitors,
        title: input.title,
        includePageScan: input.includePageScan,
        onStatus: async (_status, overview) => {
          memoryUpsert(overview)
        },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'geo_failed'
      console.error('[checkion-v3] memory geo job failed', jobId, message)
      memoryUpsert({
        ...queued,
        job: {
          ...queued.job,
          status: 'failed',
          completedAt: new Date().toISOString(),
        },
        lede: `GEO job failed: ${message}`,
      })
    }
  }

  if (input.waitForCompletion) {
    await run()
    const done = memoryOverviews.find((o) => o.job.id === jobId)
    return done?.job ?? queued.job
  }
  void run()
  return queued.job
}

export async function createGeoJob(input: {
  projectId: string
  url: string
  queries: string[]
  models?: string[]
  competitors?: string[]
  title?: string
  includePageScan?: boolean
  waitForCompletion?: boolean
}): Promise<GeoJobSummary> {
  if (isDatabaseConfigured()) return (await dbApi()).dbCreateGeoJob(input)
  return memoryCreateGeoJob(input)
}

/** Test helper — reset memory corpus to seeded fixtures. */
export function resetGeoStoreForTests(): void {
  memoryOverviews = GEO_OVERVIEWS.map((o) => structuredClone(o))
}
