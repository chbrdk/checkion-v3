import { NextResponse } from 'next/server'
import {
  projectGscAuthorizeUrl,
  projectGscStatus,
} from '../../../../../../../../lib/seo-market/project-service'
import { projectSeoErrorResponse, requireProjectSeoApi } from '../../../_shared'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const auth = await requireProjectSeoApi(request, id)
  if (!auth.ok) return auth.response
  try {
    const status = await projectGscStatus(auth.projectId)
    if (!status.oauthConfigured) {
      return NextResponse.json(
        { error: 'gsc_oauth_unconfigured', detail: 'GOOGLE_CLIENT_ID/SECRET required' },
        { status: 503 },
      )
    }
    const origin = new URL(request.url).origin
    const state = randomBytes(16).toString('hex')
    const authorizeUrl = projectGscAuthorizeUrl({
      projectId: auth.projectId,
      origin,
      state,
    })
    return NextResponse.json({ authorizeUrl, state })
  } catch (e) {
    return projectSeoErrorResponse(e)
  }
}
