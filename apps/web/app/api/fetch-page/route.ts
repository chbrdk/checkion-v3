import { NextResponse } from 'next/server'
import type { FetchPageResponse } from '@checkion-v3/contracts'
import { getRequestUser } from '../../../lib/auth-api-token'
import { isPlexonAuthConfigured } from '../../../lib/runtime-config'
import { fetchPageText } from '../../../lib/scan/fetch-page-text'
import { normalizeFetchPageUrl } from '../../../lib/scan/fetch-page-url'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: Request) {
  if (isPlexonAuthConfigured()) {
    const user = await getRequestUser(request)
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  let body: { url?: string }
  try {
    body = (await request.json()) as { url?: string }
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const normalized = normalizeFetchPageUrl(body.url ?? '')
  if ('error' in normalized) {
    return NextResponse.json({ error: normalized.error }, { status: 400 })
  }

  try {
    const result = await fetchPageText(normalized.url)
    const payload: FetchPageResponse = {
      url: result.url,
      finalUrl: result.finalUrl,
      title: result.title,
      bodyTextExcerpt: result.bodyTextExcerpt,
      httpStatus: result.httpStatus,
      stubbed: result.stubbed,
    }
    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'fetch_page_failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
