import { NextResponse } from 'next/server'
import { gscPerformance } from '../../../../../lib/seo-market'
import {
  requireSeoMarketApi,
  requireSeoProjectAccess,
  seoMarketErrorResponse,
} from '../../_shared'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const auth = await requireSeoMarketApi(request)
  if (!auth.ok) return auth.response
  const body = (await request.json()) as {
    projectId?: string
    siteUrl?: string
    startDate?: string
    endDate?: string
  }
  const denied = await requireSeoProjectAccess(auth.viewerId, body.projectId)
  if (denied) return denied
  const siteUrl = typeof body.siteUrl === 'string' ? body.siteUrl.trim() : ''
  if (!siteUrl) {
    return NextResponse.json(
      { error: 'invalid_body', detail: 'siteUrl is required' },
      { status: 400 },
    )
  }
  try {
    const result = await gscPerformance({
      projectId: body.projectId!.trim(),
      siteUrl,
      startDate: body.startDate,
      endDate: body.endDate,
    })
    return NextResponse.json(result)
  } catch (e) {
    return seoMarketErrorResponse(e)
  }
}
