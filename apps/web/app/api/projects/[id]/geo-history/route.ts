import { NextResponse } from 'next/server'
import { parseGeoMeasurement } from '../../../../../lib/geo/measurement'
import {
  buildGeoPositionHistory,
  clampGeoHistoryJobLimit,
} from '../../../../../lib/geo/position-history'
import { listGeoOverviewsForProject } from '../../../../../lib/fixtures/geo-store'
import { getProject } from '../../../../../lib/fixtures/project-store'

export const runtime = 'nodejs'

/**
 * GET /api/projects/:id/geo-history
 * Soft-match citation position series — specs/api/geo-position-history.md
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const projectId = id?.trim()
  if (!projectId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const project = await getProject(projectId)
  if (!project) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const url = new URL(request.url)
  const measurement = parseGeoMeasurement(url.searchParams.get('measurement'))
  const limit = clampGeoHistoryJobLimit(url.searchParams.get('limit'))
  const overviews = await listGeoOverviewsForProject(projectId)
  const result = buildGeoPositionHistory({
    projectId,
    measurement,
    overviews,
    limit,
  })
  return NextResponse.json(result)
}
