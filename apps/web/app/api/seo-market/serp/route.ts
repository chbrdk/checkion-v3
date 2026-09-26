import { NextResponse } from 'next/server'
import { researchSerp } from '../../../../lib/seo-market'
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
    keyword?: string
    locationCode?: number
    languageCode?: string
  }
  const denied = await requireSeoProjectAccess(auth.viewerId, body.projectId)
  if (denied) return denied
  const keyword = typeof body.keyword === 'string' ? body.keyword.trim() : ''
  if (!keyword) {
    return NextResponse.json(
      { error: 'invalid_body', detail: 'keyword is required' },
      { status: 400 },
    )
  }
  try {
    const result = await researchSerp({
      projectId: body.projectId!.trim(),
      keyword,
      locationCode: body.locationCode,
      languageCode: body.languageCode,
    })
    return NextResponse.json(result)
  } catch (e) {
    return seoMarketErrorResponse(e)
  }
}
