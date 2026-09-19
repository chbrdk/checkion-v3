import { NextResponse } from 'next/server'
import { getRequestUser } from '../../../../lib/auth-api-token'
import {
  getGeoJob,
  getGeoOverview,
  updateGeoJobTitle,
} from '../../../../lib/fixtures/geo-store'
import { normalizeGeoJobTitle } from '../../../../lib/geo-job-title'
import { viewerCanAccessGeoJob } from '../../../../lib/resource-access'
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
  if (!(await viewerCanAccessGeoJob(id, viewer.viewerId))) return forbiddenResponse()

  const overview = await getGeoOverview(id)
  if (overview) return NextResponse.json(overview)

  const job = await getGeoJob(id)
  if (!job) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ job })
}

/**
 * PATCH /api/geo-jobs/:id
 * Rename job — body `{ title }` (1–120 chars).
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
  const jobId = id?.trim()
  if (!jobId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (!(await viewerCanAccessGeoJob(jobId, viewer.viewerId))) return forbiddenResponse()

  let body: { title?: unknown }
  try {
    body = (await request.json()) as { title?: unknown }
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (normalizeGeoJobTitle(body.title) == null) {
    return NextResponse.json({ error: 'invalid_title' }, { status: 400 })
  }

  const overview = await updateGeoJobTitle(jobId, body.title)
  if (!overview) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  return NextResponse.json(overview)
}
