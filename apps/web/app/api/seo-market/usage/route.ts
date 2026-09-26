import { NextResponse } from 'next/server'
import { getSeoMarketUsage } from '../../../../lib/seo-market'
import {
  requireSeoMarketApi,
  requireSeoProjectAccess,
} from '../_shared'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = await requireSeoMarketApi(request)
  if (!auth.ok) return auth.response
  const projectId = new URL(request.url).searchParams.get('projectId') ?? undefined
  const denied = await requireSeoProjectAccess(auth.viewerId, projectId)
  if (denied) return denied
  const usage = await getSeoMarketUsage(projectId!.trim())
  return NextResponse.json(usage)
}
