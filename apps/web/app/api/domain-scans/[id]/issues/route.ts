import { NextResponse } from 'next/server'
import { getScanIssues } from '../../../../../lib/fixtures/scan-store'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  return NextResponse.json({ items: await getScanIssues(id) })
}
