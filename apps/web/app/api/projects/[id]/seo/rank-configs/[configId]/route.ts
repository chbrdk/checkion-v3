import { NextResponse } from 'next/server'
import { getRankConfig } from '../../../../../../../lib/seo-market/project-service'
import { projectSeoErrorResponse, requireProjectSeoApi } from '../../_shared'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; configId: string }> },
) {
  const { id, configId } = await context.params
  const auth = await requireProjectSeoApi(request, id)
  if (!auth.ok) return auth.response
  try {
    const config = await getRankConfig(configId)
    if (!config || config.projectId !== auth.projectId) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    return NextResponse.json(config)
  } catch (e) {
    return projectSeoErrorResponse(e)
  }
}
