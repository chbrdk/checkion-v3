import { NextResponse } from 'next/server'
import { getDomainOverview } from '../../../../../lib/fixtures/scan-store'
import { viewerCanAccessDomainScan } from '../../../../../lib/resource-access'
import {
  forbiddenResponse,
  resolveApiViewerId,
} from '../../../../../lib/resource-access-http'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const viewer = await resolveApiViewerId(request)
  if (!viewer.ok) return viewer.response
  const { id } = await context.params
  if (!(await viewerCanAccessDomainScan(id, viewer.viewerId))) return forbiddenResponse()
  const overview = await getDomainOverview(id)
  if (!overview) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json(overview)
}
