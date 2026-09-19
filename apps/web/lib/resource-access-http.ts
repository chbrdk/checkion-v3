/**
 * HTTP helpers for Access Model B on run APIs.
 * Spec: specs/domain/access-model-b-visibility.md
 */

import { NextResponse } from 'next/server'
import { getRequestUser } from './auth-api-token'
import { isPlexonAuthConfigured } from './runtime-config'

export async function resolveApiViewerId(request: Request): Promise<
  | { ok: true; viewerId: string | null }
  | { ok: false; response: NextResponse }
> {
  const user = await getRequestUser(request)
  if (isPlexonAuthConfigured() && !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    }
  }
  return { ok: true, viewerId: user?.id ?? null }
}

export function forbiddenResponse(): NextResponse {
  return NextResponse.json({ error: 'forbidden' }, { status: 403 })
}
