import { NextResponse } from 'next/server'
import {
  gscPerformance,
  projectDisconnectGsc,
  projectGscStatus,
  projectRefreshGsc,
} from '../../../../../../lib/seo-market/project-service'
import { projectSeoErrorResponse, requireProjectSeoApi } from '../_shared'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const auth = await requireProjectSeoApi(request, id)
  if (!auth.ok) return auth.response
  try {
    const status = await projectGscStatus(auth.projectId)
    const url = new URL(request.url)
    const siteUrl = url.searchParams.get('siteUrl') || status.siteUrl || 'https://example.com/'
    const performance = await gscPerformance({
      projectId: auth.projectId,
      siteUrl,
    })
    return NextResponse.json({ status, performance })
  } catch (e) {
    return projectSeoErrorResponse(e)
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const auth = await requireProjectSeoApi(request, id)
  if (!auth.ok) return auth.response
  let body: { action?: string; siteUrl?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    body = {}
  }
  try {
    if (body.action === 'disconnect') {
      await projectDisconnectGsc(auth.projectId)
      const status = await projectGscStatus(auth.projectId)
      return NextResponse.json({ status, ok: true })
    }
    const snapshot = await projectRefreshGsc(auth.projectId)
    const status = await projectGscStatus(auth.projectId)
    return NextResponse.json({ status, snapshot, performance: snapshot })
  } catch (e) {
    return projectSeoErrorResponse(e)
  }
}
