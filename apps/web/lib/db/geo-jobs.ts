import { desc, eq } from 'drizzle-orm'
import type { GeoJobSummary, GeoOverview } from '@checkion-v3/contracts'
import { getDb } from './client'
import { geoJobs, type GeoJobRow } from './schema'

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
