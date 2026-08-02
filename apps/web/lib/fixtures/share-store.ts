import type { ShareLink } from '@checkion-v3/contracts'

let shares: ShareLink[] = [
  {
    token: 'sh_demo_single_1',
    resourceType: 'single',
    resourceId: 'scan-single-1',
    createdAt: '2026-07-28T11:00:00.000Z',
  },
  {
    token: 'sh_demo_domain_1',
    resourceType: 'domain',
    resourceId: 'domain-1',
    createdAt: '2026-07-21T09:00:00.000Z',
  },
  {
    token: 'sh_demo_shop_cart',
    resourceType: 'single',
    resourceId: 'scan-single-4',
    createdAt: '2026-07-26T10:00:00.000Z',
  },
]

function newToken(): string {
  return `sh_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

export function findShare(
  resourceType: ShareLink['resourceType'],
  resourceId: string,
): ShareLink | null {
  return (
    shares.find((s) => s.resourceType === resourceType && s.resourceId === resourceId) ??
    null
  )
}

export function getShare(token: string): ShareLink | null {
  return shares.find((s) => s.token === token) ?? null
}

export function listShares(): ShareLink[] {
  return [...shares]
}

export function createShare(
  resourceType: ShareLink['resourceType'],
  resourceId: string,
): ShareLink {
  const existing = findShare(resourceType, resourceId)
  if (existing) return existing
  const created: ShareLink = {
    token: newToken(),
    resourceType,
    resourceId,
    createdAt: new Date().toISOString(),
  }
  shares = [created, ...shares]
  return created
}

export function deleteShare(token: string): boolean {
  const before = shares.length
  shares = shares.filter((s) => s.token !== token)
  return shares.length < before
}
