import { describe, expect, it, afterEach } from 'vitest'
import {
  resolveScanWorkerMode,
  resolveScanWorkerStaleMs,
  resolveScanWorkerAbandonNoProgressMs,
  resolveScanWorkerJobTimeoutMs,
  isExternalScanWorkerMode,
} from '@/lib/scan/scan-worker-mode'
import {
  pickOldestClaimCandidate,
  isStaleWorkerTimestamp,
  resolveWorkerReclaimAction,
} from '@/lib/scan/scan-worker-claim'
import { paths } from '@/lib/paths'

describe('scan-worker-mode', () => {
  afterEach(() => {
    delete process.env[paths.envScanWorkerMode]
    delete process.env[paths.envScanWorkerStaleMs]
    delete process.env[paths.envScanWorkerAbandonNoProgressMs]
    delete process.env[paths.envScanWorkerJobTimeoutMs]
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

  it('abandon / job timeout defaults', () => {
    expect(resolveScanWorkerAbandonNoProgressMs(undefined)).toBe(600_000)
    expect(resolveScanWorkerAbandonNoProgressMs('30000')).toBe(600_000)
    expect(resolveScanWorkerAbandonNoProgressMs('900000')).toBe(900_000)
    expect(resolveScanWorkerJobTimeoutMs(undefined)).toBe(1_200_000)
    expect(resolveScanWorkerJobTimeoutMs('60000')).toBe(1_200_000)
    expect(resolveScanWorkerJobTimeoutMs('900000')).toBe(900_000)
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

  it('reclaims foreign sessions immediately and abandons no-progress ageouts', () => {
    const now = 2_000_000
    expect(
      resolveWorkerReclaimAction({
        workerSessionId: 'other',
        currentSessionId: 'me',
        updatedAt: new Date(now - 1_000),
        startedAt: new Date(now - 30_000),
        pageCount: 0,
        nowMs: now,
        staleMs: 120_000,
        abandonNoProgressMs: 600_000,
      }),
    ).toBe('abandon')

    expect(
      resolveWorkerReclaimAction({
        workerSessionId: 'other',
        currentSessionId: 'me',
        updatedAt: new Date(now - 1_000),
        startedAt: new Date(now - 700_000),
        pageCount: 12,
        nowMs: now,
        staleMs: 120_000,
        abandonNoProgressMs: 600_000,
      }),
    ).toBe('abandon')

    expect(
      resolveWorkerReclaimAction({
        workerSessionId: 'me',
        currentSessionId: 'me',
        updatedAt: new Date(now - 1_000),
        startedAt: new Date(now - 700_000),
        pageCount: 0,
        nowMs: now,
        staleMs: 120_000,
        abandonNoProgressMs: 600_000,
      }),
    ).toBe('keep')

    expect(
      resolveWorkerReclaimAction({
        workerSessionId: 'me',
        currentSessionId: 'me',
        updatedAt: new Date(now - 200_000),
        startedAt: new Date(now - 30_000),
        pageCount: 3,
        nowMs: now,
        staleMs: 120_000,
        abandonNoProgressMs: 600_000,
      }),
    ).toBe('requeue')

    expect(
      resolveWorkerReclaimAction({
        workerSessionId: 'me',
        currentSessionId: 'me',
        updatedAt: new Date(now - 200_000),
        startedAt: new Date(now - 700_000),
        pageCount: 0,
        nowMs: now,
        staleMs: 120_000,
        abandonNoProgressMs: 600_000,
      }),
    ).toBe('abandon')
  })
})
