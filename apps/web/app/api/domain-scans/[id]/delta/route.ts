import { NextResponse } from 'next/server'
import { resolveDomainScanDelta } from '../../../../../lib/scan-run-delta-resolve'
import { viewerCanAccessDomainScan } from '../../../../../lib/resource-access'
import {
  forbiddenResponse,
  resolveApiViewerId,
} from '../../../../../lib/resource-access-http'

/**
 * GET /api/domain-scans/:id/delta — Gegentest vs previous deep / domain run.
 * Spec: specs/api/scan-run-delta.md
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const viewer = await resolveApiViewerId(request)
  if (!viewer.ok) return viewer.response
  const { id } = await context.params
  if (!(await viewerCanAccessDomainScan(id, viewer.viewerId))) return forbiddenResponse()

  const previousId = new URL(request.url).searchParams.get('previousId')
  const result = await resolveDomainScanDelta(id, previousId)
  if (!result.ok) {
    const status = result.error === 'not_found' ? 404 : 409
    return NextResponse.json({ error: result.error }, { status })
  }
  return NextResponse.json(result.delta)
}
