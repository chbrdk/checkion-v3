import { NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import { revokeApiTokenForOwner, toApiTokenOwnerId } from '../../../../lib/api-tokens'

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ tokenId: string }> },
) {
  const session = await auth()
  const ownerId = toApiTokenOwnerId(session?.user)
  const { tokenId } = await context.params
  const result = await revokeApiTokenForOwner(tokenId ?? '', ownerId)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ ok: true })
}
