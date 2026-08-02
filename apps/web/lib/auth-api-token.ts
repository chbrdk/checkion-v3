/**
 * Bearer API token auth + getRequestUser (CHECKION v2 parity).
 * Spec: specs/domain/settings-api-tokens.md
 */

import { auth } from '../auth'
import { resolveApiTokenOwner } from './fixtures/api-tokens-store'

/**
 * If request has Authorization: Bearer <token>, resolve token to owner id.
 * Token must be checkion_ + 64 hex. Returns null if missing/invalid.
 */
export async function getUserFromBearerToken(
  request: Request,
): Promise<{ id: string } | null> {
  const resolved = await resolveApiTokenOwner(request.headers.get('Authorization'))
  return resolved ? { id: resolved.ownerId } : null
}

/**
 * Authenticated user for this request: Bearer token first, then session.
 * Use in selected APIs instead of auth() alone when machine clients should work.
 */
export async function getRequestUser(request: Request): Promise<{ id: string } | null> {
  const bearer = await getUserFromBearerToken(request)
  if (bearer) return bearer
  const session = await auth()
  return session?.user?.id ? { id: session.user.id } : null
}
