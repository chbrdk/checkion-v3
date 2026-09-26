import { NextResponse } from 'next/server'
import { projectSuggestResearchSeeds } from '../../../../../../../lib/seo-market/project-service'
import { projectSeoErrorResponse, requireProjectSeoApi } from '../../_shared'

export const runtime = 'nodejs'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const auth = await requireProjectSeoApi(request, id)
  if (!auth.ok) return auth.response
  let body: { locale?: string; seedHint?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    body = {}
  }
  try {
    const result = await projectSuggestResearchSeeds({
      projectId: auth.projectId,
      locale: typeof body.locale === 'string' ? body.locale : undefined,
      seedHint: typeof body.seedHint === 'string' ? body.seedHint : undefined,
    })
    return NextResponse.json(result)
  } catch (e) {
    return projectSeoErrorResponse(e)
  }
}
