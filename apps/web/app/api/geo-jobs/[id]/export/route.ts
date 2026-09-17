import { NextResponse } from 'next/server'
import { getGeoOverview } from '../../../../../lib/fixtures/geo-store'
import { buildGeoCsv, geoCsvFilename } from '../../../../../lib/geo-csv-export'

export const runtime = 'nodejs'

/**
 * GET /api/geo-jobs/:id/export
 * RFC 4180 CSV of every query×model cell + job presence / EEAT columns.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const jobId = id?.trim()
  if (!jobId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const overview = await getGeoOverview(jobId)
  if (!overview) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const csv = buildGeoCsv(overview)
  const filename = geoCsvFilename(overview.job.id)
  // Uint8Array keeps the UTF-8 BOM — string bodies may drop U+FEFF.
  const bytes = new TextEncoder().encode(csv)

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
