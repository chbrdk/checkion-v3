import { NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import { getRequestUser } from '../../../../lib/auth-api-token'
import { deleteShare, getShare } from '../../../../lib/fixtures/share-store'
import {
  getDomainOverview,
  getDomainScan,
  getScan,
  getScanOverview,
} from '../../../../lib/fixtures/scan-store'
import { getProject } from '../../../../lib/fixtures/project-store'
import { paths } from '../../../../lib/paths'
import { isRealPlatformProjectId } from '../../../../lib/plexon-platform-id'
import { scheduleUpsertShareLink } from '../../../../lib/plexon-share-links'

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params
  const share = await getShare(token)
  if (!share) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const overview =
    share.resourceType === 'single'
      ? await getScanOverview(share.resourceId)
      : await getDomainOverview(share.resourceId)
  if (!overview) return NextResponse.json({ error: 'resource_missing' }, { status: 404 })
  return NextResponse.json({ share, overview })
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params
  const share = await getShare(token)
  if (!share) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const session = await auth()
  const requestUser = await getRequestUser(request)
  const actorUserId = requestUser?.id || session?.user?.id || null

  const resource =
    share.resourceType === 'single'
      ? await getScan(share.resourceId)
      : await getDomainScan(share.resourceId)
  const project = resource?.projectId ? await getProject(resource.projectId) : null
  const platformProjectId = project?.platformProjectId?.trim() ?? ''

  const ok = await deleteShare(token)
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  if (actorUserId && isRealPlatformProjectId(platformProjectId)) {
    scheduleUpsertShareLink({
      platformProjectId,
      productId: paths.productId,
      shareId: share.token,
      kind: 'scan_overview',
      title: 'Scan share (revoked)',
      revoked: true,
      actorUserId,
      meta: {
        resourceType: share.resourceType,
        resourceId: share.resourceId,
        source: 'checkion_share',
      },
    })
  }

  return NextResponse.json({ ok: true })
}
