import { NextResponse } from 'next/server'
import { createDomainScan } from '../../../lib/fixtures/scan-store'
import {
  listDomainScansForViewer,
  viewerCanAccessProjectId,
} from '../../../lib/resource-access'
import {
  forbiddenResponse,
  resolveApiViewerId,
} from '../../../lib/resource-access-http'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(request: Request) {
  const viewer = await resolveApiViewerId(request)
  if (!viewer.ok) return viewer.response
  const url = new URL(request.url)
  const projectId = url.searchParams.get('projectId') ?? undefined
  return NextResponse.json({
    items: await listDomainScansForViewer(viewer.viewerId, projectId),
  })
}

export async function POST(request: Request) {
  const viewer = await resolveApiViewerId(request)
  if (!viewer.ok) return viewer.response

  const body = (await request.json()) as {
    projectId?: string
    url?: string
    maxPages?: number
    useSitemap?: boolean
    waitForCompletion?: boolean
    skipUnchangedPages?: boolean
  }
  if (!body.projectId || !body.url) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  if (!(await viewerCanAccessProjectId(body.projectId, viewer.viewerId))) {
    return forbiddenResponse()
  }
  const domain = await createDomainScan({
    projectId: body.projectId,
    url: body.url,
    maxPages: body.maxPages,
    useSitemap: body.useSitemap,
    waitForCompletion: body.waitForCompletion === true,
    skipUnchangedPages: body.skipUnchangedPages,
  })
  return NextResponse.json(domain, { status: 201 })
}
