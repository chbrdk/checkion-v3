import { NextResponse } from 'next/server'
import {
  getRankConfig,
  projectRefreshRankConfig,
} from '../../../../../../../../lib/seo-market/project-service'
import { projectSeoErrorResponse, requireProjectSeoApi } from '../../../_shared'

export const runtime = 'nodejs'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; configId: string }> },
) {
  const { id, configId } = await context.params
  const auth = await requireProjectSeoApi(request, id)
  if (!auth.ok) return auth.response
  try {
    const existing = await getRankConfig(configId)
    if (!existing || existing.projectId !== auth.projectId) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    const config = await projectRefreshRankConfig(configId)
    return NextResponse.json(config)
  } catch (e) {
    return projectSeoErrorResponse(e)
  }
}
