import { NextResponse } from 'next/server'
import {
  latestCompetitorSnapshot,
  projectCompetitors,
} from '../../../../../../lib/seo-market/project-service'
import { projectSeoErrorResponse, requireProjectSeoApi } from '../_shared'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const auth = await requireProjectSeoApi(_request, id)
  if (!auth.ok) return auth.response
  try {
    const latest = await latestCompetitorSnapshot(auth.projectId)
    return NextResponse.json({
      projectId: auth.projectId,
      latest,
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
  let body: { keywords?: string[] }
  try {
    body = (await request.json()) as typeof body
  } catch {
    body = {}
  }
  try {
    const result = await projectCompetitors(
      auth.projectId,
      Array.isArray(body.keywords) ? body.keywords : [],
    )
    return NextResponse.json(result)
  } catch (e) {
    return projectSeoErrorResponse(e)
  }
}
