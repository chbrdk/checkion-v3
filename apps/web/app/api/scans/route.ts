import { NextResponse } from 'next/server'
import { getRequestUser } from '../../../lib/auth-api-token'
import { createScan, listScans } from '../../../lib/fixtures/scan-store'
import { isPlexonAuthConfigured } from '../../../lib/runtime-config'
import { parseScanCorrelation } from '../../../lib/scan-correlation'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(request: Request) {
  const url = new URL(request.url)
  const projectId = url.searchParams.get('projectId') ?? undefined
  return NextResponse.json({ items: await listScans(projectId) })
}

export async function POST(request: Request) {
  if (isPlexonAuthConfigured()) {
    const user = await getRequestUser(request)
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const body = (await request.json()) as {
    projectId?: string
    mode?: 'single' | 'deep'
    url?: string
    waitForCompletion?: boolean
    platformProjectId?: string
    audionRunId?: string
    stepUrl?: string
  }
  if (!body.projectId || !body.mode || !body.url) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  if (body.mode !== 'single' && body.mode !== 'deep') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const scan = await createScan({
    projectId: body.projectId,
    mode: body.mode,
    url: body.url,
    waitForCompletion: body.waitForCompletion === true,
    correlation: parseScanCorrelation(body),
  })
  return NextResponse.json(scan, { status: 201 })
}
