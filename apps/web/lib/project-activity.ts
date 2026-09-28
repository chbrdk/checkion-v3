/**
 * Project hub / summary activity metrics.
 * Counts: standalone singles + deep domain jobs + GEO jobs (+ SEO rank configs).
 * Deep page-scan rows are excluded to avoid double-counting.
 */
import type {
  DomainScanLight,
  GeoJobSummary,
  ScanSummary,
} from '@checkion-v3/contracts'

export type ProjectActivityLane = {
  count: number
  lastAt: string | null
}

export type ProjectActivityInput = {
  scans: Array<
    Pick<ScanSummary, 'id' | 'projectId' | 'domainScanId' | 'completedAt' | 'startedAt'>
  >
  domains: Array<Pick<DomainScanLight, 'id' | 'projectId' | 'completedAt' | 'startedAt'>>
  geoJobs: Array<Pick<GeoJobSummary, 'id' | 'projectId' | 'completedAt'>>
  /** SEO Market rank configs / trackers — last refresh/check per project. */
  seo?: Array<{ projectId: string; id: string; lastAt: string | null }>
}

export type ProjectActivityMetrics = {
  scanCount: number
  lastScanAt: string | null
  recentScanIds: string[]
  singles: ProjectActivityLane
  deep: ProjectActivityLane
  geo: ProjectActivityLane
  seo: ProjectActivityLane
}

function activityInstant(iso: string | null | undefined): number {
  if (!iso) return 0
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : 0
}

function laneFromEvents(
  events: Array<{ id: string; at: number; completedAt: string | null }>,
): ProjectActivityLane {
  const sorted = [...events].sort((a, b) => b.at - a.at)
  const lastCompleted = sorted.find((e) => e.completedAt) ?? null
  return {
    count: events.length,
    lastAt: lastCompleted?.completedAt ?? null,
  }
}

/** Standalone WCAG singles — page rows that belong to a deep crawl are excluded. */
export function isStandaloneScan(
  scan: Pick<ScanSummary, 'domainScanId'>,
): boolean {
  return !scan.domainScanId
}

export function emptyActivityLane(): ProjectActivityLane {
  return { count: 0, lastAt: null }
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
  const seo = (input.seo ?? []).filter((s) => s.projectId === projectId)

  const singleEvents = singles.map((s) => ({
    id: s.id,
    at: activityInstant(s.completedAt ?? s.startedAt),
    completedAt: s.completedAt,
  }))
  const deepEvents = domains.map((d) => ({
    id: d.id,
    at: activityInstant(d.completedAt ?? d.startedAt),
    completedAt: d.completedAt,
  }))
  const geoEvents = geoJobs.map((j) => ({
    id: j.id,
    at: activityInstant(j.completedAt),
    completedAt: j.completedAt,
  }))
  const seoEvents = seo.map((s) => ({
    id: s.id,
    at: activityInstant(s.lastAt),
    completedAt: s.lastAt,
  }))

  const singlesLane = laneFromEvents(singleEvents)
  const deepLane = laneFromEvents(deepEvents)
  const geoLane = laneFromEvents(geoEvents)
  const seoLane = laneFromEvents(seoEvents)

  const combined = [...singleEvents, ...deepEvents, ...geoEvents].sort(
    (a, b) => b.at - a.at,
  )
  const lastCompleted = combined.find((e) => e.completedAt) ?? null

  return {
    scanCount: singlesLane.count + deepLane.count + geoLane.count,
    lastScanAt: lastCompleted?.completedAt ?? null,
    recentScanIds: combined.slice(0, 20).map((e) => e.id),
    singles: singlesLane,
    deep: deepLane,
    geo: geoLane,
    seo: seoLane,
  }
}

export function enrichProjectSummariesWithActivity<
  T extends {
    id: string
    scanCount: number
    lastScanAt: string | null
    activity?: {
      singles: ProjectActivityLane
      deep: ProjectActivityLane
      geo: ProjectActivityLane
      seo: ProjectActivityLane
    }
  },
>(projects: T[], input: ProjectActivityInput): T[] {
  return projects.map((p) => {
    const m = computeProjectActivityMetrics(p.id, input)
    return {
      ...p,
      scanCount: m.scanCount,
      lastScanAt: m.lastScanAt,
      activity: {
        singles: m.singles,
        deep: m.deep,
        geo: m.geo,
        seo: m.seo,
      },
    }
  })
}
