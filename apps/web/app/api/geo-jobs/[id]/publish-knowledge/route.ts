import { NextResponse } from 'next/server'
import { getRequestUser } from '../../../../../lib/auth-api-token'
import { getGeoOverview } from '../../../../../lib/fixtures/geo-store'
import { getProject } from '../../../../../lib/fixtures/project-store'
import {
  fetchCollectionKnowledgePack,
  publishCompetitiveMergeToPack,
  publishGeoContextToPack,
} from '../../../../../lib/plexon-knowledge-pack'
import { isPlexonAuthConfigured } from '../../../../../lib/runtime-config'
import { hostFromUrl } from '../../../../../lib/geo-query-suggest'

export const runtime = 'nodejs'

/**
 * POST /api/geo-jobs/:id/publish-knowledge
 * Explicit publish of geo_context + competitive merge to Collection Knowledge Pack.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (isPlexonAuthConfigured()) {
    const user = await getRequestUser(request)
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const { id } = await ctx.params
  const jobId = id?.trim()
  if (!jobId) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  const overview = await getGeoOverview(jobId)
  if (!overview) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (overview.job.status !== 'completed') {
    return NextResponse.json(
      { error: 'not_ready', detail: 'GEO job must be completed before publish' },
      { status: 409 },
    )
  }

  const project = await getProject(overview.job.projectId)
  const platformProjectId = project?.platformProjectId?.trim() ?? ''
  if (!platformProjectId || platformProjectId.startsWith('plx-local-')) {
    return NextResponse.json(
      {
        error: 'no_collection',
        detail: 'Project is not bound to a Plexon Collection',
      },
      { status: 422 },
    )
  }

  const pack = await fetchCollectionKnowledgePack(platformProjectId)
  if (!pack) {
    return NextResponse.json(
      { error: 'pack_unavailable', detail: 'Could not load Collection knowledge pack' },
      { status: 502 },
    )
  }

  const rivalHosts = (overview.presence.rivals ?? [])
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12)

  const knownCompetitors = [
    ...overview.competitors.map((c) => c.trim().toLowerCase()),
    ...rivalHosts,
  ].filter((h, i, arr) => h && arr.indexOf(h) === i)

  const themes = (overview.insights?.moves ?? overview.recommendations ?? [])
    .map((m) => m.title?.trim())
    .filter((t): t is string => Boolean(t))
    .slice(0, 12)

  const geoPub = await publishGeoContextToPack({
    platformProjectId,
    expectedRevision: pack.revision,
    geoJobId: jobId,
    queryThemes: themes.length ? themes : overview.queries.slice(0, 8).map((q) => q.slice(0, 80)),
    seedQueries: overview.queries.slice(0, 24),
    knownCompetitors,
    targetHosts: [overview.targetHost || hostFromUrl(overview.job.url)].filter(Boolean),
    notes: overview.lede?.slice(0, 500) || null,
  })
  if (!geoPub.ok) {
    return NextResponse.json(
      { error: 'publish_geo_failed', detail: geoPub.error },
      { status: geoPub.status >= 400 ? geoPub.status : 502 },
    )
  }

  const competitivePub = await publishCompetitiveMergeToPack({
    platformProjectId,
    expectedRevision: geoPub.revision,
    geoJobId: jobId,
    hosts: knownCompetitors,
  })
  if (!competitivePub.ok) {
    return NextResponse.json(
      {
        error: 'publish_competitive_failed',
        detail: competitivePub.error,
        geoContextRevision: geoPub.revision,
      },
      { status: competitivePub.status >= 400 ? competitivePub.status : 502 },
    )
  }

  return NextResponse.json({
    success: true,
    platformProjectId,
    revision: competitivePub.revision,
  })
}
