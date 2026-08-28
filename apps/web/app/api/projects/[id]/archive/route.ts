import { NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { getRequestUser } from '../../../../../lib/auth-api-token'
import { setCollectionLifecycleOnPlexon } from '../../../../../lib/archive-project-plexon'
import { archiveProject, getProject } from '../../../../../lib/fixtures/project-store'
import { viewerCanAccessProject } from '../../../../../lib/project-access'

/**
 * Archive Collection globally via Plexon (when bound), then mark local mirror archived.
 * Prefer this over hard-delete — product mirrors must stay aligned.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const session = await auth()
  const requestUser = await getRequestUser(request)
  const viewerId = requestUser?.id || session?.user?.id || null
  if (!viewerId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const project = await getProject(id)
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!(await viewerCanAccessProject(project, viewerId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const remote = await setCollectionLifecycleOnPlexon({
    platformProjectId: project.platformProjectId,
    plexonUserId: viewerId,
    status: 'archived',
  })
  if (!remote.ok) {
    return NextResponse.json(
      { error: 'plexon_archive_failed', detail: remote.detail },
      { status: remote.status >= 400 && remote.status < 600 ? remote.status : 502 },
    )
  }

  const archived = await archiveProject(id)
  if (!archived) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json(archived)
}
