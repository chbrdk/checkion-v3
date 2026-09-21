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

/** Domain job options stored on `domain_scans.payload.job` for external enqueue. */
export type DomainScanJobOptions = {
  maxPages: number
  useSitemap?: boolean
  skipUnchangedPages?: boolean
  linkScanId?: string
}
