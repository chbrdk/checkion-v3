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
