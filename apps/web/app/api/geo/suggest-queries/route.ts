import { NextResponse } from 'next/server'
import { getRequestUser } from '../../../../lib/auth-api-token'
import { suggestGeoQueries } from '../../../../lib/geo-query-suggest'
import { getProject } from '../../../../lib/fixtures/project-store'
import {
  enrichmentHasSignal,
  resolveKnowledgeEnrichment,
  type GeoKnowledgeEnrichment,
} from '../../../../lib/plexon-knowledge-pack'
import { isPlexonAuthConfigured } from '../../../../lib/runtime-config'

export const runtime = 'nodejs'

/**
 * POST /api/geo/suggest-queries
 * Body: { url?, companyName?, project?, platformProjectId?, knowledge?, existing?, max? }
 * When Collection binding known, server may pull Knowledge Pack (live federation).
 */
export async function POST(request: Request) {
  if (isPlexonAuthConfigured()) {
    const user = await getRequestUser(request)
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const body = (await request.json().catch(() => null)) as {
    url?: string
    companyName?: string
    project?: { name?: string; domain?: string }
    projectId?: string
    platformProjectId?: string
    knowledge?: GeoKnowledgeEnrichment
    existing?: string[]
    max?: number
  } | null

  const url = typeof body?.url === 'string' ? body.url.trim() : ''
  let companyName =
    typeof body?.companyName === 'string' ? body.companyName.trim() : ''
  if (!url && !companyName) {
    return NextResponse.json(
      { error: 'invalid_body', detail: 'url or companyName is required' },
      { status: 400 },
    )
  }

  const project =
    body?.project && typeof body.project === 'object'
      ? {
          name:
            typeof body.project.name === 'string' ? body.project.name.trim() : undefined,
          domain:
            typeof body.project.domain === 'string'
              ? body.project.domain.trim()
              : undefined,
        }
      : undefined

  let platformProjectId =
    typeof body?.platformProjectId === 'string' ? body.platformProjectId.trim() : ''
  if (!platformProjectId && typeof body?.projectId === 'string' && body.projectId.trim()) {
    const local = await getProject(body.projectId.trim())
    if (local?.platformProjectId && !local.platformProjectId.startsWith('plx-local-')) {
      platformProjectId = local.platformProjectId
    }
    if (!companyName && local?.name) companyName = local.name
  }

  const knowledge = await resolveKnowledgeEnrichment({
    platformProjectId: platformProjectId || null,
    clientKnowledge: body?.knowledge ?? null,
  })

  if (!companyName && knowledge?.profile?.displayName) {
    companyName = knowledge.profile.displayName
  }

  const result = await suggestGeoQueries({
    url: url || undefined,
    companyName: companyName || undefined,
    project,
    knowledge: knowledge ?? undefined,
    existing: Array.isArray(body?.existing) ? body!.existing.map(String) : [],
    max: typeof body?.max === 'number' ? body.max : undefined,
  })

  return NextResponse.json({
    ...result,
    usedCollectionKnowledge:
      result.usedCollectionKnowledge || enrichmentHasSignal(knowledge),
  })
}
