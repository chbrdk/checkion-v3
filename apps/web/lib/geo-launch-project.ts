/**
 * Resolve / ensure a Collection project for GEO launch.
 * `companyId` is not part of POST /api/geo-jobs — only needed when we auto-create
 * a project for federation origin (session / PLEXON_DEMO_COMPANY_ID).
 */

import { auth } from '../auth'
import { getRequestUser } from './auth-api-token'
import {
  applyPlatformBinding,
  createProject,
  getProject,
} from './fixtures/project-store'
import { hostFromUrl } from './geo-query-suggest'
import { getPlexonProfile } from './plexon-auth'
import { registerCheckionProjectOnPlexon } from './plexon-project-origin'
import {
  getPlexonDemoCompanyId,
  getPlexonDemoOwnerUserId,
  isPlexonAuthConfigured,
  isPlexonFederationConfigured,
} from './runtime-config'

export type ResolveGeoLaunchProjectResult =
  | { ok: true; projectId: string; created: boolean }
  | { ok: false; error: string; detail: string }

async function resolveOwnerAndCompany(request: Request): Promise<{
  ownerPlexonUserId?: string
  platformCompanyId?: string
}> {
  const session = await auth()
  const requestUser = await getRequestUser(request)
  const ownerPlexonUserId =
    requestUser?.id ||
    session?.user?.id ||
    getPlexonDemoOwnerUserId() ||
    undefined

  let platformCompanyId = getPlexonDemoCompanyId() || undefined
  if (ownerPlexonUserId && isPlexonAuthConfigured() && !platformCompanyId) {
    const profile = await getPlexonProfile(ownerPlexonUserId)
    platformCompanyId = profile?.default_platform_company_id
  }

  return { ownerPlexonUserId, platformCompanyId }
}

/**
 * Resolve `projectId` for GEO create:
 * 1. Explicit id when the project exists
 * 2. Otherwise auto-create from the target URL / company name
 *    (federation company from demo/session) — never silently pick another Collection
 */
export async function resolveGeoLaunchProjectId(
  request: Request,
  input: { projectId?: string; url: string; companyName?: string },
): Promise<ResolveGeoLaunchProjectResult> {
  const requested = input.projectId?.trim()
  if (requested) {
    const existing = await getProject(requested)
    if (!existing) {
      return {
        ok: false,
        error: 'project_not_found',
        detail: `No Collection project with id "${requested}". Pick an existing project or omit projectId to auto-create.`,
      }
    }
    return { ok: true, projectId: existing.id, created: false }
  }

  const host = hostFromUrl(input.url)
  const label = input.companyName?.trim() || host
  const { ownerPlexonUserId, platformCompanyId } = await resolveOwnerAndCompany(request)

  try {
    let project = await createProject({
      name: `GEO · ${label}`,
      domain: host,
      description: 'Auto-created for GEO launch when no Collection project was selected.',
      ownerPlexonUserId,
      platformCompanyId,
    })

    if (ownerPlexonUserId && platformCompanyId && isPlexonFederationConfigured()) {
      const origin = await registerCheckionProjectOnPlexon({
        checkionProjectId: project.id,
        name: project.name,
        domain: project.domain,
        ownerPlexonUserId,
        platformCompanyId,
      })
      if (origin?.platformProjectId) {
        project =
          (await applyPlatformBinding(project.id, {
            platformProjectId: origin.platformProjectId,
            capabilityStatus: 'in_sync',
          })) ?? project
      }
    }

    return { ok: true, projectId: project.id, created: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'create_failed'
    return {
      ok: false,
      error: 'project_required',
      detail:
        message === 'domain_required' || message === 'name_required'
          ? 'Could not auto-create a Collection project for GEO — create one under Projects first.'
          : `Could not auto-create a Collection project for GEO (${message}). Create one under Projects first (company via session or PLEXON_DEMO_COMPANY_ID when federating).`,
    }
  }
}
