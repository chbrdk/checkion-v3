import { and, eq, sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import type { SeoMarketUsage, SeoRankTracker } from '@checkion-v3/contracts'
import { isDatabaseConfigured } from '../db/config'
import { getDb } from '../db/client'
import { seoMarketCache, seoMarketUsage, seoRankTrackers } from '../db/schema'
import { seoMarketDailySoftCap } from './live-seo-market-gate'

const memoryUsage = new Map<string, number>()
const memoryCache = new Map<string, { expiresAt: number; payload: Record<string, unknown> }>()
const memoryTrackers = new Map<string, SeoRankTracker>()

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

function usageMapKey(projectId: string, day: string) {
  return `${projectId}:${day}`
}

export async function getSeoMarketUsage(projectId: string): Promise<SeoMarketUsage> {
  const day = dayKey()
  const softCap = seoMarketDailySoftCap()
  if (!isDatabaseConfigured()) {
    return {
      projectId,
      day,
      units: memoryUsage.get(usageMapKey(projectId, day)) ?? 0,
      softCap,
    }
  }
  const db = getDb()
  const rows = await db
    .select({ total: sql<number>`coalesce(sum(${seoMarketUsage.units}), 0)` })
    .from(seoMarketUsage)
    .where(and(eq(seoMarketUsage.projectId, projectId), eq(seoMarketUsage.day, day)))
  const units = Number(rows[0]?.total ?? 0)
  return { projectId, day, units, softCap }
}

export async function assertSeoMarketSoftCap(projectId: string, addUnits: number): Promise<void> {
  const usage = await getSeoMarketUsage(projectId)
  if (usage.units + addUnits > usage.softCap) {
    const err = new Error(
      `SEO Market soft cap reached (${usage.units}/${usage.softCap} units for ${usage.day}). Raise CHECKION_SEO_MARKET_DAILY_SOFT_CAP or wait until tomorrow.`,
    )
    ;(err as Error & { code?: string }).code = 'cost_soft_cap'
    throw err
  }
}

export async function recordSeoMarketUsage(input: {
  projectId: string
  endpoint: string
  units: number
}): Promise<void> {
  const day = dayKey()
  const units = Math.max(1, Math.floor(input.units))
  if (!isDatabaseConfigured()) {
    const key = usageMapKey(input.projectId, day)
    memoryUsage.set(key, (memoryUsage.get(key) ?? 0) + units)
    return
  }
  const db = getDb()
  await db.insert(seoMarketUsage).values({
    id: randomUUID(),
    projectId: input.projectId,
    day,
    endpoint: input.endpoint,
    units,
  })
}

export async function getSeoMarketCache(
  projectId: string,
  cacheKey: string,
): Promise<Record<string, unknown> | null> {
  if (!isDatabaseConfigured()) {
    const hit = memoryCache.get(`${projectId}:${cacheKey}`)
    if (!hit || hit.expiresAt < Date.now()) return null
    return hit.payload
  }
  const db = getDb()
  const rows = await db
    .select()
    .from(seoMarketCache)
    .where(and(eq(seoMarketCache.projectId, projectId), eq(seoMarketCache.cacheKey, cacheKey)))
    .limit(1)
  const row = rows[0]
  if (!row) return null
  if (row.expiresAt.getTime() < Date.now()) return null
  return row.payload
}

export async function setSeoMarketCache(input: {
  projectId: string
  cacheKey: string
  payload: Record<string, unknown>
  ttlSeconds?: number
}): Promise<void> {
  const ttl = input.ttlSeconds ?? 3600
  const expiresAt = new Date(Date.now() + ttl * 1000)
  if (!isDatabaseConfigured()) {
    memoryCache.set(`${input.projectId}:${input.cacheKey}`, {
      expiresAt: expiresAt.getTime(),
      payload: input.payload,
    })
    return
  }
  const db = getDb()
  const existing = await db
    .select({ id: seoMarketCache.id })
    .from(seoMarketCache)
    .where(
      and(
        eq(seoMarketCache.projectId, input.projectId),
        eq(seoMarketCache.cacheKey, input.cacheKey),
      ),
    )
    .limit(1)
  if (existing[0]) {
    await db
      .update(seoMarketCache)
      .set({ payload: input.payload, expiresAt })
      .where(eq(seoMarketCache.id, existing[0].id))
    return
  }
  await db.insert(seoMarketCache).values({
    id: randomUUID(),
    projectId: input.projectId,
    cacheKey: input.cacheKey,
    payload: input.payload,
    expiresAt,
  })
}

function rowToTracker(row: typeof seoRankTrackers.$inferSelect): SeoRankTracker {
  return {
    id: row.id,
    projectId: row.projectId,
    domain: row.domain,
    keywords: row.payload.keywords ?? [],
    locationCode: row.payload.locationCode ?? 2840,
    languageCode: row.payload.languageCode ?? 'en',
    status: row.status as SeoRankTracker['status'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastRefreshAt: row.lastRefreshAt,
    latest: row.payload.latest ?? [],
  }
}

export async function listSeoRankTrackers(projectId?: string): Promise<SeoRankTracker[]> {
  if (!isDatabaseConfigured()) {
    const all = [...memoryTrackers.values()]
    return projectId ? all.filter((t) => t.projectId === projectId) : all
  }
  const db = getDb()
  const rows = projectId
    ? await db.select().from(seoRankTrackers).where(eq(seoRankTrackers.projectId, projectId))
    : await db.select().from(seoRankTrackers)
  return rows.map(rowToTracker)
}

export async function getSeoRankTracker(id: string): Promise<SeoRankTracker | null> {
  if (!isDatabaseConfigured()) return memoryTrackers.get(id) ?? null
  const db = getDb()
  const rows = await db.select().from(seoRankTrackers).where(eq(seoRankTrackers.id, id)).limit(1)
  return rows[0] ? rowToTracker(rows[0]) : null
}

export async function createSeoRankTracker(input: {
  projectId: string
  domain: string
  keywords: string[]
  locationCode?: number
  languageCode?: string
}): Promise<SeoRankTracker> {
  const now = new Date()
  const tracker: SeoRankTracker = {
    id: `seo-rank-${randomUUID()}`,
    projectId: input.projectId,
    domain: input.domain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    keywords: input.keywords.map((k) => k.trim()).filter(Boolean).slice(0, 50),
    locationCode: input.locationCode ?? 2840,
    languageCode: input.languageCode ?? 'en',
    status: 'idle',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    lastRefreshAt: null,
    latest: [],
  }
  if (!isDatabaseConfigured()) {
    memoryTrackers.set(tracker.id, tracker)
    return tracker
  }
  const db = getDb()
  await db.insert(seoRankTrackers).values({
    id: tracker.id,
    projectId: tracker.projectId,
    domain: tracker.domain,
    status: tracker.status,
    lastRefreshAt: null,
    payload: {
      keywords: tracker.keywords,
      locationCode: tracker.locationCode,
      languageCode: tracker.languageCode,
      latest: [],
    },
    createdAt: now,
    updatedAt: now,
  })
  return tracker
}

export async function updateSeoRankTracker(
  id: string,
  patch: Partial<Pick<SeoRankTracker, 'status' | 'lastRefreshAt' | 'latest'>> & {
    error?: string
  },
): Promise<SeoRankTracker | null> {
  const existing = await getSeoRankTracker(id)
  if (!existing) return null
  const next: SeoRankTracker = {
    ...existing,
    status: patch.status ?? existing.status,
    lastRefreshAt:
      patch.lastRefreshAt !== undefined ? patch.lastRefreshAt : existing.lastRefreshAt,
    latest: patch.latest ?? existing.latest,
    updatedAt: new Date().toISOString(),
  }
  if (!isDatabaseConfigured()) {
    memoryTrackers.set(id, next)
    return next
  }
  const db = getDb()
  await db
    .update(seoRankTrackers)
    .set({
      status: next.status,
      lastRefreshAt: next.lastRefreshAt,
      payload: {
        keywords: next.keywords,
        locationCode: next.locationCode,
        languageCode: next.languageCode,
        latest: next.latest,
        ...(patch.error ? { error: patch.error } : {}),
      },
      updatedAt: new Date(),
    })
    .where(eq(seoRankTrackers.id, id))
  return next
}
