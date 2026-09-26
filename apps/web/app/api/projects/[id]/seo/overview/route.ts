import { NextResponse } from 'next/server'
import { getSeoProjectOverview } from '../../../../../../lib/seo-market/project-service'
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
    const overview = await getSeoProjectOverview(auth.projectId)
    return NextResponse.json(overview)
  } catch (e) {
    return projectSeoErrorResponse(e)
  }
}
