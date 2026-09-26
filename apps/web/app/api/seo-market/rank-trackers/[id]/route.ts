import { NextResponse } from 'next/server'
import { getSeoRankTracker } from '../../../../../lib/seo-market'
import {
  requireSeoMarketApi,
  requireSeoProjectAccess,
} from '../../_shared'

export const runtime = 'nodejs'

export async function GET(
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
  return NextResponse.json(tracker)
}
