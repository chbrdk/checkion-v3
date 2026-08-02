import { desc, eq } from 'drizzle-orm'
import type { GeoJobSummary, GeoOverview } from '@checkion-v3/contracts'
import { getDb } from './client'
import { geoJobs, type GeoJobRow } from './schema'
import { OPENAI_MODEL } from '../llm/config'
import { shouldRunLiveGeo } from '../geo-eeat/live-geo-gate'
import { buildQueuedGeoOverview } from '../geo-eeat/finalize-overview'
import { executeLiveGeoPipeline, newGeoJobId } from '../geo-eeat/pipeline'
import { synthesizeFixtureGeoOverview } from '../geo-eeat/synthesize-fixture'

function rowToOverview(row: GeoJobRow): GeoOverview {
  const overview = structuredClone(row.payload.overview)
  overview.job = {
    id: row.id,
    title: row.title,
    projectId: row.projectId,
    url: row.url,
    status: row.status as GeoJobSummary['status'],
    overallScore: row.overallScore,
    completedAt: row.completedAt,
    queryCount: row.queryCount,
    modelCount: row.modelCount,
    citedShare: row.citedShare,
  }
  return overview
}

function overviewColumns(overview: GeoOverview) {
  return {
    title: overview.job.title,
    url: overview.job.url,
    status: overview.job.status,
    overallScore: overview.job.overallScore,
    completedAt: overview.job.completedAt,
    queryCount: overview.job.queryCount,
    modelCount: overview.job.modelCount,
    citedShare: overview.job.citedShare,
    payload: { overview },
    updatedAt: new Date(),
  }
}

export async function dbListGeoJobs(): Promise<GeoJobSummary[]> {
  const db = getDb()
  const rows = await db.select().from(geoJobs).orderBy(desc(geoJobs.createdAt))
  return rows.map((row) => rowToOverview(row).job)
}

export async function dbGetGeoOverview(id: string): Promise<GeoOverview | null> {
  const db = getDb()
  const rows = await db.select().from(geoJobs).where(eq(geoJobs.id, id)).limit(1)
  const row = rows[0]
  return row ? rowToOverview(row) : null
}

export async function dbGetGeoJob(id: string): Promise<GeoJobSummary | null> {
  const overview = await dbGetGeoOverview(id)
  return overview?.job ?? null
}

export async function dbUpsertGeoOverview(overview: GeoOverview): Promise<void> {
  const db = getDb()
  const now = new Date()
  const cols = overviewColumns(overview)
  const existing = await db
    .select({ id: geoJobs.id })
    .from(geoJobs)
    .where(eq(geoJobs.id, overview.job.id))
    .limit(1)
  if (existing[0]) {
    await db.update(geoJobs).set(cols).where(eq(geoJobs.id, overview.job.id))
    return
  }
  await db.insert(geoJobs).values({
    id: overview.job.id,
    projectId: overview.job.projectId,
    ...cols,
    createdAt: now,
  })
}

export async function dbCreateGeoJob(input: {
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
    await dbUpsertGeoOverview(overview)
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
  await dbUpsertGeoOverview(queued)

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
          await dbUpsertGeoOverview(overview)
        },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'geo_failed'
      console.error('[checkion-v3] db geo job failed', jobId, message)
      const failed: GeoOverview = {
        ...queued,
        job: {
          ...queued.job,
          status: 'failed',
          completedAt: new Date().toISOString(),
        },
        lede: `GEO job failed: ${message}`,
      }
      await dbUpsertGeoOverview(failed)
    }
  }

  if (input.waitForCompletion) {
    await run()
    const done = await dbGetGeoOverview(jobId)
    return done?.job ?? queued.job
  }
  void run()
  return queued.job
}
