import { NextResponse } from 'next/server'
import { getRequestUser } from '../../../../lib/auth-api-token'
import { suggestGeoQueries } from '../../../../lib/geo-query-suggest'
import { isPlexonAuthConfigured } from '../../../../lib/runtime-config'

export const runtime = 'nodejs'

/**
 * POST /api/geo/suggest-queries
 * Body: { url?, companyName?, project?: { name?, domain? }, existing?, max? }
 * Requires url and/or companyName.
 * Fixture (no OPENAI_API_KEY): brand-derived pool · Live: OpenAI with fixture fallback.
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
    existing?: string[]
    max?: number
  } | null

  const url = typeof body?.url === 'string' ? body.url.trim() : ''
  const companyName =
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

  const result = await suggestGeoQueries({
    url: url || undefined,
    companyName: companyName || undefined,
    project,
    existing: Array.isArray(body?.existing) ? body!.existing.map(String) : [],
    max: typeof body?.max === 'number' ? body.max : undefined,
  })

  return NextResponse.json(result)
}
