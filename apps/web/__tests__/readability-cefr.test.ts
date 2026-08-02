import { describe, expect, it } from 'vitest'
import {
  fleschGradeLevelToCefr,
  fleschGradeLevelToClarity,
  normalizeUxReadability,
} from '../lib/readability-cefr'
import { getScanOverview } from '../lib/fixtures/scan-store'
import type { UxSnapshot } from '@checkion-v3/contracts'

const baseUx = (over: Partial<UxSnapshot>): UxSnapshot => ({
  score: 50,
  cls: 0,
  readabilityGrade: 'B1',
  readabilityScore: 70,
  mobileFriendly: true,
  brokenLinkCount: 0,
  tapTargetIssueCount: 0,
  hasSkipLink: false,
  headingH1Count: 1,
  skippedHeadingLevels: false,
  ...over,
})

describe('readability CEFR mapping', () => {
  it('maps Flesch grade levels to CEFR bands', () => {
    expect(fleschGradeLevelToCefr(3)).toBe('A1')
    expect(fleschGradeLevelToCefr(6)).toBe('A2')
    expect(fleschGradeLevelToCefr(8)).toBe('B1')
    expect(fleschGradeLevelToCefr(10)).toBe('B2')
    expect(fleschGradeLevelToCefr(12)).toBe('C1')
    expect(fleschGradeLevelToCefr(20)).toBe('C2')
  })

  it('derives clarity 0–100 from Flesch grade level', () => {
    expect(fleschGradeLevelToClarity(6)).toBeGreaterThanOrEqual(70)
    expect(fleschGradeLevelToClarity(20)).toBeLessThan(40)
  })

  it('normalizes CHECKION flesch labels + grade-level score', () => {
    const out = normalizeUxReadability(
      baseUx({
        readabilityGrade: 'Very Complex (Academic)',
        readabilityScore: 20,
      }),
    )
    expect(out.readabilityGrade).toBe('C2')
    expect(out.readabilityScore).toBe(fleschGradeLevelToClarity(20))
  })

  it('leaves already-CEFR magazine fixtures alone', () => {
    const input = baseUx({ readabilityGrade: 'B1', readabilityScore: 72 })
    expect(normalizeUxReadability(input)).toEqual(input)
  })

  it('exposes CEFR on live scan-single-1 overview', () => {
    const overview = getScanOverview('scan-single-1')
    expect(overview?.ux?.readabilityGrade).toBe('C2')
    expect(overview?.ux?.readabilityScore).toBeGreaterThan(0)
    expect(overview?.ux?.readabilityScore).toBeLessThanOrEqual(100)
  })
})
