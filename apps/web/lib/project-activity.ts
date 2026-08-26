/**
 * Project hub / summary activity metrics.
 * `scanCount` = standalone singles + deep domain jobs + GEO jobs (no deep page-scan double-count).
 */
import type {
  DomainScanLight,
  GeoJobSummary,
  ScanSummary,
} from '@checkion-v3/contracts'

export type ProjectActivityInput = {
  scans: Array<
    Pick<ScanSummary, 'id' | 'projectId' | 'domainScanId' | 'completedAt' | 'startedAt'>
  >
  domains: Array<Pick<DomainScanLight, 'id' | 'projectId' | 'completedAt' | 'startedAt'>>
  geoJobs: Array<Pick<GeoJobSummary, 'id' | 'projectId' | 'completedAt'>>
}

export type ProjectActivityMetrics = {
  scanCount: number
  lastScanAt: string | null
  recentScanIds: string[]
}

function activityInstant(iso: string | null | undefined): number {
  if (!iso) return 0
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : 0
}

/** Standalone WCAG singles — page rows that belong to a deep crawl are excluded. */
export function isStandaloneScan(
  scan: Pick<ScanSummary, 'domainScanId'>,
): boolean {
  return !scan.domainScanId
}

export function computeProjectActivityMetrics(
  projectId: string,
  input: ProjectActivityInput,
): ProjectActivityMetrics {
  const singles = input.scans.filter(
    (s) => s.projectId === projectId && isStandaloneScan(s),
  )
  const domains = input.domains.filter((d) => d.projectId === projectId)
  const geoJobs = input.geoJobs.filter((j) => j.projectId === projectId)

  const events: Array<{ id: string; at: number; completedAt: string | null }> = [
    ...singles.map((s) => ({
      id: s.id,
      at: activityInstant(s.completedAt ?? s.startedAt),
      completedAt: s.completedAt,
    })),
    ...domains.map((d) => ({
      id: d.id,
      at: activityInstant(d.completedAt ?? d.startedAt),
      completedAt: d.completedAt,
    })),
    ...geoJobs.map((j) => ({
      id: j.id,
      at: activityInstant(j.completedAt),
      completedAt: j.completedAt,
    })),
  ].sort((a, b) => b.at - a.at)

  const lastCompleted = events.find((e) => e.completedAt) ?? null

  return {
    scanCount: singles.length + domains.length + geoJobs.length,
    lastScanAt: lastCompleted?.completedAt ?? null,
    recentScanIds: events.slice(0, 20).map((e) => e.id),
  }
}

export function enrichProjectSummariesWithActivity<
  T extends { id: string; scanCount: number; lastScanAt: string | null },
>(projects: T[], input: ProjectActivityInput): T[] {
  return projects.map((p) => {
    const m = computeProjectActivityMetrics(p.id, input)
    return { ...p, scanCount: m.scanCount, lastScanAt: m.lastScanAt }
  })
}
