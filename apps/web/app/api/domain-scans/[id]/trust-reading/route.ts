import { NextResponse } from 'next/server'
import { getDomainOverview } from '../../../../../lib/fixtures/scan-store'
import { resolveTrustGeoReading } from '../../../../../lib/domain-trust-reading'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const overview = getDomainOverview(id)
  if (!overview) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!overview.eeat && !overview.generative) {
    return NextResponse.json({ error: 'no_trust_geo' }, { status: 404 })
  }

  const result = await resolveTrustGeoReading(overview)
  return NextResponse.json(result)
}
