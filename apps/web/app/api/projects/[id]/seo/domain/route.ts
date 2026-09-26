import { NextResponse } from 'next/server'
import {
  latestDomainSnapshot,
  projectRefreshDomain,
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
    const snapshot = await latestDomainSnapshot(auth.projectId)
    return NextResponse.json({ projectId: auth.projectId, snapshot })
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
    const snapshot = await projectRefreshDomain(auth.projectId)
    return NextResponse.json(snapshot)
  } catch (e) {
    return projectSeoErrorResponse(e)
  }
}
