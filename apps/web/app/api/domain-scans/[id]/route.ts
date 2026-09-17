import { NextResponse } from 'next/server'
import { getRequestUser } from '../../../../lib/auth-api-token'
import { getDomainScan, updateDomainScanTitle } from '../../../../lib/fixtures/scan-store'
import { normalizeJobTitle } from '../../../../lib/job-title'
import { isPlexonAuthConfigured } from '../../../../lib/runtime-config'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const scan = await getDomainScan(id)
  if (!scan) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json(scan)
}

/**
 * PATCH /api/domain-scans/:id
 * Rename deep crawl — body `{ title }` (1–120 chars).
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (isPlexonAuthConfigured()) {
    const user = await getRequestUser(request)
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const { id } = await context.params
  const scanId = id?.trim()
  if (!scanId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  let body: { title?: unknown }
  try {
    body = (await request.json()) as { title?: unknown }
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (normalizeJobTitle(body.title) == null) {
    return NextResponse.json({ error: 'invalid_title' }, { status: 400 })
  }

  const updated = await updateDomainScanTitle(scanId, body.title)
  if (!updated) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  return NextResponse.json(updated)
}
