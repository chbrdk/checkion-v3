import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

function createDb() {
  const connectionString = process.env.DATABASE_URL?.trim()
  if (!connectionString) throw new Error('DATABASE_URL is required')
  const pool = new Pool({ connectionString, max: 10 })
  return { db: drizzle(pool, { schema }), pool }
}

const globalForDb = globalThis as unknown as {
  __checkionV3Db: ReturnType<typeof createDb> | undefined
}

export function getDb() {
  if (!globalForDb.__checkionV3Db) globalForDb.__checkionV3Db = createDb()
  return globalForDb.__checkionV3Db.db
}

export { isDatabaseConfigured, isProjectsDatabaseConfigured } from './config'

export type Db = ReturnType<typeof createDb>['db']
