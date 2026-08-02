import { NextResponse } from 'next/server'
import { auth } from '../../../auth'
import {
  createApiTokenForOwner,
  listApiTokensForOwner,
  toApiTokenOwnerId,
} from '../../../lib/api-tokens'

export async function GET() {
  const session = await auth()
  const ownerId = toApiTokenOwnerId(session?.user)
  return NextResponse.json(await listApiTokensForOwner(ownerId))
}

export async function POST(request: Request) {
  const session = await auth()
  const ownerId = toApiTokenOwnerId(session?.user)
  const body = (await request.json().catch(() => null)) as { label?: string | null } | null
  const created = await createApiTokenForOwner(ownerId, body?.label)
  return NextResponse.json(created, { status: 201 })
}
