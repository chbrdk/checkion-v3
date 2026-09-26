import { NextResponse } from 'next/server'
import { researchCompetitors } from '../../../../lib/seo-market'
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
    domain?: string
    keywords?: string[]
  }
  const denied = await requireSeoProjectAccess(auth.viewerId, body.projectId)
  if (denied) return denied
  const domain = typeof body.domain === 'string' ? body.domain.trim() : ''
  if (!domain) {
    return NextResponse.json(
      { error: 'invalid_body', detail: 'domain is required' },
      { status: 400 },
    )
  }
  const keywords = Array.isArray(body.keywords)
    ? body.keywords.map((k) => String(k).trim()).filter(Boolean)
    : []
  try {
    const result = await researchCompetitors({
      projectId: body.projectId!.trim(),
      domain,
      keywords,
    })
    return NextResponse.json(result)
  } catch (e) {
    return seoMarketErrorResponse(e)
  }
}
