import { NextResponse } from 'next/server'
import { getDomainOverview } from '../../../../../lib/fixtures/scan-store'
import { resolveSeoReading } from '../../../../../lib/domain-seo-reading'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const overview = await getDomainOverview(id)
  if (!overview) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!overview.seoCoverage) {
    return NextResponse.json({ error: 'no_seo' }, { status: 404 })
  }

  const result = await resolveSeoReading(overview)
  return NextResponse.json(result)
}
