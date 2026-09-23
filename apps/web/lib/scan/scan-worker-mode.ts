/**
 * Whether WCAG crawls run in the web process or a dedicated scan-worker.
 * @see specs/domain/scan-worker.md
 */

import { paths } from '@/lib/paths'

export type ScanWorkerMode = 'inline' | 'external'

export function resolveScanWorkerMode(
  raw: string | undefined = typeof process !== 'undefined'
    ? process.env[paths.envScanWorkerMode]
    : undefined,
): ScanWorkerMode {
  const v = raw?.trim().toLowerCase()
  if (v === 'external') return 'external'
  return 'inline'
}

export function isExternalScanWorkerMode(): boolean {
  return resolveScanWorkerMode() === 'external'
}

export function resolveScanWorkerStaleMs(
  raw: string | undefined = typeof process !== 'undefined'
    ? process.env[paths.envScanWorkerStaleMs]
    : undefined,
): number {
  const n = raw != null && raw !== '' ? Number(raw) : NaN
  if (Number.isFinite(n) && n >= 30_000) return Math.floor(n)
  return 120_000
}

/** Fail (not requeue) running jobs that never produced pages. Default 10m. */
export function resolveScanWorkerAbandonNoProgressMs(
  raw: string | undefined = typeof process !== 'undefined'
    ? process.env[paths.envScanWorkerAbandonNoProgressMs]
    : undefined,
): number {
  const n = raw != null && raw !== '' ? Number(raw) : NaN
  if (Number.isFinite(n) && n >= 60_000) return Math.floor(n)
  return 600_000
}

/** Hard wall-clock for one domain job in the worker. Scales with maxPages when env unset. */
export function resolveScanWorkerJobTimeoutMs(
  maxPages?: number,
  raw: string | undefined = typeof process !== 'undefined'
    ? process.env[paths.envScanWorkerJobTimeoutMs]
    : undefined,
): number {
  const n = raw != null && raw !== '' ? Number(raw) : NaN
  if (Number.isFinite(n) && n >= 120_000) return Math.floor(n)
  const pages =
    typeof maxPages === 'number' && Number.isFinite(maxPages) && maxPages > 0
      ? Math.min(10_000, Math.floor(maxPages))
      : 50
  // Budget waves as if concurrency ≈3 (worker Dockerfile is 5; keep /3 margin
  // for politeness + slow pages). Cap was 45m and killed 1000-page deepscans
  // (~HDI) around page 300–350; allow up to 6h wall-clock.
  const waves = Math.ceil(pages / 3)
  return Math.min(21_600_000, Math.max(900_000, waves * 90_000))
}
