/**
 * Collection ClientRoom slot publish → Plexon E2.
 * Spec: specs/domain/suite-enterprise-program.md § E2
 */

import { getPlexonContractHeaders } from './plexon-contract'
import { paths } from './paths'
import {
  getFederationMode,
  getPlexonServiceSecret,
  isPlexonFederationConfigured,
  plexonBaseUrl,
} from './runtime-config'

/** Closed ClientRoom slot for CHECKION overview freigabe. */
export const CLIENT_ROOM_SLOT_CHECKION_OVERVIEW = 'checkion_overview' as const

export type PutClientRoomSlotInput = {
  platformProjectId: string
  slotId?: string
  actorUserId: string
} & (
  | {
      clear: true
      productId?: never
      subjectRef?: never
      title?: never
      href?: never
    }
  | {
      clear?: false
      productId: string
      subjectRef: string
      title: string
      href?: string | null
    }
)

export function clientRoomSlotApiPath(platformProjectId: string, slotId: string): string {
  const base = plexonBaseUrl().replace(/\/$/, '')
  return `${base}${paths.plexonProvisioningCollectionClientRoomSlotPath(
    platformProjectId.trim(),
    slotId.trim(),
  )}`
}

function federationLive(): boolean {
  return getFederationMode() === 'live' && isPlexonFederationConfigured()
}

function provisioningHeaders(secret: string, actorUserId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${secret}`,
    ...getPlexonContractHeaders(secret),
    'X-Plexon-User-Id': actorUserId,
  }
}

/**
 * PUT ClientRoom slot (or clear). Returns false when skipped, room missing, or request failed.
 * Never throws.
 */
export async function putClientRoomSlot(input: PutClientRoomSlotInput): Promise<boolean> {
  const platformProjectId = input.platformProjectId?.trim()
  const actorUserId = input.actorUserId?.trim()
  const slotId = (input.slotId ?? CLIENT_ROOM_SLOT_CHECKION_OVERVIEW).trim()
  if (!platformProjectId || !actorUserId || !slotId) return false
  if (!federationLive()) return false

  const secret = getPlexonServiceSecret()
  if (!secret) return false

  let body: Record<string, unknown>
  if (input.clear) {
    body = { clear: true, actorUserId }
  } else {
    const productId = input.productId?.trim()
    const subjectRef = input.subjectRef?.trim()
    const title = input.title?.trim()
    if (!productId || !subjectRef || !title) return false
    body = {
      productId,
      subjectRef,
      title,
      actorUserId,
    }
    const href = input.href?.trim()
    if (href) body.href = href
  }

  try {
    const res = await fetch(clientRoomSlotApiPath(platformProjectId, slotId), {
      method: 'PUT',
      headers: provisioningHeaders(secret, actorUserId),
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    // Room is optional — 404 room_missing is a soft skip.
    if (res.status === 404) return false
    return res.ok
  } catch {
    return false
  }
}

/** Fire-and-forget ClientRoom slot PUT. */
export function schedulePutClientRoomSlot(input: PutClientRoomSlotInput): void {
  void putClientRoomSlot(input).catch(() => undefined)
}
