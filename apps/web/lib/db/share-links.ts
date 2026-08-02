import { and, desc, eq } from 'drizzle-orm'
import type { ShareLink } from '@checkion-v3/contracts'
import { getDb } from './client'
import { shareLinks, type ShareLinkRow } from './schema'

function rowToShare(row: ShareLinkRow): ShareLink {
  return {
    token: row.token,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    createdAt: row.createdAt,
  }
}

function newToken(): string {
  return `sh_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

export async function dbFindShare(
  resourceType: ShareLink['resourceType'],
  resourceId: string,
): Promise<ShareLink | null> {
  const db = getDb()
  const rows = await db
    .select()
    .from(shareLinks)
    .where(
      and(eq(shareLinks.resourceType, resourceType), eq(shareLinks.resourceId, resourceId)),
    )
    .limit(1)
  const row = rows[0]
  return row ? rowToShare(row) : null
}

export async function dbGetShare(token: string): Promise<ShareLink | null> {
  const db = getDb()
  const rows = await db.select().from(shareLinks).where(eq(shareLinks.token, token)).limit(1)
  const row = rows[0]
  return row ? rowToShare(row) : null
}

export async function dbListShares(): Promise<ShareLink[]> {
  const db = getDb()
  const rows = await db.select().from(shareLinks).orderBy(desc(shareLinks.updatedAt))
  return rows.map(rowToShare)
}

export async function dbCreateShare(
  resourceType: ShareLink['resourceType'],
  resourceId: string,
): Promise<ShareLink> {
  const existing = await dbFindShare(resourceType, resourceId)
  if (existing) return existing
  const created: ShareLink = {
    token: newToken(),
    resourceType,
    resourceId,
    createdAt: new Date().toISOString(),
  }
  const db = getDb()
  await db.insert(shareLinks).values({
    token: created.token,
    resourceType: created.resourceType,
    resourceId: created.resourceId,
    createdAt: created.createdAt,
    payload: {},
    updatedAt: new Date(),
  })
  return created
}

export async function dbDeleteShare(token: string): Promise<boolean> {
  const existing = await dbGetShare(token)
  if (!existing) return false
  const db = getDb()
  await db.delete(shareLinks).where(eq(shareLinks.token, token))
  return true
}
