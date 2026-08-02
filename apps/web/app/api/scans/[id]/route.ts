import { NextResponse } from 'next/server'
import { deleteScan, getScan } from '../../../../lib/fixtures/scan-store'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const scan = await getScan(id)
  if (!scan) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json(scan)
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const ok = await deleteScan(id)
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
