import { NextResponse } from 'next/server'
import { auth } from '../../../../../../auth'
import { getRequestUser } from '../../../../../../lib/auth-api-token'
import { getProject } from '../../../../../../lib/fixtures/project-store'
import { viewerCanAccessProject } from '../../../../../../lib/project-access'
import {
  listDomainScansForViewer,
  listGeoJobsForViewer,
  listScansForViewer,
} from '../../../../../../lib/resource-access'
import { isRealPlatformProjectId } from '../../../../../../lib/plexon-platform-id'
import {
  CLIENT_ROOM_SLOT_CHECKION_OVERVIEW,
  putClientRoomSlot,
} from '../../../../../../lib/plexon-client-room'
import { paths } from '../../../../../../lib/paths'
import { checkionPublicUrl } from '../../../../../../lib/runtime-config'

export const runtime = 'nodejs'

/**
 * POST /api/projects/:id/client-room/publish
 * Explicit freigabe of the current project overview into Plexon ClientRoom slot `checkion_overview`.
 * Actor = session / Bearer viewer id (same Plexon user id as suite audit hooks).
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const projectId = id?.trim()
  if (!projectId) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  const session = await auth()
  const requestUser = await getRequestUser(request)
  const actorUserId = requestUser?.id || session?.user?.id || null
  if (!actorUserId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const project = await getProject(projectId)
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!(await viewerCanAccessProject(project, actorUserId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const platformProjectId = project.platformProjectId?.trim() ?? ''
  if (!platformProjectId || !isRealPlatformProjectId(platformProjectId)) {
    return NextResponse.json({ error: 'platform_project_required' }, { status: 400 })
  }

  const [scans, domains, geoJobs] = await Promise.all([
    listScansForViewer(actorUserId, projectId, { limit: 20 }),
    listDomainScansForViewer(actorUserId, projectId, { limit: 20 }),
    listGeoJobsForViewer(actorUserId, projectId, { limit: 20 }),
  ])

  const latestScan = scans.find((s) => s.status === 'completed') ?? scans[0] ?? null
  const latestDomain =
    domains.find((d) => d.status === 'completed') ?? domains[0] ?? null
  const latestGeo =
    geoJobs.find((g) => g.status === 'completed') ?? geoJobs[0] ?? null

  let subjectRef = project.id
  let overviewPath = paths.routes.projectDetail(project.id)
  if (latestScan) {
    subjectRef = latestScan.id
    overviewPath = paths.routes.resultSection(latestScan.id, 'overview')
  } else if (latestDomain) {
    subjectRef = latestDomain.id
    overviewPath = paths.routes.domainSection(latestDomain.id, 'overview')
  } else if (latestGeo) {
    subjectRef = latestGeo.id
    overviewPath = paths.routes.geoSection(latestGeo.id, 'overview')
  }

  const href = `${checkionPublicUrl().replace(/\/$/, '')}${overviewPath}`
  const title = `${project.name} — Overview`

  const ok = await putClientRoomSlot({
    platformProjectId,
    slotId: CLIENT_ROOM_SLOT_CHECKION_OVERVIEW,
    productId: paths.productId,
    subjectRef,
    title,
    href,
    actorUserId,
  })

  if (!ok) {
    return NextResponse.json(
      {
        error: 'client_room_publish_skipped',
        detail:
          'Federation not live, room missing, or Plexon rejected the slot update.',
        platformProjectId,
        slotId: CLIENT_ROOM_SLOT_CHECKION_OVERVIEW,
      },
      { status: 502 },
    )
  }

  return NextResponse.json({
    success: true,
    platformProjectId,
    slotId: CLIENT_ROOM_SLOT_CHECKION_OVERVIEW,
    subjectRef,
    title,
    href,
  })
}
