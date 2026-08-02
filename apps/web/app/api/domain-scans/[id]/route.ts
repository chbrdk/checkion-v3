import { NextResponse } from 'next/server'
import { getDomainScan } from '../../../../lib/fixtures/scan-store'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const scan = await getDomainScan(id)
  if (!scan) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json(scan)
}
