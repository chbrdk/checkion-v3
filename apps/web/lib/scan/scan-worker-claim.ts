/**
 * Pure helpers for scan-worker claim / stale reclaim.
 * @see specs/domain/scan-worker.md
 */

export type ClaimableScanKind = 'single' | 'domain'

export type ClaimCandidate = {
  kind: ClaimableScanKind
  id: string
  createdAtMs: number
}

export function pickOldestClaimCandidate(
  singles: Array<{ id: string; createdAtMs: number }>,
  domains: Array<{ id: string; createdAtMs: number }>,
): ClaimCandidate | null {
  const pool: ClaimCandidate[] = [
    ...singles.map((s) => ({ kind: 'single' as const, id: s.id, createdAtMs: s.createdAtMs })),
    ...domains.map((d) => ({ kind: 'domain' as const, id: d.id, createdAtMs: d.createdAtMs })),
  ]
  if (!pool.length) return null
  pool.sort((a, b) => a.createdAtMs - b.createdAtMs || a.id.localeCompare(b.id))
  return pool[0]!
}

export function isStaleWorkerTimestamp(
  updatedAt: Date | string | null | undefined,
  nowMs: number,
  staleMs: number,
): boolean {
  const updatedMs =
    updatedAt instanceof Date
      ? updatedAt.getTime()
      : typeof updatedAt === 'string'
        ? Date.parse(updatedAt)
        : NaN
  if (!Number.isFinite(updatedMs)) return true
  return nowMs - updatedMs >= staleMs
}

export function parseWorkerStartedAtMs(startedAt: Date | string | null | undefined): number {
  if (startedAt instanceof Date) return startedAt.getTime()
  if (typeof startedAt === 'string') {
    const n = Date.parse(startedAt)
    return Number.isFinite(n) ? n : NaN
  }
  return NaN
}

/**
 * Decide reclaim outcome for a running worker job.
 * - foreign session → reclaim (or abandon if no progress past grace)
 * - stale heartbeat → reclaim (or abandon)
 * - same session + fresh heartbeat → keep running
 */
export function resolveWorkerReclaimAction(input: {
  workerSessionId: string | null | undefined
  currentSessionId: string
  updatedAt: Date | string | null | undefined
  startedAt: Date | string | null | undefined
  pageCount: number | null | undefined
  nowMs: number
  staleMs: number
  abandonNoProgressMs: number
}): 'keep' | 'requeue' | 'abandon' {
  const foreign =
    !input.workerSessionId || input.workerSessionId !== input.currentSessionId
  const stale = isStaleWorkerTimestamp(input.updatedAt, input.nowMs, input.staleMs)
  if (!foreign && !stale) return 'keep'

  const startedMs = parseWorkerStartedAtMs(input.startedAt)
  const ageMs = Number.isFinite(startedMs) ? input.nowMs - startedMs : Number.POSITIVE_INFINITY
  const pages = typeof input.pageCount === 'number' && Number.isFinite(input.pageCount) ? input.pageCount : 0
  if (pages <= 0 && ageMs >= input.abandonNoProgressMs) return 'abandon'
  return 'requeue'
}

/** Domain job options stored on `domain_scans.payload.job` for external enqueue. */
export type DomainScanJobOptions = {
  maxPages: number
  useSitemap?: boolean
  skipUnchangedPages?: boolean
  linkScanId?: string
}
