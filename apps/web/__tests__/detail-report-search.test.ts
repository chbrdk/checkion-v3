import { describe, expect, it } from 'vitest'
import {
  filterFacts,
  parseDetailQuery,
  scoreMatches,
} from '../lib/detail-report-search'

describe('detail report search', () => {
  it('parses tone keywords separately from tokens', () => {
    expect(parseDetailQuery('bad LCP')).toEqual({
      raw: 'bad lcp',
      tokens: ['lcp'],
      tones: ['neg'],
    })
    expect(parseDetailQuery('good')).toEqual({
      raw: 'good',
      tokens: [],
      tones: ['pos'],
    })
  })

  it('matches metrics via aliases and filters by tone', () => {
    const rows = [
      { label: 'LCP', value: '4.06 s', tone: 'neg' as const },
      { label: 'TTFB', value: '120 ms', tone: 'pos' as const },
      { label: 'Protocol', value: 'h2' },
    ]
    expect(filterFacts(rows, parseDetailQuery('lcp'), 'Performance', ['speed']).map((r) => r.label)).toEqual([
      'LCP',
    ])
    expect(
      filterFacts(rows, parseDetailQuery('performance'), 'Performance', ['speed']).map(
        (r) => r.label,
      ),
    ).toEqual(['LCP', 'TTFB', 'Protocol'])
    expect(
      filterFacts(rows, parseDetailQuery('bad'), 'Performance', []).map((r) => r.label),
    ).toEqual(['LCP'])
  })

  it('matches ledger scores', () => {
    const q = parseDetailQuery('accessibility')
    expect(scoreMatches('Accessibility', 'accessibility', 12, 'neg', q)).toBe(true)
    expect(scoreMatches('SEO', 'seo', 80, 'pos', q)).toBe(false)
  })
})
