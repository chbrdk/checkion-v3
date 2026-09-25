/**
 * Collection activity distillate (E1) → Plexon provisioning.
 * Spec: specs/domain/suite-enterprise-program.md § E1
 */

import { getPlexonContractHeaders } from './plexon-contract'
import {
  getFederationMode,
  getPlexonServiceSecret,
  isPlexonFederationConfigured,
  plexonBaseUrl,
} from './runtime-config'

export type PostCollectionActivityInput = {
  platformProjectId: string
  productId: string
  kind: string
  status: string
  subjectRef: string
  title: string
  href?: string | null
  at?: string | null
  actorUserId?: string | null
}

export function collectionActivityApiPath(platformProjectId: string): string {
  const base = plexonBaseUrl().replace(/\/$/, '')
  return `${base}/api/platform/provisioning/collections/${encodeURIComponent(platformProjectId.trim())}/activity`
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

export async function postCollectionActivityDistillate(
  input: PostCollectionActivityInput,
): Promise<boolean> {
  const platformProjectId = input.platformProjectId?.trim()
  const productId = input.productId?.trim()
  const subjectRef = input.subjectRef?.trim()
  const title = input.title?.trim()
  if (!platformProjectId || !productId || !subjectRef || !title) return false
  if (!federationLive()) return false

  const secret = getPlexonServiceSecret()
  if (!secret) return false

  const body: Record<string, unknown> = {
    productId,
    kind: input.kind.trim(),
    status: input.status.trim(),
    subjectRef,
    title,
  }
  const href = input.href?.trim()
  if (href) body.href = href
  const at = input.at?.trim()
  if (at) body.at = at
  const actorUserId = input.actorUserId?.trim()
  if (actorUserId) body.actorUserId = actorUserId

  try {
    const res = await fetch(collectionActivityApiPath(platformProjectId), {
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

export function scheduleCollectionActivityDistillate(input: PostCollectionActivityInput): void {
  void postCollectionActivityDistillate(input).catch(() => undefined)
}
