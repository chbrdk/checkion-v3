import type {
  CreateProjectInput,
  ProjectDetail,
  ProjectSummary,
  UpdateProjectInput,
} from '@checkion-v3/contracts'
import { UNASSIGNED_PROJECT_ID } from '@checkion-v3/contracts'
import { PROJECT_FIXTURES, toProjectSummary } from './projects'
import { reassignProjectResources } from './scan-store'
import { isDatabaseConfigured } from '../db/config'

const UNASSIGNED_PROJECT: ProjectDetail = {
  id: UNASSIGNED_PROJECT_ID,
  name: 'Unassigned',
  domain: '—',
  status: 'archived',
  platformProjectId: 'plx-local-unassigned',
  capabilityStatus: 'pending',
  lastScanAt: null,
  scanCount: 0,
  description: 'Scans whose project was deleted stay here so results remain reachable.',
  recentScanIds: [],
}

const globalForProjects = globalThis as typeof globalThis & {
  __checkionV3ProjectMemory?: ProjectDetail[]
}

if (!globalForProjects.__checkionV3ProjectMemory) {
  globalForProjects.__checkionV3ProjectMemory = [
    ...PROJECT_FIXTURES.map((p) => ({ ...p, recentScanIds: [...p.recentScanIds] })),
    { ...UNASSIGNED_PROJECT },
  ]
}

function projects(): ProjectDetail[] {
  return globalForProjects.__checkionV3ProjectMemory!
}

function setProjects(next: ProjectDetail[]): void {
  globalForProjects.__checkionV3ProjectMemory = next
}

async function dbApi() {
  return import('../db/projects')
}

export function normalizeProjectDomain(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    return new URL(withProto).hostname
  } catch {
    return trimmed.replace(/^https?:\/\//i, '').split('/')[0]?.split('?')[0] ?? trimmed
  }
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32) || 'project'
  )
}

function memoryListProjects(): ProjectSummary[] {
  return projects()
    .filter((p) => p.id !== UNASSIGNED_PROJECT_ID && p.status !== 'archived')
    .map(toProjectSummary)
}

function memoryGetProject(id: string): ProjectDetail | null {
  const found = projects().find((p) => p.id === id)
  return found ? { ...found, recentScanIds: [...found.recentScanIds] } : null
}

function memoryGetProjectByPlatformId(platformProjectId: string): ProjectDetail | null {
  const found = projects().find((p) => p.platformProjectId === platformProjectId)
  return found ? { ...found, recentScanIds: [...found.recentScanIds] } : null
}

function memoryCreateProject(input: CreateProjectInput): ProjectDetail {
  const name = input.name.trim()
  const domain = normalizeProjectDomain(input.domain)
  if (!name) throw new Error('name_required')
  if (!domain) throw new Error('domain_required')

  const platformProjectId =
    input.platformProjectId?.trim() || `plx-local-${slugify(name)}-${Date.now().toString(36)}`

  if (projects().some((p) => p.platformProjectId === platformProjectId)) {
    throw new Error('platform_project_exists')
  }

  const project: ProjectDetail = {
    id: `proj-${Date.now().toString(36)}`,
    name,
    domain,
    status: 'active',
    platformProjectId,
    capabilityStatus: 'pending',
    lastScanAt: null,
    scanCount: 0,
    description: (input.description ?? '').trim(),
    recentScanIds: [],
    ownerPlexonUserId: input.ownerPlexonUserId?.trim() || null,
    platformCompanyId: input.platformCompanyId?.trim() || null,
  }

  setProjects([project, ...projects()])
  return { ...project, recentScanIds: [] }
}

function memoryUpsertByPlatformProjectId(
  platformProjectId: string,
  input: {
    name: string
    domain?: string | null
    status?: 'active' | 'archived'
  },
): ProjectDetail {
  const existing = projects().find((p) => p.platformProjectId === platformProjectId)
  if (existing) {
    const next: ProjectDetail = {
      ...existing,
      name: input.name.trim() || existing.name,
      domain:
        input.domain != null && String(input.domain).trim()
          ? normalizeProjectDomain(String(input.domain))
          : existing.domain,
      status: input.status === 'archived' ? 'archived' : 'active',
      capabilityStatus: 'in_sync',
    }
    setProjects(projects().map((p) => (p.id === existing.id ? next : p)))
    return { ...next, recentScanIds: [...next.recentScanIds] }
  }

  const domain =
    input.domain != null && String(input.domain).trim()
      ? normalizeProjectDomain(String(input.domain))
      : '—'
  const project: ProjectDetail = {
    id: `proj-${Date.now().toString(36)}`,
    name: input.name.trim(),
    domain,
    status: input.status === 'archived' ? 'archived' : 'active',
    platformProjectId,
    capabilityStatus: 'in_sync',
    lastScanAt: null,
    scanCount: 0,
    description: '',
    recentScanIds: [],
  }
  setProjects([project, ...projects()])
  return { ...project, recentScanIds: [] }
}

