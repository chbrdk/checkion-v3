import { NextResponse } from 'next/server'
import { createDomainScan, listDomainScans } from '../../../lib/fixtures/scan-store'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(request: Request) {
  const url = new URL(request.url)
  const projectId = url.searchParams.get('projectId') ?? undefined
  return NextResponse.json({ items: await listDomainScans(projectId) })
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    projectId?: string
    url?: string
    maxPages?: number
    useSitemap?: boolean
    waitForCompletion?: boolean
  }
  if (!body.projectId || !body.url) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const domain = await createDomainScan({
    projectId: body.projectId,
    url: body.url,
    maxPages: body.maxPages,
    useSitemap: body.useSitemap,
    waitForCompletion: body.waitForCompletion === true,
  })
  return NextResponse.json(domain, { status: 201 })
}
