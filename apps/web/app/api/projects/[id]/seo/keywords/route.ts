import { NextResponse } from 'next/server'
import {
  projectListKeywords,
  projectResearchKeywords,
  projectSaveKeywords,
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
    const keywords = await projectListKeywords(auth.projectId)
    return NextResponse.json({ projectId: auth.projectId, keywords })
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
    action?: string
    keywords?: string[]
    seed?: string
    limit?: number
    save?: boolean
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const action = body.action ?? 'research'
  try {
    if (action === 'save' || action === 'hydrate') {
      const keywords = Array.isArray(body.keywords) ? body.keywords : []
      if (keywords.length === 0) {
        return NextResponse.json(
          { error: 'invalid_body', detail: 'keywords are required' },
          { status: 400 },
        )
      }
      const saved = await projectSaveKeywords(auth.projectId, keywords)
      return NextResponse.json({ projectId: auth.projectId, keywords: saved })
    }
    const seed = typeof body.seed === 'string' ? body.seed.trim() : ''
    if (!seed) {
      return NextResponse.json(
        { error: 'invalid_body', detail: 'seed is required' },
        { status: 400 },
      )
    }
    const result = await projectResearchKeywords({
      projectId: auth.projectId,
      seed,
      limit: body.limit,
      save: body.save ?? action === 'hydrate',
    })
    return NextResponse.json({
      projectId: auth.projectId,
      seed,
      ideas: result.ideas,
      keywords: result.saved,
      source: result.ideas[0] ? 'dataforseo_or_fixture' : 'empty',
    })
  } catch (e) {
    return projectSeoErrorResponse(e)
  }
}
