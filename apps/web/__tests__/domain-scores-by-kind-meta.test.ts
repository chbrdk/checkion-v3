import { describe, expect, it } from 'vitest'
import { formatDomainScoresByKindMeta } from '../lib/domain-scores-by-kind-meta'

describe('formatDomainScoresByKindMeta', () => {
  it('returns empty when missing', () => {
    expect(formatDomainScoresByKindMeta(undefined)).toBe('')
    expect(formatDomainScoresByKindMeta({})).toBe('')
  })

  it('shows weakest kinds first with short labels', () => {
    expect(
      formatDomainScoresByKindMeta({
        accessibility: 80,
        generative: 55,
        seo: 70,
        performance: 90,
      }),
    ).toBe('geo 55 · seo 70 · a11y 80')
  })
})
