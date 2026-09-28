/**
 * Lightweight per-project activity columns for hub cards (Postgres).
 * Avoids hydrating full scan / GEO overview payloads.
 */
import { sql } from 'drizzle-orm'
import { getDb } from './client'
import { domainScans, geoJobs, scans, seoRankConfigs } from './schema'
import type { ProjectActivityInput } from '../project-activity'

function asIso(value: string | Date | null | undefined): string | null {
  if (value == null) return null
  if (typeof value === 'string') return value.trim() || null
  return value.toISOString()
}

/**
 * Build activity input from id + project + timestamp columns only.
 */
export async function dbLoadProjectActivityInput(): Promise<ProjectActivityInput> {
  const db = getDb()

  const [scanRows, domainRows, geoRows, seoRows] = await Promise.all([
    db
      .select({
        id: scans.id,
        projectId: scans.projectId,
        completedAt: scans.completedAt,
        startedAt: scans.startedAt,
        domainScanId: sql<string | null>`${scans.payload}->'scan'->>'domainScanId'`,
      })
      .from(scans),
    db
      .select({
        id: domainScans.id,
        projectId: domainScans.projectId,
        completedAt: domainScans.completedAt,
        startedAt: domainScans.startedAt,
      })
      .from(domainScans),
    db
      .select({
        id: geoJobs.id,
        projectId: geoJobs.projectId,
        completedAt: geoJobs.completedAt,
      })
      .from(geoJobs),
    db
      .select({
        id: seoRankConfigs.id,
        projectId: seoRankConfigs.projectId,
        lastCheckedAt: seoRankConfigs.lastCheckedAt,
        updatedAt: seoRankConfigs.updatedAt,
      })
      .from(seoRankConfigs),
  ])

  return {
    scans: scanRows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      domainScanId: r.domainScanId?.trim() || undefined,
      completedAt: r.completedAt,
      startedAt: r.startedAt,
    })),
    domains: domainRows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      completedAt: r.completedAt,
      startedAt: r.startedAt,
    })),
    geoJobs: geoRows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      completedAt: r.completedAt,
    })),
    seo: seoRows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      lastAt: asIso(r.lastCheckedAt) ?? asIso(r.updatedAt),
    })),
  }
}
