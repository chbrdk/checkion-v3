import { desc, eq, sql } from 'drizzle-orm'
import type { GeoJobSummary, GeoMeasurement, GeoOverview } from '@checkion-v3/contracts'
import { getDb } from './client'
import { geoJobs, type GeoJobRow } from './schema'
import { OPENAI_MODEL } from '../llm/config'
import { shouldRunLiveGeo } from '../geo-eeat/live-geo-gate'
import { buildQueuedGeoOverview } from '../geo-eeat/finalize-overview'
import { executeLiveGeoPipeline, newGeoJobId } from '../geo-eeat/pipeline'
import { synthesizeFixtureGeoOverview } from '../geo-eeat/synthesize-fixture'
import { parseGeoMeasurement } from '../geo/measurement'

function triggerGeoAutosync(jobId: string): void {
  void import('../knowledge-pack-autosync').then(({ scheduleGeoKnowledgeAutosync }) => {
    scheduleGeoKnowledgeAutosync(jobId)
  })
}

export function scheduleSuiteEnterpriseGeoJobComplete(jobId: string, actorUserId?: string): void {
  void (async () => {
    const { getGeoOverview } = await import('../fixtures/geo-store')
    const overview = await getGeoOverview(jobId)
    if (!overview || overview.job.status !== 'completed') return
    const { getProject } = await import('../fixtures/project-store')
    const { checkionPublicUrl } = await import('../runtime-config')
    const { paths } = await import('../paths')
    const { scheduleSuiteAuditEvent } = await import('../plexon-suite-audit')
    const { scheduleCollectionActivityDistillate } = await import('../plexon-collection-activity')
    const project = await getProject(overview.job.projectId)
    const platformProjectId = project?.platformProjectId?.trim() ?? ''
    if (!platformProjectId || platformProjectId.startsWith('plx-local-')) return
    const href = `${checkionPublicUrl().replace(/\/$/, '')}${paths.routes.geoDetail(jobId)}`
    scheduleCollectionActivityDistillate({
      platformProjectId,
      productId: 'checkion',
      kind: 'geo_job',
      status: 'completed',
      subjectRef: jobId,
      title: overview.job.title || `GEO ${overview.targetHost || overview.job.url}`,
      href,
      at: overview.job.completedAt ?? undefined,
      actorUserId,
    })
    if (actorUserId?.trim()) {
      scheduleSuiteAuditEvent({
        platformProjectId,
        productId: 'checkion',
        action: 'run_finished',
        actorUserId,
        subjectRef: jobId,
        meta: { kind: 'geo_job', url: overview.job.url },
      })
    }
  })().catch(() => undefined)
}

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
    measurement: overview.job.measurement,
    searchMarket: overview.job.searchMarket,
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

export async function dbListGeoJobs(options?: {
  projectId?: string
  limit?: number
}): Promise<GeoJobSummary[]> {
  const db = getDb()
  const limit = options?.limit && options.limit > 0 ? options.limit : undefined
  // Hub lists need job cards, not full GEO overview JSON.
  const base = db
    .select({
      id: geoJobs.id,
      title: geoJobs.title,
      projectId: geoJobs.projectId,
      url: geoJobs.url,
      status: geoJobs.status,
      overallScore: geoJobs.overallScore,
      completedAt: geoJobs.completedAt,
      queryCount: geoJobs.queryCount,
      modelCount: geoJobs.modelCount,
      citedShare: geoJobs.citedShare,
      measurement: sql<string | null>`${geoJobs.payload}->'overview'->'job'->>'measurement'`,
      searchMarket: sql<string | null>`${geoJobs.payload}->'overview'->'job'->>'searchMarket'`,
    })
    .from(geoJobs)
    .orderBy(desc(geoJobs.createdAt))
  const rows = options?.projectId
    ? await (limit
        ? base.where(eq(geoJobs.projectId, options.projectId)).limit(limit)
        : base.where(eq(geoJobs.projectId, options.projectId)))
    : await (limit ? base.limit(limit) : base)
  return rows.map((row) => ({
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
    measurement: parseGeoMeasurement(row.measurement ?? undefined),
    searchMarket: row.searchMarket?.trim() || undefined,
  }))
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
    await dbUpsertGeoOverview(overview)
    triggerGeoAutosync(jobId)
    scheduleSuiteEnterpriseGeoJobComplete(jobId, input.actorUserId)
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
        measurement,
        onStatus: async (status, overview) => {
          await dbUpsertGeoOverview(overview)
          if (status === 'completed') {
            triggerGeoAutosync(jobId)
            scheduleSuiteEnterpriseGeoJobComplete(jobId, input.actorUserId)
          }
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

export async function dbUpdateGeoJobTitle(
  id: string,
  title: string,
): Promise<GeoOverview | null> {
  const overview = await dbGetGeoOverview(id)
  if (!overview) return null
  const next: GeoOverview = {
    ...overview,
    job: { ...overview.job, title },
  }
  await dbUpsertGeoOverview(next)
  return dbGetGeoOverview(id)
}
