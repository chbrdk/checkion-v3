import { and, desc, eq } from 'drizzle-orm'
import { createHash, randomBytes } from 'node:crypto'
import type { ApiTokenStub } from '@checkion-v3/contracts'
import { paths } from '../paths'
import { getDb } from './client'
import { apiTokens, type ApiTokenRow } from './schema'

type ApiTokenRecord = {
  id: string
  ownerId: string
  label: string
  prefix: string
  tokenHash: string
  createdAt: string
  lastUsedAt: string | null
}

function hashApiToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex')
}

function generateApiTokenString(): string {
  return `${paths.apiTokenPrefix}${randomBytes(paths.apiTokenBytes).toString('hex')}`
}

function newTokenId(): string {
  return `tok-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`
}

function rowToRecord(row: ApiTokenRow): ApiTokenRecord {
  return {
    id: row.id,
    ownerId: row.ownerId,
    label: row.label,
    prefix: row.prefix,
    tokenHash: row.tokenHash,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
  }
}

function toStub(record: ApiTokenRecord): ApiTokenStub {
  return {
    id: record.id,
    label: record.label,
    prefix: record.prefix,
    createdAt: record.createdAt,
    lastUsedAt: record.lastUsedAt,
  }
}

export async function dbListApiTokens(ownerId?: string): Promise<ApiTokenStub[]> {
  const db = getDb()
  const rows = ownerId
    ? await db
        .select()
        .from(apiTokens)
        .where(eq(apiTokens.ownerId, ownerId))
        .orderBy(desc(apiTokens.updatedAt))
    : await db.select().from(apiTokens).orderBy(desc(apiTokens.updatedAt))
  return rows.map((row) => toStub(rowToRecord(row)))
}

export async function dbCreateApiToken(
  ownerId: string,
  label?: string | null,
): Promise<{ stub: ApiTokenStub; token: string }> {
  const token = generateApiTokenString()
  const tokenHash = hashApiToken(token)
  const prefix = token.slice(0, paths.apiTokenPrefix.length + 4)
  const record: ApiTokenRecord = {
    id: newTokenId(),
    ownerId,
    label: (label || '').trim() || 'API token',
    prefix,
    tokenHash,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  }
  const db = getDb()
  await db.insert(apiTokens).values({
    id: record.id,
    ownerId: record.ownerId,
    label: record.label,
    prefix: record.prefix,
    tokenHash: record.tokenHash,
    createdAt: record.createdAt,
    lastUsedAt: record.lastUsedAt,
    payload: {},
    updatedAt: new Date(),
  })
  return { stub: toStub(record), token }
}

export async function dbRevokeApiToken(tokenId: string, ownerId: string): Promise<boolean> {
  const db = getDb()
  const deleted = await db
    .delete(apiTokens)
    .where(and(eq(apiTokens.id, tokenId), eq(apiTokens.ownerId, ownerId)))
  return (deleted.rowCount ?? 0) > 0
}

export async function dbResolveApiTokenOwner(
  rawBearer: string | null | undefined,
): Promise<{ ownerId: string; tokenId: string } | null> {
  if (!rawBearer) return null
  let raw = rawBearer.trim()
  if (raw.toLowerCase().startsWith('bearer ')) {
    raw = raw.slice(7).trim()
  }
  if (!raw.startsWith(paths.apiTokenPrefix)) return null
  const expectedLen = paths.apiTokenPrefix.length + paths.apiTokenBytes * 2
  if (raw.length !== expectedLen) return null

  const tokenHash = hashApiToken(raw)
  const db = getDb()
  const rows = await db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.tokenHash, tokenHash))
    .limit(1)
  const row = rows[0]
  if (!row) return null

  const lastUsedAt = new Date().toISOString()
  await db
    .update(apiTokens)
    .set({ lastUsedAt, updatedAt: new Date() })
    .where(eq(apiTokens.id, row.id))

  return { ownerId: row.ownerId, tokenId: row.id }
}
