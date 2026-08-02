import { NextResponse } from 'next/server'
import type { CreateProjectInput } from '@checkion-v3/contracts'
import { auth } from '../../../auth'
import {
  applyPlatformBinding,
  createProject,
  getProjectByPlatformId,
  listProjects,
} from '../../../lib/fixtures/project-store'
import { getPlexonProfile } from '../../../lib/plexon-auth'
import { registerCheckionProjectOnPlexon } from '../../../lib/plexon-project-origin'
import {
  getPlexonDemoCompanyId,
  getPlexonDemoOwnerUserId,
  isPlexonAuthConfigured,
  isPlexonFederationConfigured,
} from '../../../lib/runtime-config'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const platformProjectId = url.searchParams.get('platformProjectId')
  if (platformProjectId) {
    const project = await getProjectByPlatformId(platformProjectId)
    if (!project) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    return NextResponse.json(project)
  }
  return NextResponse.json({ items: await listProjects() })
}

export async function POST(request: Request) {
  let body: CreateProjectInput
  try {
    body = (await request.json()) as CreateProjectInput
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body?.name?.trim() || !body?.domain?.trim()) {
    return NextResponse.json({ error: 'name_and_domain_required' }, { status: 400 })
  }

  try {
    const session = await auth()
    const ownerPlexonUserId =
      body.ownerPlexonUserId?.trim() ||
      session?.user?.id ||
      getPlexonDemoOwnerUserId() ||
      undefined

    let platformCompanyId =
      body.platformCompanyId?.trim() || getPlexonDemoCompanyId() || undefined
    if (ownerPlexonUserId && isPlexonAuthConfigured() && !platformCompanyId) {
      const profile = await getPlexonProfile(ownerPlexonUserId)
      platformCompanyId = profile?.default_platform_company_id
    }

    let project = await createProject({
      name: body.name,
      domain: body.domain,
      description: body.description,
      platformProjectId: body.platformProjectId,
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

    return NextResponse.json(project, { status: 201 })
  } catch (err) {
    const code = err instanceof Error ? err.message : 'create_failed'
    const status = code === 'platform_project_exists' ? 409 : 400
    return NextResponse.json({ error: code }, { status })
  }
}
