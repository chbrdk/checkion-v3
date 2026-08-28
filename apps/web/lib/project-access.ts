/**
 * Access model B: capability project lists for a Plexon user.
 * Prefer live Plexon accessible-collections; fall back to local ownerPlexonUserId.
 */

import { auth } from '../auth'
import { getPlexonContractHeaders } from './plexon-contract'
import { paths } from './paths'
import {
  getFederationMode,
  getPlexonServiceSecret,
  isPlexonFederationConfigured,
  plexonBaseUrl,
} from './runtime-config'

export type ProjectAccessFields = {
  platformProjectId?: string | null
  ownerPlexonUserId?: string | null
}

/** Resolve session / passed viewer id for list filtering. */
export async function resolveViewerId(
  explicit?: string | null,
): Promise<string | null> {
  if (explicit?.trim()) return explicit.trim()
  const session = await auth()
  return session?.user?.id?.trim() || null
}

/**
 * Fetch Collection ids the user may see from Plexon (P71).
 * Returns null when federation is unavailable (caller should use owner fallback).
 */
export async function fetchAccessiblePlatformProjectIds(
  plexonUserId: string,
): Promise<Set<string> | null> {
  if (getFederationMode() !== 'live' || !isPlexonFederationConfigured()) {
    return null
  }
  const base = plexonBaseUrl().replace(/\/$/, '')
  const secret = getPlexonServiceSecret()
  const url = `${base}${paths.plexonAccessibleCollectionsPath}`
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Plexon-User-Id': plexonUserId,
        ...getPlexonContractHeaders(secret),
      },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json()) as { items?: Array<{ id?: string }> }
    const ids = new Set<string>()
    for (const item of data.items ?? []) {
      if (typeof item.id === 'string' && item.id.trim()) ids.add(item.id.trim())
    }
    return ids
  } catch {
    return null
  }
}

export function projectVisibleToOwner(
  project: ProjectAccessFields,
  viewerId: string,
): boolean {
  return Boolean(project.ownerPlexonUserId && project.ownerPlexonUserId === viewerId)
}

export async function filterProjectsForViewer<T extends ProjectAccessFields>(
  projects: T[],
  viewerId: string | null,
): Promise<T[]> {
  if (!viewerId) return []
  const accessible = await fetchAccessiblePlatformProjectIds(viewerId)
  if (accessible) {
    return projects.filter(
      (p) =>
        (p.platformProjectId && accessible.has(p.platformProjectId)) ||
        projectVisibleToOwner(p, viewerId),
    )
  }
  return projects.filter((p) => projectVisibleToOwner(p, viewerId))
}

export async function viewerCanAccessProject(
  project: ProjectAccessFields,
  viewerId: string | null,
): Promise<boolean> {
  if (!viewerId) return false
  if (projectVisibleToOwner(project, viewerId)) return true
  if (!project.platformProjectId) return false
  const accessible = await fetchAccessiblePlatformProjectIds(viewerId)
  if (!accessible) return false
  return accessible.has(project.platformProjectId)
}
