import { NextResponse } from 'next/server'
import { getScanScores } from '../../../../../lib/fixtures/scan-store'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  return NextResponse.json({ items: await getScanScores(id) })
}
