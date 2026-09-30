import { and, eq } from 'drizzle-orm'
import { getDb, isDatabaseConfigured } from '@/lib/db/client'
import { pageScanCache } from '@/lib/db/schema'
import { slimScanResultForCache } from '@/lib/scan/domain-scan-reuse'
import type { ScanResult } from '@/lib/scan/types'
import { normalizeScanUrl } from '@/lib/scan/url-normalize'
import { v4 as uuidv4 } from 'uuid'

export type CachedPageScan = {
  documentCacheHints: {
    etag?: string
    lastModified?: string
  }
  contentFingerprint?: string
  scanResult: ScanResult
}

function cacheableFromResult(result: ScanResult): {
  etag?: string
  lastModified?: string
  contentFingerprint?: string
} | null {
  const etag = result.documentCacheHints?.etag?.trim()
  const lastModified = result.documentCacheHints?.lastModified?.trim()
  const contentFingerprint = result.contentFingerprint?.trim()
  if (!etag && !lastModified && !contentFingerprint) return null
  return {
    ...(etag ? { etag } : {}),
    ...(lastModified ? { lastModified } : {}),
    ...(contentFingerprint ? { contentFingerprint } : {}),
  }
}

/** Latest cached page scan for project + normalized URL with reuse hints and/or fingerprint. */
export async function getLatestCachedPageScan(input: {
  projectId: string
  url: string
  device?: string
}): Promise<CachedPageScan | null> {
  if (!isDatabaseConfigured()) return null
  const normalizedUrl = normalizeScanUrl(input.url)
  const device = input.device ?? 'desktop'
  const db = getDb()
  const rows = await db
    .select()
    .from(pageScanCache)
    .where(
      and(
        eq(pageScanCache.projectId, input.projectId),
        eq(pageScanCache.normalizedUrl, normalizedUrl),
        eq(pageScanCache.device, device),
      ),
    )
    .limit(1)
  const row = rows[0]
  if (!row) return null
  const etag = row.etag?.trim()
  const lastModified = row.lastModified?.trim()
  const contentFingerprint =
    row.contentFingerprint?.trim() ||
    (typeof (row.result as { contentFingerprint?: unknown })?.contentFingerprint === 'string'
      ? String((row.result as { contentFingerprint: string }).contentFingerprint).trim()
      : '')
  if (!etag && !lastModified && !contentFingerprint) return null
  const scanResult = row.result as unknown as ScanResult
  if (!scanResult || typeof scanResult !== 'object') return null
  return {
    documentCacheHints: {
      ...(etag ? { etag } : {}),
      ...(lastModified ? { lastModified } : {}),
    },
    ...(contentFingerprint ? { contentFingerprint } : {}),
    scanResult,
  }
}

/** Upsert slim page result for future reuse. No-op when neither headers nor fingerprint exist. */
export async function upsertCachedPageScan(input: {
  projectId: string
  result: ScanResult
  device?: string
}): Promise<void> {
  if (!isDatabaseConfigured()) return
  const cacheable = cacheableFromResult(input.result)
  if (!cacheable) return

  const normalizedUrl = normalizeScanUrl(input.result.url)
  const device = input.device ?? 'desktop'
  const slim = slimScanResultForCache(input.result)
  const db = getDb()
  const existing = await db
    .select({ id: pageScanCache.id })
    .from(pageScanCache)
    .where(
      and(
        eq(pageScanCache.projectId, input.projectId),
        eq(pageScanCache.normalizedUrl, normalizedUrl),
        eq(pageScanCache.device, device),
      ),
    )
    .limit(1)

  const payload = {
    etag: cacheable.etag ?? null,
    lastModified: cacheable.lastModified ?? null,
    contentFingerprint: cacheable.contentFingerprint ?? slim.contentFingerprint ?? null,
    result: slim as unknown as Record<string, unknown>,
    updatedAt: new Date(),
  }

  if (existing[0]) {
    await db.update(pageScanCache).set(payload).where(eq(pageScanCache.id, existing[0].id))
    return
  }

  await db.insert(pageScanCache).values({
    id: `psc-${uuidv4()}`,
    projectId: input.projectId,
    normalizedUrl,
    device,
    ...payload,
  })
}
