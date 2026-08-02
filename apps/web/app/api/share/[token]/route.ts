import { NextResponse } from 'next/server'
import { deleteShare, getShare } from '../../../../lib/fixtures/share-store'
import { getDomainOverview, getScanOverview } from '../../../../lib/fixtures/scan-store'

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params
  const share = getShare(token)
  if (!share) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const overview =
    share.resourceType === 'single'
      ? getScanOverview(share.resourceId)
      : getDomainOverview(share.resourceId)
  if (!overview) return NextResponse.json({ error: 'resource_missing' }, { status: 404 })
  return NextResponse.json({ share, overview })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params
  const ok = deleteShare(token)
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
