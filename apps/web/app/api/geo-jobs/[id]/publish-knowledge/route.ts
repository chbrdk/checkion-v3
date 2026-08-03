import { NextResponse } from 'next/server'
import { getRequestUser } from '../../../../../lib/auth-api-token'
import { publishGeoJobKnowledge } from '../../../../../lib/knowledge-pack-autosync'
import { isPlexonAuthConfigured } from '../../../../../lib/runtime-config'

export const runtime = 'nodejs'

/**
 * POST /api/geo-jobs/:id/publish-knowledge
 * Publish geo_context + competitive merge to Collection Knowledge Pack
 * (manual re-sync; autosync already runs on job completion when live).
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

  const published = await publishGeoJobKnowledge({ jobId })
  if (!published.ok) {
    return NextResponse.json(
      {
        error: published.error,
        detail: published.detail,
        ...(published.geoContextRevision != null
          ? { geoContextRevision: published.geoContextRevision }
          : {}),
      },
      { status: published.status },
    )
  }

  return NextResponse.json({
    success: true,
    platformProjectId: published.platformProjectId,
    revision: published.revision,
  })
}
