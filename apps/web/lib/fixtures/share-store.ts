import type { ShareLink } from '@checkion-v3/contracts'
import { isDatabaseConfigured } from '../db/config'

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

async function dbApi() {
  return import('../db/share-links')
}

function newToken(): string {
  return `sh_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

function memoryFindShare(
  resourceType: ShareLink['resourceType'],
  resourceId: string,
): ShareLink | null {
  return (
    shares.find((s) => s.resourceType === resourceType && s.resourceId === resourceId) ??
    null
  )
}

export async function findShare(
  resourceType: ShareLink['resourceType'],
  resourceId: string,
): Promise<ShareLink | null> {
  if (isDatabaseConfigured()) return (await dbApi()).dbFindShare(resourceType, resourceId)
  return memoryFindShare(resourceType, resourceId)
}

export async function getShare(token: string): Promise<ShareLink | null> {
  if (isDatabaseConfigured()) return (await dbApi()).dbGetShare(token)
  return shares.find((s) => s.token === token) ?? null
}

export async function listShares(): Promise<ShareLink[]> {
  if (isDatabaseConfigured()) return (await dbApi()).dbListShares()
  return [...shares]
}

export async function createShare(
  resourceType: ShareLink['resourceType'],
  resourceId: string,
): Promise<ShareLink> {
  if (isDatabaseConfigured()) return (await dbApi()).dbCreateShare(resourceType, resourceId)
  const existing = memoryFindShare(resourceType, resourceId)
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

export async function deleteShare(token: string): Promise<boolean> {
  if (isDatabaseConfigured()) return (await dbApi()).dbDeleteShare(token)
  const before = shares.length
  shares = shares.filter((s) => s.token !== token)
  return shares.length < before
}
