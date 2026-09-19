import { NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import {
  addCollectionMemberOnPlexon,
  fetchCollectionMembersFromPlexon,
} from '../../../../../lib/collection-members-plexon'
import { getProject } from '../../../../../lib/fixtures/project-store'
import { isRealPlatformProjectId } from '../../../../../lib/plexon-platform-id'
import { viewerCanAccessProject } from '../../../../../lib/project-access'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  const viewerId = session?.user?.id ?? null
  if (!viewerId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await context.params
  const project = await getProject(id)
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!(await viewerCanAccessProject(project, viewerId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  if (!isRealPlatformProjectId(project.platformProjectId)) {
    return NextResponse.json({ error: 'collection_required', items: [] }, { status: 400 })
  }

  const remote = await fetchCollectionMembersFromPlexon({
    platformProjectId: project.platformProjectId!,
    plexonUserId: viewerId,
  })
  if (!remote.ok) {
    return NextResponse.json({ error: remote.error, items: [] }, { status: remote.status })
  }
  return NextResponse.json({
    items: remote.items.map((m) => ({
      id: m.userId,
      email: m.email,
      name: m.name,
      role: m.role,
      status: m.source === 'creator' ? 'owner' : 'active',
      source: m.source,
    })),
    source: 'plexon',
  })
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  const viewerId = session?.user?.id ?? null
  if (!viewerId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await context.params
  const project = await getProject(id)
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!(await viewerCanAccessProject(project, viewerId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (!isRealPlatformProjectId(project.platformProjectId)) {
    return NextResponse.json({ error: 'collection_required' }, { status: 400 })
  }

  let body: { email?: unknown; role?: unknown } = {}
  try {
    body = (await request.json()) as typeof body
  } catch {
    body = {}
  }
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!email) return NextResponse.json({ error: 'invalid_email' }, { status: 400 })

  const result = await addCollectionMemberOnPlexon({
    platformProjectId: project.platformProjectId!,
    plexonUserId: viewerId,
    email,
    role: body.role === 'admin' ? 'admin' : 'member',
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result)
}
