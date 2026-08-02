import { desc } from 'drizzle-orm'
import type { ApiTokenStub } from '@checkion-v3/contracts'
import { getDb } from './client'
import { apiTokens, type ApiTokenRow } from './schema'

function rowToToken(row: ApiTokenRow): ApiTokenStub {
  return {
    id: row.id,
    label: row.label,
    prefix: row.prefix,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
  }
}

export async function dbListApiTokens(): Promise<ApiTokenStub[]> {
  const db = getDb()
  const rows = await db.select().from(apiTokens).orderBy(desc(apiTokens.updatedAt))
  return rows.map(rowToToken)
}
