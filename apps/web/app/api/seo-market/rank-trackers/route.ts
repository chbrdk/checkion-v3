import { NextResponse } from 'next/server'
import {
  createSeoRankTracker,
  listSeoRankTrackers,
} from '../../../../lib/seo-market'
import {
  requireSeoMarketApi,
  requireSeoProjectAccess,
  seoMarketErrorResponse,
} from '../_shared'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = await requireSeoMarketApi(request)
  if (!auth.ok) return auth.response
  const projectId = new URL(request.url).searchParams.get('projectId') ?? undefined
  if (projectId) {
    const denied = await requireSeoProjectAccess(auth.viewerId, projectId)
    if (denied) return denied
  }
  const items = await listSeoRankTrackers(projectId?.trim())
  return NextResponse.json({ items })
}

export async function POST(request: Request) {
  const auth = await requireSeoMarketApi(request)
  if (!auth.ok) return auth.response
  const body = (await request.json()) as {
    projectId?: string
    domain?: string
    keywords?: string[]
    locationCode?: number
    languageCode?: string
  }
  const denied = await requireSeoProjectAccess(auth.viewerId, body.projectId)
  if (denied) return denied
  const domain = typeof body.domain === 'string' ? body.domain.trim() : ''
  const keywords = Array.isArray(body.keywords)
    ? body.keywords.map((k) => String(k).trim()).filter(Boolean)
    : []
  if (!domain || keywords.length === 0) {
    return NextResponse.json(
      { error: 'invalid_body', detail: 'domain and non-empty keywords are required' },
      { status: 400 },
    )
  }
  try {
    const tracker = await createSeoRankTracker({
      projectId: body.projectId!.trim(),
      domain,
      keywords,
      locationCode: body.locationCode,
      languageCode: body.languageCode,
    })
    return NextResponse.json(tracker, { status: 201 })
  } catch (e) {
    return seoMarketErrorResponse(e)
  }
}
