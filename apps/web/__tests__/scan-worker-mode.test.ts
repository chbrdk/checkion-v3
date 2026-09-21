import { describe, expect, it, afterEach } from 'vitest'
import {
  resolveScanWorkerMode,
  resolveScanWorkerStaleMs,
  isExternalScanWorkerMode,
} from '@/lib/scan/scan-worker-mode'
import {
  pickOldestClaimCandidate,
  isStaleWorkerTimestamp,
} from '@/lib/scan/scan-worker-claim'
import { paths } from '@/lib/paths'

describe('scan-worker-mode', () => {
  afterEach(() => {
    delete process.env[paths.envScanWorkerMode]
    delete process.env[paths.envScanWorkerStaleMs]
  })

  it('defaults to inline', () => {
    expect(resolveScanWorkerMode(undefined)).toBe('inline')
    expect(resolveScanWorkerMode('')).toBe('inline')
    expect(isExternalScanWorkerMode()).toBe(false)
  })

  it('resolves external', () => {
    expect(resolveScanWorkerMode('external')).toBe('external')
    process.env[paths.envScanWorkerMode] = 'external'
    expect(isExternalScanWorkerMode()).toBe(true)
  })

  it('stale ms defaults to 120s and clamps', () => {
    expect(resolveScanWorkerStaleMs(undefined)).toBe(120_000)
    expect(resolveScanWorkerStaleMs('1000')).toBe(120_000)
    expect(resolveScanWorkerStaleMs('180000')).toBe(180_000)
  })
})

describe('scan-worker-claim helpers', () => {
  it('picks oldest across singles and domains', () => {
    const pick = pickOldestClaimCandidate(
      [{ id: 's2', createdAtMs: 200 }],
      [
        { id: 'd1', createdAtMs: 100 },
        { id: 'd2', createdAtMs: 300 },
      ],
    )
    expect(pick).toEqual({ kind: 'domain', id: 'd1', createdAtMs: 100 })
  })

  it('detects stale timestamps', () => {
    const now = 1_000_000
    expect(isStaleWorkerTimestamp(new Date(now - 200_000), now, 120_000)).toBe(true)
    expect(isStaleWorkerTimestamp(new Date(now - 10_000), now, 120_000)).toBe(false)
    expect(isStaleWorkerTimestamp(null, now, 120_000)).toBe(true)
  })
})
