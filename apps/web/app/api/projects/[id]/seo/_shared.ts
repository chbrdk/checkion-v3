import { NextResponse } from 'next/server'
import { getRequestUser } from '../../../../../lib/auth-api-token'
import { viewerCanAccessProjectId } from '../../../../../lib/resource-access'
import {
  forbiddenResponse,
  resolveApiViewerId,
} from '../../../../../lib/resource-access-http'
import { isPlexonAuthConfigured } from '../../../../../lib/runtime-config'

export async function requireProjectSeoApi(
  request: Request,
  projectId: string,
): Promise<
  | { ok: true; viewerId: string | null; projectId: string }
  | { ok: false; response: NextResponse }
> {
  if (isPlexonAuthConfigured()) {
    const user = await getRequestUser(request)
    if (!user) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
      }
    }
  }
  const viewer = await resolveApiViewerId(request)
  if (!viewer.ok) return { ok: false, response: viewer.response }
  const id = projectId.trim()
  if (!id) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'not_found' }, { status: 404 }),
    }
  }
  const allowed = await viewerCanAccessProjectId(id, viewer.viewerId)
  if (!allowed) return { ok: false, response: forbiddenResponse() }
  return { ok: true, viewerId: viewer.viewerId, projectId: id }
}

export function projectSeoErrorResponse(e: unknown): NextResponse {
  const err = e as Error & { code?: string }
  if (err.message === 'not_found' || err.message === 'project has no domain') {
    return NextResponse.json(
      { error: err.message === 'not_found' ? 'not_found' : 'invalid_body', detail: err.message },
      { status: err.message === 'not_found' ? 404 : 400 },
    )
  }
  if (err.message === 'keywords are required' || err.message === 'domain is required') {
    return NextResponse.json(
      { error: 'invalid_body', detail: err.message },
      { status: 400 },
    )
  }
  if (err.code === 'cost_soft_cap') {
    return NextResponse.json(
      { error: 'cost_soft_cap', detail: err.message },
      { status: 429 },
    )
  }
  return NextResponse.json(
    { error: 'vendor_error', detail: err.message || 'SEO Market request failed' },
    { status: 502 },
  )
}
