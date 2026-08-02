/**
 * API token store — memory fixtures or Postgres via `lib/db/api-tokens`.
 * Spec: specs/domain/settings-api-tokens.md
 */

import { createHash, randomBytes } from 'node:crypto'
import type { ApiTokenStub } from '@checkion-v3/contracts'
import { paths } from '../paths'
import { isDatabaseConfigured } from '../db/config'

export type ApiTokenRecord = {
  id: string
  ownerId: string
  label: string
  prefix: string
  tokenHash: string
  createdAt: string
  lastUsedAt: string | null
}

type Store = {
  byId: Map<string, ApiTokenRecord>
  byHash: Map<string, string>
}

const g = globalThis as unknown as { __checkionApiTokensStore?: Store }

function store(): Store {
  if (!g.__checkionApiTokensStore) {
    g.__checkionApiTokensStore = { byId: new Map(), byHash: new Map() }
  }
  return g.__checkionApiTokensStore
}

async function dbApi() {
  return import('../db/api-tokens')
}

export function resetApiTokensStore(): void {
  store().byId.clear()
  store().byHash.clear()
}

export function hashApiToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex')
}

export function generateApiTokenString(): string {
  return `${paths.apiTokenPrefix}${randomBytes(paths.apiTokenBytes).toString('hex')}`
}

function newTokenId(): string {
  return `tok-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`
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

function memoryList(ownerId?: string): ApiTokenStub[] {
  return [...store().byId.values()]
    .filter((t) => (ownerId ? t.ownerId === ownerId : true))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map(toStub)
}

function memoryCreate(
  ownerId: string,
  label?: string | null,
): { stub: ApiTokenStub; token: string; record: ApiTokenRecord } {
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
  store().byId.set(record.id, record)
  store().byHash.set(tokenHash, record.id)
  return { stub: toStub(record), token, record }
}

function memoryRevoke(tokenId: string, ownerId: string): boolean {
  const row = store().byId.get(tokenId)
  if (!row || row.ownerId !== ownerId) return false
  store().byId.delete(tokenId)
  store().byHash.delete(row.tokenHash)
  return true
}

function memoryResolve(
  rawBearer: string | null | undefined,
): { ownerId: string; tokenId: string } | null {
  if (!rawBearer) return null
  let raw = rawBearer.trim()
  if (raw.toLowerCase().startsWith('bearer ')) {
    raw = raw.slice(7).trim()
  }
  if (!raw.startsWith(paths.apiTokenPrefix)) return null
  const expectedLen = paths.apiTokenPrefix.length + paths.apiTokenBytes * 2
  if (raw.length !== expectedLen) return null
  const id = store().byHash.get(hashApiToken(raw))
  if (!id) return null
  const row = store().byId.get(id)
  if (!row) return null
  row.lastUsedAt = new Date().toISOString()
  return { ownerId: row.ownerId, tokenId: row.id }
}

/** List stubs (no secrets). When ownerId set, filter to that owner. */
export async function listApiTokens(ownerId?: string): Promise<ApiTokenStub[]> {
  if (isDatabaseConfigured()) return (await dbApi()).dbListApiTokens(ownerId)
  return memoryList(ownerId)
}

/** Create token; raw string returned once. */
export async function createApiToken(
  ownerId: string,
  label?: string | null,
): Promise<{ stub: ApiTokenStub; token: string }> {
  if (isDatabaseConfigured()) {
    const created = await (await dbApi()).dbCreateApiToken(ownerId, label)
    return { stub: created.stub, token: created.token }
  }
  const created = memoryCreate(ownerId, label)
  return { stub: created.stub, token: created.token }
}

export async function revokeApiToken(tokenId: string, ownerId: string): Promise<boolean> {
  if (isDatabaseConfigured()) return (await dbApi()).dbRevokeApiToken(tokenId, ownerId)
  return memoryRevoke(tokenId, ownerId)
}

/** Resolve owner from raw Bearer token (with or without "Bearer " prefix). */
export async function resolveApiTokenOwner(
  rawBearer: string | null | undefined,
): Promise<{ ownerId: string; tokenId: string } | null> {
  if (isDatabaseConfigured()) return (await dbApi()).dbResolveApiTokenOwner(rawBearer)
  return memoryResolve(rawBearer)
}
