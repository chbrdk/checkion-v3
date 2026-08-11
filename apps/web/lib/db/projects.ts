import { and, desc, eq, ne } from 'drizzle-orm'
import type {
  CreateProjectInput,
  ProjectDetail,
  ProjectSummary,
  UpdateProjectInput,
} from '@checkion-v3/contracts'
import { UNASSIGNED_PROJECT_ID } from '@checkion-v3/contracts'
import { getDb } from './client'
import { projects, type ProjectRow } from './schema'
import { dbReassignProjectResources } from './scans'

function normalizeProjectDomain(input: string): string {
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

function rowToDetail(row: ProjectRow): ProjectDetail {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    status: row.status,
    platformProjectId: row.platformProjectId,
    capabilityStatus: row.capabilityStatus,
    lastScanAt: row.lastScanAt,
    scanCount: row.scanCount,
    description: row.description,
    recentScanIds: Array.isArray(row.recentScanIds) ? [...row.recentScanIds] : [],
  }
}

function toSummary(detail: ProjectDetail): ProjectSummary {
  const { description: _d, recentScanIds: _r, ...summary } = detail
  return summary
}

export async function dbListProjects(): Promise<ProjectSummary[]> {
  const db = getDb()
  const rows = await db
    .select()
    .from(projects)
    .where(and(ne(projects.id, UNASSIGNED_PROJECT_ID), ne(projects.status, 'archived')))
    .orderBy(desc(projects.updatedAt))
  return rows.map((row) => toSummary(rowToDetail(row)))
}

export async function dbGetProject(id: string): Promise<ProjectDetail | null> {
  const db = getDb()
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
  const row = rows[0]
  return row ? rowToDetail(row) : null
}

export async function dbGetProjectByPlatformId(
  platformProjectId: string,
): Promise<ProjectDetail | null> {
  const db = getDb()
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.platformProjectId, platformProjectId))
    .limit(1)
  const row = rows[0]
  return row ? rowToDetail(row) : null
}

export async function dbCreateProject(input: CreateProjectInput): Promise<ProjectDetail> {
  const name = input.name.trim()
  const domain = normalizeProjectDomain(input.domain)
  if (!name) throw new Error('name_required')
  if (!domain) throw new Error('domain_required')

  const platformProjectId =
    input.platformProjectId?.trim() || `plx-local-${slugify(name)}-${Date.now().toString(36)}`

  const existing = await dbGetProjectByPlatformId(platformProjectId)
  if (existing) throw new Error('platform_project_exists')

  const id = `proj-${Date.now().toString(36)}`
  const now = new Date()
  const db = getDb()
  await db.insert(projects).values({
    id,
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
    payload: {},
    updatedAt: now,
    createdAt: now,
  })
  const created = await dbGetProject(id)
  if (!created) throw new Error('create_failed')
  return created
}

export async function dbUpsertByPlatformProjectId(
  platformProjectId: string,
  input: {
    name: string
    domain?: string | null
    status?: 'active' | 'archived'
    ownerPlexonUserId?: string
    platformCompanyId?: string
  },
): Promise<ProjectDetail> {
  const existing = await dbGetProjectByPlatformId(platformProjectId)
  const db = getDb()
  if (existing) {
    await db
      .update(projects)
      .set({
        name: input.name.trim() || existing.name,
        domain:
          input.domain != null && String(input.domain).trim()
            ? normalizeProjectDomain(String(input.domain))
            : existing.domain,
        status: input.status === 'archived' ? 'archived' : 'active',
        capabilityStatus: 'in_sync',
        ownerPlexonUserId: input.ownerPlexonUserId?.trim() || null,
        platformCompanyId: input.platformCompanyId?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, existing.id))
    return (await dbGetProject(existing.id)) ?? existing
  }

  const domain =
    input.domain != null && String(input.domain).trim()
      ? normalizeProjectDomain(String(input.domain))
      : '—'
  const id = `proj-${Date.now().toString(36)}`
  const now = new Date()
  await db.insert(projects).values({
    id,
    name: input.name.trim(),
    domain,
    status: input.status === 'archived' ? 'archived' : 'active',
    platformProjectId,
    capabilityStatus: 'in_sync',
    lastScanAt: null,
    scanCount: 0,
    description: '',
    recentScanIds: [],
    ownerPlexonUserId: input.ownerPlexonUserId?.trim() || null,
    platformCompanyId: input.platformCompanyId?.trim() || null,
    payload: {},
    updatedAt: now,
    createdAt: now,
  })
  const created = await dbGetProject(id)
  if (!created) throw new Error('upsert_failed')
  return created
}

export async function dbApplyPlatformBinding(
  projectId: string,
  binding: { platformProjectId: string; capabilityStatus?: ProjectDetail['capabilityStatus'] },
): Promise<ProjectDetail | null> {
  if (projectId === UNASSIGNED_PROJECT_ID) return null
  const current = await dbGetProject(projectId)
  if (!current) return null

  const platformProjectId = binding.platformProjectId.trim()
  const conflict = await dbGetProjectByPlatformId(platformProjectId)
  if (conflict && conflict.id !== projectId) throw new Error('platform_project_exists')

  const db = getDb()
  await db
    .update(projects)
    .set({
      platformProjectId,
      capabilityStatus: binding.capabilityStatus ?? 'in_sync',
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
  return dbGetProject(projectId)
}

export async function dbSetProjectCapabilityStatus(
  projectId: string,
  capabilityStatus: ProjectDetail['capabilityStatus'],
): Promise<ProjectDetail | null> {
  const current = await dbGetProject(projectId)
  if (!current) return null
  const db = getDb()
  await db
    .update(projects)
    .set({ capabilityStatus, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
  return dbGetProject(projectId)
}

export async function dbUpdateProject(
  id: string,
  patch: UpdateProjectInput,
): Promise<ProjectDetail | null> {
  if (id === UNASSIGNED_PROJECT_ID) return null
  const current = await dbGetProject(id)
  if (!current) return null
  const db = getDb()
  await db
    .update(projects)
    .set({
      name: patch.name != null ? patch.name.trim() || current.name : current.name,
      domain:
        patch.domain != null
          ? normalizeProjectDomain(patch.domain) || current.domain
          : current.domain,
      description:
        patch.description != null ? patch.description.trim() : current.description,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id))
  return dbGetProject(id)
}

export async function dbDeleteProject(id: string): Promise<boolean> {
  if (id === UNASSIGNED_PROJECT_ID) return false
  const current = await dbGetProject(id)
  if (!current) return false

  const moved = await dbReassignProjectResources(id, UNASSIGNED_PROJECT_ID)
  const db = getDb()
  const unassigned = await dbGetProject(UNASSIGNED_PROJECT_ID)
  if (unassigned) {
    await db
      .update(projects)
      .set({
        scanCount: unassigned.scanCount + moved.scanCount,
        recentScanIds: [...moved.recentScanIds, ...unassigned.recentScanIds].slice(0, 20),
        lastScanAt: moved.lastScanAt ?? unassigned.lastScanAt,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, UNASSIGNED_PROJECT_ID))
  }

  await db.delete(projects).where(eq(projects.id, id))
  return true
}

export { normalizeProjectDomain }
