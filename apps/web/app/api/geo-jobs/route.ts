import { NextResponse } from 'next/server'
import { getRequestUser } from '../../../lib/auth-api-token'
import { createGeoJob, listGeoJobs } from '../../../lib/fixtures/geo-store'
import { resolveGeoLaunchProjectId } from '../../../lib/geo-launch-project'
import { hasOpenAIKey } from '../../../lib/llm/config'
import { shouldRunLiveGeo } from '../../../lib/geo-eeat/live-geo-gate'
import { isPlexonAuthConfigured } from '../../../lib/runtime-config'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET() {
  return NextResponse.json({ items: await listGeoJobs() })
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
    url?: string
    queries?: string[]
    models?: string[]
    competitors?: string[]
    title?: string
    includePageScan?: boolean
    waitForCompletion?: boolean
  }

  // companyId / platformCompanyId are NOT required on this endpoint (unlike
  // POST /api/projects federation). Required: url + non-empty queries.
  // projectId is resolved silently when omitted / empty (GEO launch hides Project).
  if (!body.url || !Array.isArray(body.queries) || body.queries.length === 0) {
    return NextResponse.json(
      { error: 'invalid_body', detail: 'url and non-empty queries are required' },
      { status: 400 },
    )
  }

  const queries = body.queries.map((q) => String(q).trim()).filter(Boolean)
  if (queries.length === 0) {
    return NextResponse.json({ error: 'invalid_body', detail: 'queries must be non-empty' }, { status: 400 })
  }

  if (shouldRunLiveGeo() && !hasOpenAIKey()) {
    return NextResponse.json(
      { error: 'openai_key_required', detail: 'OPENAI_API_KEY is required for live GEO' },
      { status: 400 },
    )
  }

  const resolved = await resolveGeoLaunchProjectId(request, {
    projectId: body.projectId,
    url: body.url,
  })
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error, detail: resolved.detail },
      { status: 400 },
    )
  }

  const job = await createGeoJob({
    projectId: resolved.projectId,
    url: body.url,
    queries,
    models: body.models?.map((m) => String(m).trim()).filter(Boolean),
    competitors: body.competitors?.map((c) => String(c).trim()).filter(Boolean),
    title: body.title,
    includePageScan: body.includePageScan,
    waitForCompletion: body.waitForCompletion === true,
  })

  return NextResponse.json(
    {
      success: true,
      jobId: job.id,
      status: job.status,
      job,
      projectId: resolved.projectId,
      projectCreated: resolved.created,
    },
    { status: 202 },
  )
}
