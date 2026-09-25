import { NextResponse } from 'next/server'
import { resolveSingleScanDelta } from '../../../../../lib/scan-run-delta-resolve'
import { viewerCanAccessScan } from '../../../../../lib/resource-access'
import {
  forbiddenResponse,
  resolveApiViewerId,
} from '../../../../../lib/resource-access-http'

/**
 * GET /api/scans/:id/delta — Gegentest vs previous single-page run.
 * Spec: specs/api/scan-run-delta.md
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const viewer = await resolveApiViewerId(request)
  if (!viewer.ok) return viewer.response
  const { id } = await context.params
  if (!(await viewerCanAccessScan(id, viewer.viewerId))) return forbiddenResponse()

  const previousId = new URL(request.url).searchParams.get('previousId')
  const result = await resolveSingleScanDelta(id, previousId)
  if (!result.ok) {
    const status = result.error === 'not_found' ? 404 : 409
    return NextResponse.json({ error: result.error }, { status })
  }
  return NextResponse.json(result.delta)
}
