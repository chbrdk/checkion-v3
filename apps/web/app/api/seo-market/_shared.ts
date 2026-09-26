import { NextResponse } from 'next/server'
import { getRequestUser } from '../../../lib/auth-api-token'
import { viewerCanAccessProjectId } from '../../../lib/resource-access'
import {
  forbiddenResponse,
  resolveApiViewerId,
} from '../../../lib/resource-access-http'
import { isPlexonAuthConfigured } from '../../../lib/runtime-config'

export async function requireSeoMarketApi(request: Request): Promise<
  | { ok: true; viewerId: string | null }
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
  return { ok: true, viewerId: viewer.viewerId }
}

export async function requireSeoProjectAccess(
  viewerId: string | null,
  projectId: string | undefined,
): Promise<NextResponse | null> {
  if (!projectId?.trim()) {
    return NextResponse.json(
      { error: 'invalid_body', detail: 'projectId is required' },
      { status: 400 },
    )
  }
  const allowed = await viewerCanAccessProjectId(projectId.trim(), viewerId)
  if (!allowed) return forbiddenResponse()
  return null
}

export function seoMarketErrorResponse(e: unknown): NextResponse {
  const err = e as Error & { code?: string }
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
