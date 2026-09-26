import { NextResponse } from 'next/server'
import {
  getSeoRankTracker,
  refreshRankTracker,
} from '../../../../../../lib/seo-market'
import {
  requireSeoMarketApi,
  requireSeoProjectAccess,
  seoMarketErrorResponse,
} from '../../../_shared'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireSeoMarketApi(request)
  if (!auth.ok) return auth.response
  const { id } = await ctx.params
  const tracker = await getSeoRankTracker(id)
  if (!tracker) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  const denied = await requireSeoProjectAccess(auth.viewerId, tracker.projectId)
  if (denied) return denied
  try {
    // Fire async refresh; return queued shell immediately for UI / notification center.
    void refreshRankTracker(id).catch(() => undefined)
    const queued = await getSeoRankTracker(id)
    return NextResponse.json({
      ...(queued ?? tracker),
      status: 'queued',
    })
  } catch (e) {
    return seoMarketErrorResponse(e)
  }
}
