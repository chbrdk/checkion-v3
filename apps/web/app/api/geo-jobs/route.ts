import { NextResponse } from 'next/server'
import { getRequestUser } from '../../../lib/auth-api-token'
import { createGeoJob, listGeoJobs } from '../../../lib/fixtures/geo-store'
import { resolveGeoLaunchProjectId } from '../../../lib/geo-launch-project'
import {
  normalizeGeoUrl,
  urlFromCompanyName,
} from '../../../lib/geo-query-suggest'
import { hasAnyGeoLlmKey } from '../../../lib/llm/config'
import { shouldRunLiveGeo } from '../../../lib/geo-eeat/live-geo-gate'
import { getProject } from '../../../lib/fixtures/project-store'
import {
  competitorHostsFromEnrichment,
  resolveKnowledgeEnrichment,
} from '../../../lib/plexon-knowledge-pack'
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
    platformProjectId?: string
    url?: string
    companyName?: string
    queries?: string[]
    models?: string[]
    competitors?: string[]
    title?: string
    includePageScan?: boolean
    waitForCompletion?: boolean
  }

  const companyName =
    typeof body.companyName === 'string' ? body.companyName.trim() : ''
  const resolvedUrl =
    normalizeGeoUrl(body.url) || (companyName ? urlFromCompanyName(companyName) : null)

  let platformProjectId =
    typeof body.platformProjectId === 'string' ? body.platformProjectId.trim() : ''
  if (!platformProjectId && body.projectId?.trim()) {
    const local = await getProject(body.projectId.trim())
    if (local?.platformProjectId && !local.platformProjectId.startsWith('plx-local-')) {
      platformProjectId = local.platformProjectId
    }
  }

  const knowledge = await resolveKnowledgeEnrichment({
    platformProjectId: platformProjectId || null,
  })

  const packCompetitors = competitorHostsFromEnrichment(knowledge)
  const packSeeds = knowledge?.geoContext?.seedQueries ?? []

  let queries = Array.isArray(body.queries)
    ? body.queries.map((q) => String(q).trim()).filter(Boolean)
    : []
  if (queries.length === 0 && packSeeds.length > 0) {
    queries = packSeeds.slice(0, 8)
  }

  if (!resolvedUrl || queries.length === 0) {
    return NextResponse.json(
      {
        error: 'invalid_body',
        detail: 'url or companyName, and non-empty queries, are required',
      },
      { status: 400 },
    )
  }

  if (shouldRunLiveGeo() && !hasAnyGeoLlmKey()) {
    return NextResponse.json(
      {
        error: 'llm_key_required',
        detail:
          'At least one of OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY (or GOOGLE_API_KEY) is required for live GEO',
      },
      { status: 400 },
    )
  }

  const resolved = await resolveGeoLaunchProjectId(request, {
    projectId: body.projectId,
    url: resolvedUrl,
    companyName:
      companyName ||
      knowledge?.profile?.displayName ||
      undefined,
  })
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error, detail: resolved.detail },
      { status: 400 },
    )
  }

  const title =
    (typeof body.title === 'string' && body.title.trim()) ||
    companyName ||
    knowledge?.profile?.displayName ||
    undefined

  const explicitCompetitors =
    body.competitors?.map((c) => String(c).trim()).filter(Boolean) ?? []
  const competitors =
    explicitCompetitors.length > 0 ? explicitCompetitors : packCompetitors

  const job = await createGeoJob({
    projectId: resolved.projectId,
    url: resolvedUrl,
    queries,
    models: body.models?.map((m) => String(m).trim()).filter(Boolean),
    competitors,
    title,
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
      usedCollectionKnowledge: Boolean(knowledge && (packCompetitors.length || packSeeds.length)),
    },
    { status: 202 },
  )
}
