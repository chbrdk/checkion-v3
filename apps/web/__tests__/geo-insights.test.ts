import { describe, expect, it } from 'vitest'
import type { GeoQueryRun } from '@checkion-v3/contracts'
import {
  analyzeAnswerCell,
  buildDerivedMoves,
  buildGeoInsights,
  hostMentionToken,
  inferPromptIntent,
  mergeRecommendations,
  targetMentionedInAnswer,
} from '../lib/geo-insights'

function run(
  partial: Partial<GeoQueryRun> & Pick<GeoQueryRun, 'query' | 'modelId'>,
): GeoQueryRun {
  return {
    queryId: partial.queryId ?? `${partial.query}-${partial.modelId}`,
    query: partial.query,
    modelId: partial.modelId,
    answerText: partial.answerText ?? '',
    citations: partial.citations ?? [],
    ourPosition: partial.ourPosition ?? null,
  }
}

describe('geo-insights', () => {
  it('matches host tokens in answer prose', () => {
    expect(hostMentionToken('durr.com')).toBe('durr')
    expect(targetMentionedInAnswer('Dürr leads OEM lines.', 'durr.com')).toBe(false)
    expect(targetMentionedInAnswer('durr is named for booths.', 'durr.com')).toBe(true)
    expect(targetMentionedInAnswer('See durr.com for specs.', 'durr.com')).toBe(true)
  })

  it('infers prompt intents with heuristic fallback', () => {
    expect(inferPromptIntent('Dürr vs ABB vs Eisenmann for painting', 'durr.com')).toBe(
      'comparison',
    )
    expect(inferPromptIntent('How to reduce overspray in paint shops', 'durr.com')).toBe('how-to')
    expect(inferPromptIntent('durr.com overview for buyers', 'durr.com')).toBe('branded')
    expect(inferPromptIntent('Best paint application systems', 'durr.com')).toBe('other')
  })

  it('sets stolenBy when rival is #1 and target misses', () => {
    const cell = analyzeAnswerCell(
      run({
        query: 'q1',
        modelId: 'gpt',
        ourPosition: null,
        citations: [
          { domain: 'abb.com', position: 1 },
          { domain: 'fanuc.com', position: 2 },
        ],
      }),
      'durr.com',
      ['abb.com', 'fanuc.com'],
    )
    expect(cell.stolenBy).toBe('abb.com')
    expect(cell.targetPosition).toBeNull()
    expect(cell.rivalDomains).toEqual(['abb.com', 'fanuc.com'])
  })

  it('sets stolenBy when rival leads and target is worse than #1', () => {
    const cell = analyzeAnswerCell(
      run({
        query: 'q1',
        modelId: 'gpt',
        ourPosition: 2,
        citations: [
          { domain: 'abb.com', position: 1 },
          { domain: 'durr.com', position: 2 },
        ],
      }),
      'durr.com',
      ['abb.com'],
    )
    expect(cell.stolenBy).toBe('abb.com')
    expect(cell.coCited).toBe(true)
  })

  it('returns empty missVsRival and null coCitation for solo rivals', () => {
    const insights = buildGeoInsights({
      targetHost: 'acme.com',
      rivals: [],
      queries: ['q1'],
      queryRuns: [
        run({
          query: 'q1',
          modelId: 'gpt',
          ourPosition: null,
          citations: [{ domain: 'other.com', position: 1 }],
        }),
      ],
    })
    expect(insights.missVsRival).toEqual([])
    expect(insights.coCitation).toBeNull()
    expect(insights.promptDuels[0]?.outcome).toBe('solo')
    expect(insights.promptDuels[0]?.intent).toBe('other')
  })

  it('lists miss-vs-rival when target misses and rival cites', () => {
    const insights = buildGeoInsights({
      targetHost: 'durr.com',
      rivals: ['abb.com'],
      queries: ['Best paint systems'],
      queryRuns: [
        run({
          query: 'Best paint systems',
          modelId: 'gpt',
          ourPosition: null,
          citations: [{ domain: 'abb.com', position: 1 }],
        }),
        run({
          query: 'Best paint systems',
          modelId: 'claude',
          ourPosition: 1,
          citations: [{ domain: 'durr.com', position: 1 }],
        }),
      ],
      shareOfVoice: [
        { domain: 'abb.com', shareOfVoice: 40, avgPosition: 1, mentionCount: 1 },
        { domain: 'durr.com', shareOfVoice: 40, avgPosition: 1, mentionCount: 1, isTarget: true },
      ],
    })
    expect(insights.missVsRival).toHaveLength(1)
    expect(insights.missVsRival[0]).toMatchObject({
      modelId: 'gpt',
      rivalDomain: 'abb.com',
      rivalPosition: 1,
    })
    expect(insights.promptDuels[0]?.outcome).toBe('tie')
    expect(insights.promptDuels[0]?.targetHitRate).toBe(50)
    expect(insights.disagreements.some((d) => d.kind === 'cite_split')).toBe(true)
    expect(insights.moves.length).toBeGreaterThan(0)
    expect(insights.moves[0]?.source).toBe('derived')
  })

  it('computes co-citation rates on field jobs', () => {
    const insights = buildGeoInsights({
      targetHost: 'durr.com',
      rivals: ['abb.com'],
      queries: ['q1', 'q2'],
      queryRuns: [
        run({
          query: 'q1',
          modelId: 'gpt',
          ourPosition: 2,
          citations: [
            { domain: 'abb.com', position: 1 },
            { domain: 'durr.com', position: 2 },
          ],
        }),
        run({
          query: 'q2',
          modelId: 'gpt',
          ourPosition: 1,
          citations: [{ domain: 'durr.com', position: 1 }],
        }),
      ],
    })
    expect(insights.coCitation).toMatchObject({
      cellCount: 2,
      coCitedCount: 1,
      aloneCiteCount: 1,
      coCitedRate: 50,
      aloneCiteRate: 50,
    })
  })

  it('marks prompt duel win when target alone leads mentions', () => {
    const insights = buildGeoInsights({
      targetHost: 'durr.com',
      rivals: ['abb.com'],
      queries: ['How to reduce overspray'],
      queryRuns: [
        run({
          query: 'How to reduce overspray',
          modelId: 'gpt',
          ourPosition: 1,
          citations: [{ domain: 'durr.com', position: 1 }],
        }),
        run({
          query: 'How to reduce overspray',
          modelId: 'claude',
          ourPosition: 1,
          citations: [{ domain: 'durr.com', position: 1 }],
        }),
      ],
    })
    expect(insights.promptDuels[0]?.outcome).toBe('win')
    expect(insights.promptDuels[0]?.leaderDomain).toBe('durr.com')
    expect(insights.promptDuels[0]?.intent).toBe('how-to')
    expect(insights.missVsRival).toEqual([])
  })

  it('marks miss when target never cited', () => {
    const insights = buildGeoInsights({
      targetHost: 'durr.com',
      rivals: ['abb.com'],
      queries: ['who leads'],
      queryRuns: [
        run({
          query: 'who leads',
          modelId: 'gpt',
          ourPosition: null,
          citations: [{ domain: 'abb.com', position: 1 }],
        }),
      ],
    })
    expect(insights.promptDuels[0]?.outcome).toBe('miss')
    expect(insights.promptDuels[0]?.leaderDomain).toBe('abb.com')
  })

  it('respects fixture intent overrides', () => {
    const insights = buildGeoInsights({
      targetHost: 'durr.com',
      rivals: [],
      queries: ['Best paint systems'],
      queryIntents: { 'Best paint systems': 'comparison' },
      queryRuns: [
        run({
          query: 'Best paint systems',
          modelId: 'gpt',
          ourPosition: 1,
          citations: [{ domain: 'durr.com', position: 1 }],
        }),
      ],
    })
    expect(insights.intents[0]).toMatchObject({
      intent: 'comparison',
      source: 'fixture',
    })
    expect(insights.promptDuels[0]?.intent).toBe('comparison')
  })

  it('merges derived moves ahead of fixture recommendations', () => {
    const derived = buildDerivedMoves({
      missVsRival: [
        {
          query: 'Best paint',
          modelId: 'gpt',
          rivalDomain: 'abb.com',
          rivalPosition: 1,
          otherRivals: [],
        },
      ],
      promptDuels: [],
      disagreements: [],
      solo: {
        cellCount: 2,
        hitCount: 1,
        citedShare: 50,
        missRate: 50,
        avgPosition: 2,
        firstCiteRate: 0,
        byModel: [],
        byQuery: [],
      },
      targetHost: 'durr.com',
    })
    expect(derived[0]?.source).toBe('derived')
    const merged = mergeRecommendations(derived, [
      { id: 'fixture-1', title: 'Static tip', severity: 'low', body: 'Keep as extra.' },
      { id: derived[0]!.id, title: 'Should drop', severity: 'high', body: 'Dup id' },
    ])
    expect(merged[0]?.id).toBe(derived[0]!.id)
    expect(merged.some((r) => r.id === 'fixture-1')).toBe(true)
    expect(merged.filter((r) => r.title === 'Should drop')).toHaveLength(0)
  })

  it('flags first_domain_split when models open with different hosts', () => {
    const insights = buildGeoInsights({
      targetHost: 'durr.com',
      rivals: ['abb.com', 'fanuc.com'],
      queries: ['booth tech'],
      queryRuns: [
        run({
          query: 'booth tech',
          modelId: 'gpt',
          ourPosition: 1,
          citations: [{ domain: 'durr.com', position: 1 }],
        }),
        run({
          query: 'booth tech',
          modelId: 'claude',
          ourPosition: 2,
          citations: [
            { domain: 'abb.com', position: 1 },
            { domain: 'durr.com', position: 2 },
          ],
        }),
      ],
    })
    expect(insights.disagreements.some((d) => d.kind === 'first_domain_split')).toBe(true)
  })
})
