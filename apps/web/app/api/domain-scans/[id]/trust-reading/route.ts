import { NextResponse } from 'next/server'
import { getDomainOverview } from '../../../../../lib/fixtures/scan-store'
import { resolveTrustGeoReading } from '../../../../../lib/domain-trust-reading'
import { normalizeLocale } from '../../../../../lib/i18n'
import { viewerCanAccessDomainScan } from '../../../../../lib/resource-access'
import {
  forbiddenResponse,
  resolveApiViewerId,
} from '../../../../../lib/resource-access-http'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const viewer = await resolveApiViewerId(request)
  if (!viewer.ok) return viewer.response
  const { id } = await context.params
  if (!(await viewerCanAccessDomainScan(id, viewer.viewerId))) return forbiddenResponse()

  const overview = await getDomainOverview(id)
  if (!overview) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!overview.eeat && !overview.generative) {
    return NextResponse.json({ error: 'no_trust_geo' }, { status: 404 })
  }

  const locale = normalizeLocale(new URL(request.url).searchParams.get('locale'))
  const result = await resolveTrustGeoReading(overview, locale)
  return NextResponse.json(result)
}
