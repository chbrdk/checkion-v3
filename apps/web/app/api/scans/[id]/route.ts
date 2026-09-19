import { NextResponse } from 'next/server'
import { getRequestUser } from '../../../../lib/auth-api-token'
import { deleteScan, getScan, updateScanTitle } from '../../../../lib/fixtures/scan-store'
import { normalizeJobTitle } from '../../../../lib/job-title'
import { viewerCanAccessScan } from '../../../../lib/resource-access'
import {
  forbiddenResponse,
  resolveApiViewerId,
} from '../../../../lib/resource-access-http'
import { isPlexonAuthConfigured } from '../../../../lib/runtime-config'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const viewer = await resolveApiViewerId(request)
  if (!viewer.ok) return viewer.response
  const { id } = await context.params
  const scan = await getScan(id)
  if (!scan) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!(await viewerCanAccessScan(id, viewer.viewerId))) return forbiddenResponse()
  return NextResponse.json(scan)
}

/**
 * PATCH /api/scans/:id
 * Rename scan — body `{ title }` (1–120 chars).
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (isPlexonAuthConfigured()) {
    const user = await getRequestUser(request)
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const viewer = await resolveApiViewerId(request)
  if (!viewer.ok) return viewer.response

  const { id } = await context.params
  const scanId = id?.trim()
  if (!scanId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (!(await viewerCanAccessScan(scanId, viewer.viewerId))) return forbiddenResponse()

  let body: { title?: unknown }
  try {
    body = (await request.json()) as { title?: unknown }
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (normalizeJobTitle(body.title) == null) {
    return NextResponse.json({ error: 'invalid_title' }, { status: 400 })
  }

  const updated = await updateScanTitle(scanId, body.title)
  if (!updated) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  return NextResponse.json(updated)
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const viewer = await resolveApiViewerId(request)
  if (!viewer.ok) return viewer.response
  const { id } = await context.params
  if (!(await viewerCanAccessScan(id, viewer.viewerId))) return forbiddenResponse()
  const ok = await deleteScan(id)
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
