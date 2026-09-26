import { NextResponse } from 'next/server'
import {
  listBacklinkSnapshots,
  projectRefreshBacklinks,
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
  const url = new URL(request.url)
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 20)))
  try {
    const history = await listBacklinkSnapshots(auth.projectId, limit)
    return NextResponse.json({
      projectId: auth.projectId,
      latest: history[0] ?? null,
      history,
    })
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
  try {
    const snapshot = await projectRefreshBacklinks(auth.projectId)
    return NextResponse.json(snapshot)
  } catch (e) {
    return projectSeoErrorResponse(e)
  }
}