function memoryApplyPlatformBinding(
  projectId: string,
  binding: { platformProjectId: string; capabilityStatus?: ProjectDetail['capabilityStatus'] },
): ProjectDetail | null {
  if (projectId === UNASSIGNED_PROJECT_ID) return null
  const idx = projects().findIndex((p) => p.id === projectId)
  if (idx < 0) return null

  const platformProjectId = binding.platformProjectId.trim()
  if (
    projects().some(
      (p) => p.platformProjectId === platformProjectId && p.id !== projectId,
    )
  ) {
    throw new Error('platform_project_exists')
  }

  const current = projects()[idx]!
  const next: ProjectDetail = {
    ...current,
    platformProjectId,
    capabilityStatus: binding.capabilityStatus ?? 'in_sync',
  }
  setProjects(projects().map((p, i) => (i === idx ? next : p)))
  return { ...next, recentScanIds: [...next.recentScanIds] }
}

function memorySetProjectCapabilityStatus(
  projectId: string,
  capabilityStatus: ProjectDetail['capabilityStatus'],
): ProjectDetail | null {
  const idx = projects().findIndex((p) => p.id === projectId)
  if (idx < 0) return null
  const next = { ...projects()[idx]!, capabilityStatus }
  setProjects(projects().map((p, i) => (i === idx ? next : p)))
  return { ...next, recentScanIds: [...next.recentScanIds] }
}

function memoryUpdateProject(id: string, patch: UpdateProjectInput): ProjectDetail | null {
  if (id === UNASSIGNED_PROJECT_ID) return null
  const idx = projects().findIndex((p) => p.id === id)
  if (idx < 0) return null

  const current = projects()[idx]!
  const next: ProjectDetail = {
    ...current,
    name: patch.name != null ? patch.name.trim() || current.name : current.name,
    domain:
      patch.domain != null
        ? normalizeProjectDomain(patch.domain) || current.domain
        : current.domain,
    description:
      patch.description != null ? patch.description.trim() : current.description,
  }

  setProjects(projects().map((p, i) => (i === idx ? next : p)))
  return { ...next, recentScanIds: [...next.recentScanIds] }
}

async function memoryDeleteProject(id: string): Promise<boolean> {
  if (id === UNASSIGNED_PROJECT_ID) return false
  const before = projects().length
  const existed = projects().some((p) => p.id === id)
  if (!existed) return false

  const moved = await reassignProjectResources(id, UNASSIGNED_PROJECT_ID)
  setProjects(
    projects()
      .filter((p) => p.id !== id)
      .map((p) => {
        if (p.id !== UNASSIGNED_PROJECT_ID) return p
        return {
          ...p,
          scanCount: p.scanCount + moved.scanCount,
          recentScanIds: [...moved.recentScanIds, ...p.recentScanIds].slice(0, 20),
          lastScanAt: moved.lastScanAt ?? p.lastScanAt,
        }
      }),
  )

  return projects().length < before
}

function memoryArchiveProject(id: string): ProjectDetail | null {
  if (id === UNASSIGNED_PROJECT_ID) return null
  const idx = projects().findIndex((p) => p.id === id)
  if (idx < 0) return null
  const next: ProjectDetail = { ...projects()[idx]!, status: 'archived' }
  setProjects(projects().map((p, i) => (i === idx ? next : p)))
  return { ...next, recentScanIds: [...next.recentScanIds] }
}

/** Visible capability projects (excludes the system unassigned bucket). Unfiltered — prefer {@link listProjectsForViewer}. */
export async function listProjects(): Promise<ProjectSummary[]> {
  const base = isDatabaseConfigured()
    ? await (await dbApi()).dbListProjects()
    : memoryListProjects()
  const [{ listScans, listDomainScans }, { listGeoJobs }] = await Promise.all([
    import('./scan-store'),
    import('./geo-store'),
  ])
  const [scans, domains, geoJobs] = await Promise.all([
    listScans(),
    listDomainScans(),
    listGeoJobs(),
  ])
  const { enrichProjectSummariesWithActivity } = await import('../project-activity')
  return enrichProjectSummariesWithActivity(base, { scans, domains, geoJobs })
}

