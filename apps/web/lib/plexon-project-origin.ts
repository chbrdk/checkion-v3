import {
  getFederationMode,
  getPlexonServiceSecret,
  isPlexonFederationConfigured,
  plexonBaseUrl,
} from './runtime-config'
import { getPlexonContractHeaders } from './plexon-contract'

export type CheckionProjectOriginResult = {
  platformProjectId: string
  audionProjectId?: string
  platformCompanyId?: string
}

/**
 * Register a CHECKION-origin project on the Plexon control plane.
 * Returns null when not configured / dummy mode / on failure (caller must not block create).
 */
export async function registerCheckionProjectOnPlexon(params: {
  checkionProjectId: string
  name: string
  domain?: string | null
  ownerPlexonUserId: string
  platformCompanyId: string
}): Promise<CheckionProjectOriginResult | null> {
  if (getFederationMode() !== 'live') return null
  if (!isPlexonFederationConfigured()) return null

  const base = plexonBaseUrl().replace(/\/$/, '')
  const secret = getPlexonServiceSecret()
  const url = `${base}/api/platform/provisioning/checkion-project-origin`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getPlexonContractHeaders(secret),
      },
      body: JSON.stringify({
        checkionProjectId: params.checkionProjectId,
        name: params.name,
        domain: params.domain ?? null,
        ownerPlexonUserId: params.ownerPlexonUserId,
        platformCompanyId: params.platformCompanyId,
      }),
    })
    if (!res.ok) {
      console.warn(
        '[CHECKION-v3] checkion-project-origin failed:',
        res.status,
        await res.text().catch(() => ''),
      )
      return null
    }
    const data = (await res.json()) as Partial<CheckionProjectOriginResult>
    if (typeof data.platformProjectId !== 'string' || !data.platformProjectId.trim()) {
      console.warn('[CHECKION-v3] checkion-project-origin missing platformProjectId')
      return null
    }
    return {
      platformProjectId: data.platformProjectId,
      audionProjectId:
        typeof data.audionProjectId === 'string' ? data.audionProjectId : undefined,
      platformCompanyId:
        typeof data.platformCompanyId === 'string' ? data.platformCompanyId : undefined,
    }
  } catch (e) {
    console.warn(
      '[CHECKION-v3] checkion-project-origin error:',
      e instanceof Error ? e.message : e,
    )
    return null
  }
}

/** Probe plexon-v3 reachability for federation health. */
export async function probePlexonReachable(): Promise<boolean> {
  if (getFederationMode() === 'dummy') return true
  if (!plexonBaseUrl()) return false
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 2500)
    const res = await fetch(`${plexonBaseUrl().replace(/\/$/, '')}/api/health`, {
      signal: ctrl.signal,
      cache: 'no-store',
    })
    clearTimeout(timer)
    return res.ok
  } catch {
    return false
  }
}
