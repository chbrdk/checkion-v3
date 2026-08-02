import { NextResponse } from 'next/server'
import { verifyApiTokenBearer } from '../../../../lib/api-tokens'

/** Smoke: Authorization Bearer → owner, or 401. */
export async function POST(request: Request) {
  const result = await verifyApiTokenBearer(request.headers.get('Authorization'))
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result)
}
