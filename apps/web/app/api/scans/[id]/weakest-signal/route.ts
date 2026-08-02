import { NextResponse } from 'next/server'
import { getScanOverview } from '../../../../../lib/fixtures/scan-store'
import { resolveWeakestSignalStatement } from '../../../../../lib/weakest-signal-statement'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const overview = getScanOverview(id)
  if (!overview) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const result = await resolveWeakestSignalStatement(overview)
  return NextResponse.json(result)
}
