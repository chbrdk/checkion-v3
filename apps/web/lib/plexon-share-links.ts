/**
 * Collection Share Links upsert → Plexon.
 * Spec: plexon-v3/specs/domain/collection-share-links.md
 */

import { getPlexonContractHeaders } from './plexon-contract'
import {
  getFederationMode,
  getPlexonServiceSecret,
  isPlexonFederationConfigured,
  plexonBaseUrl,
} from './runtime-config'

export type UpsertShareLinkInput = {
  platformProjectId: string
  productId: string
  shareId: string
  kind: string
  title: string
  href?: string | null
  expiresAt?: string | null
  revoked?: boolean
  actorUserId?: string | null
  meta?: Record<string, unknown>
}

export function shareLinksApiPath(platformProjectId: string): string {
  const base = plexonBaseUrl().replace(/\/$/, '')
  return `${base}/api/platform/provisioning/collections/${encodeURIComponent(platformProjectId.trim())}/share-links`
}

function federationLive(): boolean {
  return getFederationMode() === 'live' && isPlexonFederationConfigured()
}

function provisioningHeaders(secret: string, actorUserId?: string | null): HeadersInit {
  const actor = actorUserId?.trim()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${secret}`,
    ...getPlexonContractHeaders(secret),
    ...(actor ? { 'X-Plexon-User-Id': actor } : {}),
  }
}

/** POST share-link projection. Never throws. */
export async function upsertShareLink(input: UpsertShareLinkInput): Promise<boolean> {
  const platformProjectId = input.platformProjectId?.trim()
  const productId = input.productId?.trim()
  const shareId = input.shareId?.trim()
  const kind = input.kind?.trim()
  const title = input.title?.trim()
  const actorUserId = input.actorUserId?.trim()
  if (!platformProjectId || !productId || !shareId || !kind || !title || !actorUserId) {
    return false
  }
  if (!federationLive()) return false

  const secret = getPlexonServiceSecret()
  if (!secret) return false

  const body: Record<string, unknown> = {
    actorUserId,
    productId,
    shareId,
    kind,
    title,
  }
  const href = input.href?.trim()
  if (href) body.href = href
  if (input.expiresAt) body.expiresAt = input.expiresAt
  if (input.revoked) body.revoked = true
  if (input.meta) body.meta = input.meta

  try {
    const res = await fetch(shareLinksApiPath(platformProjectId), {
      method: 'POST',
      headers: provisioningHeaders(secret, actorUserId),
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    return res.ok
  } catch {
    return false
  }
}

export function scheduleUpsertShareLink(input: UpsertShareLinkInput): void {
  void upsertShareLink(input).catch(() => undefined)
}
