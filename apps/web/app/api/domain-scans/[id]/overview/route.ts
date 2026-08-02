import { NextResponse } from 'next/server'
import { getDomainOverview } from '../../../../../lib/fixtures/scan-store'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const overview = await getDomainOverview(id)
  if (!overview) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json(overview)
}
