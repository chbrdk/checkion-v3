import { NextResponse } from 'next/server'
import { getGeoOverview } from '../../../../../lib/fixtures/geo-store'
import {
  resolveGeoReading,
  type GeoReadingKind,
} from '../../../../../lib/geo-readings'

const KINDS = new Set<GeoReadingKind>(['verdict', 'eeat', 'placement', 'queries', 'query'])

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const overview = getGeoOverview(id)
  if (!overview) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const url = new URL(request.url)
  const kindRaw = url.searchParams.get('kind') ?? 'verdict'
  if (!KINDS.has(kindRaw as GeoReadingKind)) {
    return NextResponse.json({ error: 'invalid_kind' }, { status: 400 })
  }

  const kind = kindRaw as GeoReadingKind
  const query = url.searchParams.get('query') ?? undefined
  if (kind === 'query' && !query?.trim()) {
    return NextResponse.json({ error: 'query_required' }, { status: 400 })
  }

  const result = await resolveGeoReading(overview, kind, query)
  return NextResponse.json(result)
}
