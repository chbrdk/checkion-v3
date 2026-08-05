import { NextResponse } from 'next/server'
import { listActiveDomainScans } from '../../../../../../lib/fixtures/scan-store'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params
  const scans = await listActiveDomainScans(projectId)
  return NextResponse.json({ data: scans })
}
