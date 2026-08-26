import { NextResponse } from 'next/server'
import { getDomainOverview } from '../../../../../lib/fixtures/scan-store'
import { resolveTrustGeoReading } from '../../../../../lib/domain-trust-reading'
import { normalizeLocale } from '../../../../../lib/i18n'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const overview = await getDomainOverview(id)
  if (!overview) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!overview.eeat && !overview.generative) {
    return NextResponse.json({ error: 'no_trust_geo' }, { status: 404 })
  }

  const locale = normalizeLocale(new URL(request.url).searchParams.get('locale'))
  const result = await resolveTrustGeoReading(overview, locale)
  return NextResponse.json(result)
}
