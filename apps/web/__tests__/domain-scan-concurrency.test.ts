import { describe, expect, it } from 'vitest'
import {
  resolveDomainScanConcurrency,
  resolveDomainScanDelayMs,
} from '@/lib/scan/domain-scan-concurrency'

describe('resolveDomainScanConcurrency', () => {
  it('defaults to 1 so co-located Next.js stays responsive during crawls', () => {
    expect(resolveDomainScanConcurrency(undefined)).toBe(1)
    expect(resolveDomainScanConcurrency('')).toBe(1)
  })

  it('clamps to 1..12', () => {
    expect(resolveDomainScanConcurrency('0')).toBe(1)
    expect(resolveDomainScanConcurrency('3')).toBe(3)
    expect(resolveDomainScanConcurrency('99')).toBe(12)
    expect(resolveDomainScanConcurrency('nope')).toBe(1)
  })
})

describe('resolveDomainScanDelayMs', () => {
  it('defaults to 500ms', () => {
    expect(resolveDomainScanDelayMs(undefined)).toBe(500)
  })

  it('allows zero and rejects negatives', () => {
    expect(resolveDomainScanDelayMs('0')).toBe(0)
    expect(resolveDomainScanDelayMs('-10')).toBe(500)
  })
})
