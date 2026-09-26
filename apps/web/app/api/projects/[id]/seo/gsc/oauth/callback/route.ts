import { NextResponse } from 'next/server'
import { projectGscOAuthCallback } from '../../../../../../../../lib/seo-market/project-service'
import { paths } from '../../../../../../../../lib/paths'
import { requireProjectSeoApi } from '../../../_shared'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const auth = await requireProjectSeoApi(request, id)
  const origin = new URL(request.url).origin
  const workspaceHref = `${origin}${paths.routes.projectSeo(id, 'gsc')}`
  if (!auth.ok) {
    return NextResponse.redirect(`${workspaceHref}?gsc=auth_failed`)
  }
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const err = url.searchParams.get('error')
  if (err || !code) {
    return NextResponse.redirect(`${workspaceHref}?gsc=denied`)
  }
  try {
    await projectGscOAuthCallback({
      projectId: auth.projectId,
      code,
      origin,
    })
    return NextResponse.redirect(`${workspaceHref}?gsc=connected`)
  } catch {
    return NextResponse.redirect(`${workspaceHref}?gsc=error`)
  }
}
