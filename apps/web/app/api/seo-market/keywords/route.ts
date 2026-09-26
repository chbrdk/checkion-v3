import { NextResponse } from 'next/server'
import { researchKeywords } from '../../../../lib/seo-market'
import {
  requireSeoMarketApi,
  requireSeoProjectAccess,
  seoMarketErrorResponse,
} from '../_shared'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const auth = await requireSeoMarketApi(request)
  if (!auth.ok) return auth.response
  const body = (await request.json()) as {
    projectId?: string
    seed?: string
    locationCode?: number
    languageCode?: string
    limit?: number
  }
  const denied = await requireSeoProjectAccess(auth.viewerId, body.projectId)
  if (denied) return denied
  const seed = typeof body.seed === 'string' ? body.seed.trim() : ''
  if (!seed) {
    return NextResponse.json(
      { error: 'invalid_body', detail: 'seed is required' },
      { status: 400 },
    )
  }
  try {
    const result = await researchKeywords({
      projectId: body.projectId!.trim(),
      seed,
      locationCode: body.locationCode,
      languageCode: body.languageCode,
      limit: body.limit,
    })
    return NextResponse.json(result)
  } catch (e) {
    return seoMarketErrorResponse(e)
  }
}
