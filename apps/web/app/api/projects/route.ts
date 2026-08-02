import { NextResponse } from 'next/server'
import type { CreateProjectInput } from '@checkion-v3/contracts'
import {
  createProject,
  getProjectByPlatformId,
  listProjects,
} from '../../../lib/fixtures/project-store'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const platformProjectId = url.searchParams.get('platformProjectId')
  if (platformProjectId) {
    const project = getProjectByPlatformId(platformProjectId)
    if (!project) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    return NextResponse.json(project)
  }
  return NextResponse.json({ items: listProjects() })
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
    // Local fixture create only — Plexon origin registration is deferred while we
    // focus on scan / domain / GEO product surfaces.
    const project = createProject({
      name: body.name,
      domain: body.domain,
      description: body.description,
      platformProjectId: body.platformProjectId,
    })
    return NextResponse.json(project, { status: 201 })
  } catch (err) {
    const code = err instanceof Error ? err.message : 'create_failed'
    const status = code === 'platform_project_exists' ? 409 : 400
    return NextResponse.json({ error: code }, { status })
  }
}
