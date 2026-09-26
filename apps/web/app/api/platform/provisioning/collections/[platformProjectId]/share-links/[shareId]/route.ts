/**
 * DELETE /api/platform/provisioning/collections/:platformProjectId/share-links/:shareId
 * Plexon Hub revoke fan-out. Spec: plexon collection-share-links.md · checkion share-links.md
 * shareId = public share token.
 */
import { NextResponse } from 'next/server'
import { deleteShare, getShare } from '../../../../../../../../lib/fixtures/share-store'
import { getDomainScan, getScan } from '../../../../../../../../lib/fixtures/scan-store'
import { getProject } from '../../../../../../../../lib/fixtures/project-store'
import {
  isProvisioningAuthorized,
  jsonWithContract,
} from '../../../../../../../../lib/plexon-contract'
import { getPlexonServiceSecret } from '../../../../../../../../lib/runtime-config'

const PLEXON_USER_HEADER = 'X-Plexon-User-Id'

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{ platformProjectId: string; shareId: string }>
  },
) {
  const secret = getPlexonServiceSecret()
  if (!isProvisioningAuthorized(request, secret)) {
    return jsonWithContract({ error: 'Unauthorized' }, { status: 401 })
  }
  const plexonUserId = request.headers.get(PLEXON_USER_HEADER)?.trim()
  if (!plexonUserId) {
    return jsonWithContract({ error: `${PLEXON_USER_HEADER} required` }, { status: 400 })
  }

  const { platformProjectId: rawProject, shareId: rawShare } = await context.params
  const platformProjectId = rawProject?.trim()
  const shareId = rawShare?.trim()
  if (!platformProjectId || !shareId) {
    return jsonWithContract({ error: 'Invalid id' }, { status: 400 })
  }

  const share = await getShare(shareId)
  if (!share) {
    return jsonWithContract({ ok: true, alreadyRevoked: true })
  }

  const resource =
    share.resourceType === 'single'
      ? await getScan(share.resourceId)
      : await getDomainScan(share.resourceId)
  const project = resource?.projectId ? await getProject(resource.projectId) : null
  const bound = project?.platformProjectId?.trim() ?? ''
  if (bound && bound !== platformProjectId) {
    return jsonWithContract({ error: 'Not found' }, { status: 404 })
  }

  const ok = await deleteShare(shareId)
  if (!ok) {
    return jsonWithContract({ ok: true, alreadyRevoked: true })
  }

  // Do not sync back to Plexon — Hub caller owns the registry update.
  return jsonWithContract({ ok: true, shareId })
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
