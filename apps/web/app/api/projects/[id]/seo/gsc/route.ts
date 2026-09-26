import { NextResponse } from 'next/server'
import {
  gscPerformance,
  gscStatus,
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
    const status = gscStatus(auth.projectId)
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