/** Access model B: creator/owner + Plexon-accessible Collections only. */
export async function listProjectsForViewer(
  viewerId: string | null,
): Promise<ProjectSummary[]> {
  const { filterProjectsForViewer } = await import('../project-access')
  return filterProjectsForViewer(await listProjects(), viewerId)
}

export async function getProject(id: string): Promise<ProjectDetail | null> {
  const base = isDatabaseConfigured()
    ? await (await dbApi()).dbGetProject(id)
    : memoryGetProject(id)
  if (!base) return null
  const [{ listScans, listDomainScans }, { listGeoJobs }] = await Promise.all([
    import('./scan-store'),
    import('./geo-store'),
  ])
  const [scans, domains, geoJobs] = await Promise.all([
    listScans(id),
    listDomainScans(id),
    listGeoJobs(),
  ])
  const { computeProjectActivityMetrics } = await import('../project-activity')
  const metrics = computeProjectActivityMetrics(id, { scans, domains, geoJobs })
  return {
    ...base,
    scanCount: metrics.scanCount,
    lastScanAt: metrics.lastScanAt,
    recentScanIds: metrics.recentScanIds,
  }
}

export async function getProjectByPlatformId(
  platformProjectId: string,
): Promise<ProjectDetail | null> {
  if (isDatabaseConfigured()) return (await dbApi()).dbGetProjectByPlatformId(platformProjectId)
  return memoryGetProjectByPlatformId(platformProjectId)
}

export async function createProject(input: CreateProjectInput): Promise<ProjectDetail> {
  if (isDatabaseConfigured()) return (await dbApi()).dbCreateProject(input)
  return memoryCreateProject(input)
}

/** Upsert from Plexon provisioning PUT (platform project → CHECKION mirror). */
export async function upsertByPlatformProjectId(
  platformProjectId: string,
  input: {
    name: string
    domain?: string | null
    status?: 'active' | 'archived'
    ownerPlexonUserId?: string
    platformCompanyId?: string
  },
): Promise<ProjectDetail> {
  if (isDatabaseConfigured()) {
    return (await dbApi()).dbUpsertByPlatformProjectId(platformProjectId, input)
  }
  return memoryUpsertByPlatformProjectId(platformProjectId, input)
}

/** Bind a local project to a Plexon collection after outbound origin. */
export async function applyPlatformBinding(
  projectId: string,
  binding: { platformProjectId: string; capabilityStatus?: ProjectDetail['capabilityStatus'] },
): Promise<ProjectDetail | null> {
  if (isDatabaseConfigured()) return (await dbApi()).dbApplyPlatformBinding(projectId, binding)
  return memoryApplyPlatformBinding(projectId, binding)
}

export async function setProjectCapabilityStatus(
  projectId: string,
  capabilityStatus: ProjectDetail['capabilityStatus'],
): Promise<ProjectDetail | null> {
  if (isDatabaseConfigured()) {
    return (await dbApi()).dbSetProjectCapabilityStatus(projectId, capabilityStatus)
  }
  return memorySetProjectCapabilityStatus(projectId, capabilityStatus)
}

export async function updateProject(
  id: string,
  patch: UpdateProjectInput,
): Promise<ProjectDetail | null> {
  if (isDatabaseConfigured()) return (await dbApi()).dbUpdateProject(id, patch)
  return memoryUpdateProject(id, patch)
}

/** Soft-remove from hubs: set status archived (Collection lifecycle mirror). */
export async function archiveProject(id: string): Promise<ProjectDetail | null> {
  if (isDatabaseConfigured()) return (await dbApi()).dbArchiveProject(id)
  return memoryArchiveProject(id)
}

export async function deleteProject(id: string): Promise<boolean> {
  if (isDatabaseConfigured()) return (await dbApi()).dbDeleteProject(id)
  return memoryDeleteProject(id)
}

/** Test helper — restore demo fixtures (memory only). */
export function resetProjectStore(): void {
  setProjects([
    ...PROJECT_FIXTURES.map((p) => ({ ...p, recentScanIds: [...p.recentScanIds] })),
    { ...UNASSIGNED_PROJECT },
  ])
}
