import type { GeoJobSummary, GeoMeasurement, GeoOverview } from '@checkion-v3/contracts'
import { parseGeoMeasurement } from '../geo/measurement'
import { GEO_OVERVIEWS } from './geo-jobs'
import { isDatabaseConfigured } from '../db/config'
import { OPENAI_MODEL } from '../llm/config'
import { shouldRunLiveGeo } from '../geo-eeat/live-geo-gate'
import { buildQueuedGeoOverview } from '../geo-eeat/finalize-overview'
import { executeLiveGeoPipeline, newGeoJobId } from '../geo-eeat/pipeline'
import { synthesizeFixtureGeoOverview } from '../geo-eeat/synthesize-fixture'
import { normalizeGeoJobTitle } from '../geo-job-title'

export { GEO_JOB_TITLE_MAX, normalizeGeoJobTitle } from '../geo-job-title'

function triggerGeoAutosync(jobId: string): void {
  void import('../knowledge-pack-autosync').then(({ scheduleGeoKnowledgeAutosync }) => {
    scheduleGeoKnowledgeAutosync(jobId)
  })
}

/** GEO store: fixtures by default; live LLM pipeline when `shouldRunLiveGeo()`. */

async function dbApi() {
  return import('../db/geo-jobs')
}

let memoryOverviews: GeoOverview[] = GEO_OVERVIEWS.map((o) => structuredClone(o))

export async function listGeoJobs(options?: {
  projectId?: string
  limit?: number
}): Promise<GeoJobSummary[]> {
  if (isDatabaseConfigured()) return (await dbApi()).dbListGeoJobs(options)
  let jobs = memoryOverviews.map((o) => ({ ...o.job }))
  if (options?.projectId) jobs = jobs.filter((j) => j.projectId === options.projectId)
  if (options?.limit && options.limit > 0) jobs = jobs.slice(0, options.limit)
  return jobs
}

/** Completed + in-progress overviews for a project (memory / DB). */
export async function listGeoOverviewsForProject(projectId: string): Promise<GeoOverview[]> {
  if (isDatabaseConfigured()) {
    const jobs = await (await dbApi()).dbListGeoJobs({ projectId })
    const out: GeoOverview[] = []
    for (const job of jobs) {
      const overview = await (await dbApi()).dbGetGeoOverview(job.id)
      if (overview) out.push(overview)
    }
    return out
  }
  return memoryOverviews
    .filter((o) => o.job.projectId === projectId)
    .map((o) => structuredClone(o))
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
  measurement?: GeoMeasurement
  actorUserId?: string
}): Promise<GeoJobSummary> {
  const jobId = newGeoJobId()
  const models = input.models?.length ? input.models : [OPENAI_MODEL]
  const competitors = input.competitors ?? []
  const queries = input.queries
  const measurement = parseGeoMeasurement(input.measurement)

  if (!shouldRunLiveGeo()) {
    const overview = synthesizeFixtureGeoOverview({
      jobId,
      projectId: input.projectId,
      url: input.url,
      queries,
      models,
      competitors,
      title: input.title,
      measurement,
    })
    memoryUpsert(overview)
    triggerGeoAutosync(jobId)
    void import('../db/geo-jobs').then(({ scheduleSuiteEnterpriseGeoJobComplete }) => {
      scheduleSuiteEnterpriseGeoJobComplete(jobId, input.actorUserId)
    })
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
    measurement,
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
        measurement,
        onStatus: async (status, overview) => {
          memoryUpsert(overview)
          if (status === 'completed') {
            triggerGeoAutosync(jobId)
            void import('../db/geo-jobs').then(({ scheduleSuiteEnterpriseGeoJobComplete }) => {
              scheduleSuiteEnterpriseGeoJobComplete(jobId, input.actorUserId)
            })
          }
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
  measurement?: GeoMeasurement
  actorUserId?: string
}): Promise<GeoJobSummary> {
  if (isDatabaseConfigured()) return (await dbApi()).dbCreateGeoJob(input)
  return memoryCreateGeoJob(input)
}

/** Rename a GEO job; returns updated overview or null if missing / invalid title. */
export async function updateGeoJobTitle(
  id: string,
  rawTitle: unknown,
): Promise<GeoOverview | null> {
  const title = normalizeGeoJobTitle(rawTitle)
  if (!title) return null
  if (isDatabaseConfigured()) return (await dbApi()).dbUpdateGeoJobTitle(id, title)

  const idx = memoryOverviews.findIndex((o) => o.job.id === id)
  if (idx < 0) return null
  const current = memoryOverviews[idx]!
  const next: GeoOverview = {
    ...structuredClone(current),
    job: { ...current.job, title },
  }
  memoryOverviews = [
    ...memoryOverviews.slice(0, idx),
    next,
    ...memoryOverviews.slice(idx + 1),
  ]
  return structuredClone(next)
}

/** Test helper — reset memory corpus to seeded fixtures. */
export function resetGeoStoreForTests(): void {
  memoryOverviews = GEO_OVERVIEWS.map((o) => structuredClone(o))
}
