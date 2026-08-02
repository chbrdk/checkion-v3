import { NextResponse } from 'next/server'
import type { ShareResourceType } from '@checkion-v3/contracts'
import { createShare, findShare } from '../../../lib/fixtures/share-store'
import { getDomainScan, getScan } from '../../../lib/fixtures/scan-store'

function isShareType(value: unknown): value is ShareResourceType {
  return value === 'single' || value === 'domain'
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
  return NextResponse.json(share, { status: 201 })
}
