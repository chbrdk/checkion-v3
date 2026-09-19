/**
 * Access Model B for runs (scans / domain / GEO) — inherit parent project ACL.
 * Spec: specs/domain/access-model-b-visibility.md
 *
 * When Plexon auth is not configured (local/fixture), lists and detail checks stay open.
 * When auth is configured, fail closed without a viewer / without project ACL.
 */

import { getProject, listProjectsForViewer } from './fixtures/project-store'
import { listGeoJobs } from './fixtures/geo-store'
import {
  getDomainScan,
  getScan,
  listDomainScans,
  listScans,
} from './fixtures/scan-store'
import { viewerCanAccessProject } from './project-access'
import { isPlexonAuthConfigured } from './runtime-config'
import type { DomainScanLight, GeoJobSummary, ScanSummary } from '@checkion-v3/contracts'

function isOpenAccessMode(): boolean {
  return !isPlexonAuthConfigured()
}

export async function accessibleLocalProjectIds(
  viewerId: string | null,
): Promise<Set<string>> {
  if (!viewerId) return new Set()
  const projects = await listProjectsForViewer(viewerId)
  return new Set(projects.map((p) => p.id))
}

export async function filterItemsByAccessibleProject<T extends { projectId: string }>(
  items: T[],
  viewerId: string | null,
): Promise<T[]> {
  if (isOpenAccessMode()) return items
  if (!viewerId) return []
  const allowed = await accessibleLocalProjectIds(viewerId)
  return items.filter((item) => allowed.has(item.projectId))
}

export async function listScansForViewer(
  viewerId: string | null,
  projectId?: string,
): Promise<ScanSummary[]> {
  if (isOpenAccessMode()) {
    return projectId ? listScans(projectId) : listScans()
  }
  if (!viewerId) return []
  if (projectId) {
    const project = await getProject(projectId)
    if (!project || !(await viewerCanAccessProject(project, viewerId))) return []
    return listScans(projectId)
  }
  return filterItemsByAccessibleProject(await listScans(), viewerId)
}

export async function listDomainScansForViewer(
  viewerId: string | null,
  projectId?: string,
): Promise<DomainScanLight[]> {
  if (isOpenAccessMode()) {
    return projectId ? listDomainScans(projectId) : listDomainScans()
  }
  if (!viewerId) return []
  if (projectId) {
    const project = await getProject(projectId)
    if (!project || !(await viewerCanAccessProject(project, viewerId))) return []
    return listDomainScans(projectId)
  }
  return filterItemsByAccessibleProject(await listDomainScans(), viewerId)
}

export async function listGeoJobsForViewer(
  viewerId: string | null,
  projectId?: string,
): Promise<GeoJobSummary[]> {
  if (isOpenAccessMode()) {
    const all = await listGeoJobs()
    return projectId ? all.filter((j) => j.projectId === projectId) : all
  }
  if (!viewerId) return []
  const all = await listGeoJobs()
  const scoped = projectId ? all.filter((j) => j.projectId === projectId) : all
  if (projectId) {
    const project = await getProject(projectId)
    if (!project || !(await viewerCanAccessProject(project, viewerId))) return []
    return scoped
  }
  return filterItemsByAccessibleProject(scoped, viewerId)
}

export async function viewerCanAccessProjectId(
  projectId: string,
  viewerId: string | null,
): Promise<boolean> {
  if (!projectId.trim()) return false
  if (isOpenAccessMode()) return true
  if (!viewerId) return false
  const project = await getProject(projectId.trim())
  if (!project) return false
  return viewerCanAccessProject(project, viewerId)
}

export async function viewerCanAccessScan(
  scanId: string,
  viewerId: string | null,
): Promise<boolean> {
  if (isOpenAccessMode()) return true
  if (!viewerId) return false
  const scan = await getScan(scanId)
  if (!scan) return false
  return viewerCanAccessProjectId(scan.projectId, viewerId)
}

export async function viewerCanAccessDomainScan(
  domainScanId: string,
  viewerId: string | null,
): Promise<boolean> {
  if (isOpenAccessMode()) return true
  if (!viewerId) return false
  const domain = await getDomainScan(domainScanId)
  if (!domain) return false
  return viewerCanAccessProjectId(domain.projectId, viewerId)
}

export async function viewerCanAccessGeoJob(
  jobId: string,
  viewerId: string | null,
): Promise<boolean> {
  if (isOpenAccessMode()) return true
  if (!viewerId) return false
  const jobs = await listGeoJobs()
  const job = jobs.find((j) => j.id === jobId)
  if (!job) return false
  return viewerCanAccessProjectId(job.projectId, viewerId)
}
