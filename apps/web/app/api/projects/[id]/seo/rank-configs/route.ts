import { NextResponse } from 'next/server'
import type { SeoRankSchedule } from '@checkion-v3/contracts'
import {
  listRankConfigs,
  projectCreateRankConfig,
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
    const configs = await listRankConfigs(auth.projectId)
    return NextResponse.json({ projectId: auth.projectId, configs })
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
  let body: {
    domain?: string
    keywords?: string[]
    schedule?: SeoRankSchedule
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  try {
    const config = await projectCreateRankConfig({
      projectId: auth.projectId,
      domain: body.domain,
      keywords: Array.isArray(body.keywords) ? body.keywords : [],
      schedule: body.schedule,
    })
    return NextResponse.json(config, { status: 201 })
  } catch (e) {
    return projectSeoErrorResponse(e)
  }
}
