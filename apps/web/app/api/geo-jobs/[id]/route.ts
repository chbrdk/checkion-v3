import { NextResponse } from 'next/server'
import { getGeoJob, getGeoOverview } from '../../../../lib/fixtures/geo-store'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const overview = await getGeoOverview(id)
  if (overview) return NextResponse.json(overview)

  const job = await getGeoJob(id)
  if (!job) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ job })
}
