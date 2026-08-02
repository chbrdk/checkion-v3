import { NextResponse } from 'next/server'
import { createScan, listScans } from '../../../lib/fixtures/scan-store'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(request: Request) {
  const url = new URL(request.url)
  const projectId = url.searchParams.get('projectId') ?? undefined
  return NextResponse.json({ items: await listScans(projectId) })
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    projectId?: string
    mode?: 'single' | 'deep'
    url?: string
    waitForCompletion?: boolean
  }
  if (!body.projectId || !body.mode || !body.url) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const scan = await createScan({
    projectId: body.projectId,
    mode: body.mode,
    url: body.url,
    waitForCompletion: body.waitForCompletion === true,
  })
  return NextResponse.json(scan, { status: 201 })
}
