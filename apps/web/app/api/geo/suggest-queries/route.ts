import { NextResponse } from 'next/server'
import { getRequestUser } from '../../../../lib/auth-api-token'
import { suggestGeoQueries } from '../../../../lib/geo-query-suggest'
import { isPlexonAuthConfigured } from '../../../../lib/runtime-config'

export const runtime = 'nodejs'

/**
 * POST /api/geo/suggest-queries
 * Body: { url: string, existing?: string[], max?: number }
 * Fixture (no OPENAI_API_KEY): host-derived pool · Live: OpenAI with fixture fallback.
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
    existing?: string[]
    max?: number
  } | null

  if (!body?.url || typeof body.url !== 'string' || !body.url.trim()) {
    return NextResponse.json({ error: 'invalid_body', detail: 'url is required' }, { status: 400 })
  }

  const result = await suggestGeoQueries({
    url: body.url,
    existing: Array.isArray(body.existing) ? body.existing.map(String) : [],
    max: typeof body.max === 'number' ? body.max : undefined,
  })

  return NextResponse.json(result)
}
