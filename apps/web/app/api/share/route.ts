import { NextResponse } from 'next/server'
import type { ShareResourceType } from '@checkion-v3/contracts'
import { auth } from '../../../auth'
import { getRequestUser } from '../../../lib/auth-api-token'
import { createShare, findShare } from '../../../lib/fixtures/share-store'
import { getDomainScan, getScan } from '../../../lib/fixtures/scan-store'
import { getProject } from '../../../lib/fixtures/project-store'
import { paths } from '../../../lib/paths'
import { isRealPlatformProjectId } from '../../../lib/plexon-platform-id'
import { scheduleUpsertShareLink } from '../../../lib/plexon-share-links'
import { checkionPublicUrl } from '../../../lib/runtime-config'

function isShareType(value: unknown): value is ShareResourceType {
  return value === 'single' || value === 'domain'
}

function shareHref(token: string): string {
  return `${checkionPublicUrl().replace(/\/$/, '')}${paths.routes.shareDetail(token)}`
}

async function resolveShareCollection(resourceType: ShareResourceType, resourceId: string) {
  const resource =
    resourceType === 'single' ? await getScan(resourceId) : await getDomainScan(resourceId)
  if (!resource?.projectId) return null
  const project = await getProject(resource.projectId)
  if (!project) return null
  const platformProjectId = project.platformProjectId?.trim() ?? ''
  if (!isRealPlatformProjectId(platformProjectId)) return null
  return {
    platformProjectId,
    projectId: project.id,
    projectName: project.name,
    resourceId: resource.id,
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const resourceType = url.searchParams.get('resourceType')
  const resourceId = url.searchParams.get('resourceId')
  if (!isShareType(resourceType) || !resourceId) {
    return NextResponse.json({ error: 'invalid_query' }, { status: 400 })
  }
  const share = await findShare(resourceType, resourceId)
  if (!share) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json(share)
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    resourceType?: ShareResourceType
    resourceId?: string
  }
  if (!isShareType(body.resourceType) || !body.resourceId) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const exists =
    body.resourceType === 'single'
      ? await getScan(body.resourceId)
      : await getDomainScan(body.resourceId)
  if (!exists) return NextResponse.json({ error: 'resource_not_found' }, { status: 404 })
  const share = await createShare(body.resourceType, body.resourceId)

  const session = await auth()
  const requestUser = await getRequestUser(request)
  const actorUserId = requestUser?.id || session?.user?.id || null
  const collection = await resolveShareCollection(body.resourceType, body.resourceId)
  if (actorUserId && collection) {
    scheduleUpsertShareLink({
      platformProjectId: collection.platformProjectId,
      productId: paths.productId,
      shareId: share.token,
      kind: 'scan_overview',
      title: `${collection.projectName} — Share`,
      href: shareHref(share.token),
      actorUserId,
      meta: {
        resourceType: share.resourceType,
        resourceId: share.resourceId,
        projectId: collection.projectId,
        source: 'checkion_share',
      },
    })
  }

  return NextResponse.json(share, { status: 201 })
}
