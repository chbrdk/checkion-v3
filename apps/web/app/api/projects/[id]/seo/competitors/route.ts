import { NextResponse } from 'next/server'
import { projectCompetitors } from '../../../../../../lib/seo-market/project-service'
import { projectSeoErrorResponse, requireProjectSeoApi } from '../_shared'

export const runtime = 'nodejs'

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
