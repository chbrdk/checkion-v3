import { describe, expect, it } from 'vitest'
import {
  meanDomainOverallScore,
  pageOverallScore,
} from '../lib/scan/domain-overall-score'

describe('domain-overall-score', () => {
  it('prefers ux.score over page score', () => {
    expect(pageOverallScore({ score: 10, ux: { score: 80 } })).toBe(80)
    expect(pageOverallScore({ score: 55 })).toBe(55)
    expect(pageOverallScore({})).toBe(0)
  })

  it('uses unweighted mean (home depth does not matter)', () => {
    expect(
      meanDomainOverallScore([
        { score: 100 }, // would have been 1.5x under legacy spider weighting
        { score: 40 },
        { score: 40 },
      ]),
    ).toBe(60)
  })

  it('returns rounded fallback when empty', () => {
    expect(meanDomainOverallScore([], 43.2)).toBe(43)
  })
})
