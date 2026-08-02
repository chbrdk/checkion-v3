import { NextResponse } from 'next/server'
import { listApiTokens } from '../../../lib/fixtures/api-tokens-store'

export async function GET() {
  return NextResponse.json({ items: listApiTokens() })
}
