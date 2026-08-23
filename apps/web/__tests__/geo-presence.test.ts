import { describe, expect, it } from 'vitest'
import type { GeoQueryRun } from '@checkion-v3/contracts'
import {
  buildGeoPresence,
  normalizeGeoHost,
  resolveRivals,
  shareOfVoiceFromPresence,
} from '../lib/geo-presence'

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

describe('geo-presence', () => {
  it('normalizes hosts', () => {
    expect(normalizeGeoHost('https://www.Durr.com/path')).toBe('durr.com')
  })

  it('computes solo metrics without rivals', () => {
    const queryRuns = [
      run({
        query: 'q1',
        modelId: 'gpt',
        ourPosition: 1,
        citations: [{ domain: 'acme.com', position: 1 }],
      }),
      run({
        query: 'q1',
        modelId: 'claude',
        ourPosition: null,
        citations: [],
      }),
      run({
        query: 'q2',
        modelId: 'gpt',
        ourPosition: 2,
        citations: [{ domain: 'acme.com', position: 2 }],
      }),
    ]
    const presence = buildGeoPresence({
      targetHost: 'acme.com',
      competitors: [],
      queries: ['q1', 'q2'],
      queryRuns,
    })
    expect(presence.rivalSource).toBe('none')
    expect(presence.field).toBeNull()
    expect(presence.solo.cellCount).toBe(3)
    expect(presence.solo.hitCount).toBe(2)
    expect(presence.solo.citedShare).toBe(67)
    expect(presence.solo.missRate).toBe(33)
    expect(presence.solo.avgPosition).toBe(1.5)
    expect(presence.solo.firstCiteRate).toBe(50)
    expect(presence.solo.byModel).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ modelId: 'gpt', hitRate: 100 }),
        expect.objectContaining({ modelId: 'claude', hitRate: 0 }),
      ]),
    )
    expect(shareOfVoiceFromPresence(presence)).toEqual([])
  })

  it('discovers rivals from citations when none explicit', () => {
    const queryRuns = [
      run({
        query: 'q1',
        modelId: 'gpt',
        ourPosition: 2,
        citations: [
          { domain: 'rival.com', position: 1 },
          { domain: 'acme.com', position: 2 },
        ],
      }),
      run({
        query: 'q1',
        modelId: 'claude',
        ourPosition: null,
        citations: [{ domain: 'rival.com', position: 1 }],
      }),
    ]
    const { rivals, rivalSource } = resolveRivals([], queryRuns, 'acme.com')
    expect(rivalSource).toBe('discovered')
    expect(rivals).toEqual(['rival.com'])

    const presence = buildGeoPresence({
      targetHost: 'acme.com',
      competitors: [],
      queries: ['q1'],
      queryRuns,
    })
    expect(presence.field).not.toBeNull()
    expect(presence.field!.leaderDomain).toBe('rival.com')
    expect(presence.field!.gapToLead).toBeGreaterThan(0)
    const target = presence.field!.shareOfVoice.find((r) => r.isTarget)
    expect(target?.mentionCount).toBe(1)
  })

  it('uses explicit rivals and buckets other beyond the rival set', () => {
    const queryRuns = [
      run({
        query: 'q1',
        modelId: 'gpt',
        ourPosition: 1,
        citations: [
          { domain: 'acme.com', position: 1 },
          { domain: 'abb.com', position: 2 },
          { domain: 'random.org', position: 3 },
        ],
      }),
    ]
    // Cap rivals to only explicit by filling MAX with abb — then random stays other.
    // With room under Top 5, random.org is discovered → mixed.
    const presence = buildGeoPresence({
      targetHost: 'acme.com',
      competitors: ['abb.com'],
      queries: ['q1'],
      queryRuns,
    })
    expect(presence.rivalSource).toBe('mixed')
    expect(presence.rivals).toContain('abb.com')
    expect(presence.rivals).toContain('random.org')
    expect(presence.solo.citedShare).toBe(100)

    const capped = buildGeoPresence({
      targetHost: 'acme.com',
      competitors: ['abb.com', 'r2.com', 'r3.com', 'r4.com', 'r5.com'],
      queries: ['q1'],
      queryRuns,
    })
    expect(capped.rivalSource).toBe('explicit')
    expect(capped.rivals).toHaveLength(5)
    expect(capped.rivals).not.toContain('random.org')
    const other = capped.field!.shareOfVoice.find((r) => r.domain === 'other')
    expect(other?.mentionCount).toBe(1)
  })

  it('handles empty runs', () => {
    const presence = buildGeoPresence({
      targetHost: 'acme.com',
      competitors: ['abb.com'],
      queries: ['q1'],
      queryRuns: [],
    })
    expect(presence.solo.citedShare).toBe(0)
    expect(presence.solo.avgPosition).toBeNull()
    expect(presence.solo.firstCiteRate).toBeNull()
    expect(presence.field).not.toBeNull()
    expect(presence.rivalSource).toBe('explicit')
  })

  it('marks mixed when explicit and discovered differ', () => {
    const queryRuns = [
      run({
        query: 'q1',
        modelId: 'gpt',
        citations: [
          { domain: 'abb.com', position: 1 },
          { domain: 'extra.com', position: 2 },
        ],
        ourPosition: null,
      }),
    ]
    const presence = buildGeoPresence({
      targetHost: 'acme.com',
      competitors: ['abb.com'],
      queries: ['q1'],
      queryRuns,
    })
    expect(presence.rivalSource).toBe('mixed')
    expect(presence.rivals).toContain('abb.com')
    expect(presence.rivals).toContain('extra.com')
  })

  it('computes mentionedShare for live jobs without changing citedShare', () => {
    const queryRuns = [
      run({
        query: 'q1',
        modelId: 'gpt',
        ourPosition: null,
        answerText: 'See acme for options.',
        citations: [],
      }),
      run({
        query: 'q1',
        modelId: 'claude',
        ourPosition: 1,
        answerText: 'Try ikea instead.',
        citations: [{ domain: 'acme.com', position: 1 }],
      }),
    ]
    const recall = buildGeoPresence({
      targetHost: 'acme.com',
      competitors: [],
      queries: ['q1'],
      queryRuns,
      measurement: 'recall',
    })
    expect(recall.solo.citedShare).toBe(50)
    expect(recall.solo.mentionedShare).toBeUndefined()

    const live = buildGeoPresence({
      targetHost: 'acme.com',
      competitors: [],
      queries: ['q1'],
      queryRuns,
      measurement: 'live',
    })
    expect(live.solo.citedShare).toBe(50)
    expect(live.solo.mentionedShare).toBe(50)
  })
})
