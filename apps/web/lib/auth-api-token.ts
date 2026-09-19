/**
 * Bearer API token auth + getRequestUser (CHECKION v2 parity).
 * Spec: specs/domain/settings-api-tokens.md · plexon assistant-actor-identity.md
 *
 * Machine credential (env CHECKION_API_TOKEN or PLEXON_SERVICE_SECRET) is not a viewer —
 * viewer comes from X-Plexon-User-Id (fail closed when machine auth is used).
 */

import { resolveApiTokenOwner } from './fixtures/api-tokens-store'
import {
  isProvisioningAuthorized,
  PLEXON_SERVICE_SECRET_HEADER,
} from './plexon-contract'
import { paths } from './paths'
import { getPlexonServiceSecret } from './runtime-config'

export const PLEXON_USER_ID_HEADER = 'X-Plexon-User-Id'

function extractRawBearer(authorization: string | null | undefined): string | null {
  if (!authorization) return null
  let raw = authorization.trim()
  if (raw.toLowerCase().startsWith('bearer ')) raw = raw.slice(7).trim()
  return raw || null
}

/** Coolify / MCP machine token — not a personal Settings viewer identity. */
export function isCheckionMachineEnvToken(rawBearer: string | null | undefined): boolean {
  const raw = extractRawBearer(rawBearer)
  if (!raw) return false
  const envTok =
    process.env[paths.envCheckionApiToken]?.trim() ||
    process.env.CHECKION_SERVICE_TOKEN?.trim() ||
    ''
  return Boolean(envTok && raw === envTok)
}

/**
 * If request has Authorization: Bearer <token>, resolve token to owner id.
 * Token must be checkion_ + 64 hex. Returns null if missing/invalid.
 * Machine env token does not resolve to a viewer here (use getRequestUser).
 */
export async function getUserFromBearerToken(
  request: Request,
): Promise<{ id: string } | null> {
  if (isCheckionMachineEnvToken(request.headers.get('Authorization'))) {
    return null
  }
  const resolved = await resolveApiTokenOwner(request.headers.get('Authorization'))
  return resolved ? { id: resolved.ownerId } : null
}

/**
 * Authenticated user for this request.
 * Order: service secret + actor → machine Bearer + actor → personal Bearer → session.
 */
export async function getRequestUser(request: Request): Promise<{ id: string } | null> {
  const actor = request.headers.get(PLEXON_USER_ID_HEADER)?.trim() || ''
  const secret = getPlexonServiceSecret()
  if (secret && isProvisioningAuthorized(request, secret)) {
    return actor ? { id: actor } : null
  }

  if (isCheckionMachineEnvToken(request.headers.get('Authorization'))) {
    return actor ? { id: actor } : null
  }

  const bearer = await getUserFromBearerToken(request)
  if (bearer) return bearer

  const { auth } = await import('../auth')
  const session = await auth()
  return session?.user?.id ? { id: session.user.id } : null
}

/** @deprecated — prefer getRequestUser; kept for call-site clarity in tests. */
export function hasServiceSecretHeader(request: Request): boolean {
  return Boolean(request.headers.get(PLEXON_SERVICE_SECRET_HEADER)?.trim())
}
