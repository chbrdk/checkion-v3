import { describe, expect, it } from 'vitest'
import type { IssueSummary, ScoreCard } from '@checkion-v3/contracts'
import {
  computeFindingDelta,
  computeScanRunDelta,
  computeScoreDeltas,
  findingKeyForIssue,
  findPreviousRunBaseline,
  geoRecommendationsToFindingRefs,
  geoScoresToDeltaInput,
  issuesToFindingRefs,
  normalizeScanRunUrl,
  normalizeScanRunUrlSet,
  scoreCardsToDeltaInput,
  urlSetsEqual,
} from '../lib/scan-run-delta'

function issue(
  partial: Pick<IssueSummary, 'ruleId' | 'title' | 'severity' | 'section'>,
): Pick<IssueSummary, 'ruleId' | 'title' | 'severity' | 'section'> {
  return partial
}

describe('normalizeScanRunUrl', () => {
  it('lowercases host, strips hash and trailing slash', () => {
    expect(normalizeScanRunUrl('https://WWW.Example.com/path/#frag')).toBe(
      'https://www.example.com/path',
    )
    expect(normalizeScanRunUrl('https://www.example.com/')).toBe('https://www.example.com')
  })
})

describe('urlSetsEqual', () => {
  it('compares normalized sets regardless of order', () => {
    expect(
      urlSetsEqual(
        ['https://a.example/x/', 'https://b.example'],
        ['https://b.example/', 'https://a.example/x'],
      ),
    ).toBe(true)
    expect(urlSetsEqual(['https://a.example'], ['https://b.example'])).toBe(false)
  })
})

describe('findingKeyForIssue / computeFindingDelta', () => {
  it('keys by section::ruleId and buckets new/gone/same', () => {
    const current = issuesToFindingRefs([
      issue({
        ruleId: 'color-contrast',
        title: 'Contrast',
        severity: 'serious',
        section: 'accessibility',
      }),
      issue({
        ruleId: 'document-title',
        title: 'Title',
        severity: 'moderate',
        section: 'seo',
      }),
    ])
    const previous = issuesToFindingRefs([
      issue({
        ruleId: 'color-contrast',
        title: 'Contrast old',
        severity: 'critical',
        section: 'accessibility',
      }),
      issue({
        ruleId: 'image-alt',
        title: 'Alt',
        severity: 'serious',
        section: 'accessibility',
      }),
    ])
    expect(findingKeyForIssue(current[0]!)).toBe('accessibility::color-contrast')
    const delta = computeFindingDelta(current, previous)
    expect(delta.new.map((f) => f.key)).toEqual(['seo::document-title'])
    expect(delta.gone.map((f) => f.key)).toEqual(['accessibility::image-alt'])
    expect(delta.same.map((f) => f.key)).toEqual(['accessibility::color-contrast'])
    expect(delta.same[0]!.title).toBe('Contrast')
  })
})

describe('computeScoreDeltas', () => {
  it('subtracts previous from current per kind', () => {
    const cards: ScoreCard[] = [
      { kind: 'accessibility', label: 'A11y', value: 72, max: 100 },
      { kind: 'seo', label: 'SEO', value: 80, max: 100 },
    ]
    const prev: ScoreCard[] = [
      { kind: 'accessibility', label: 'A11y', value: 68, max: 100 },
      { kind: 'ux', label: 'UX', value: 50, max: 100 },
    ]
    const deltas = computeScoreDeltas(
      scoreCardsToDeltaInput(cards),
      scoreCardsToDeltaInput(prev),
    )
    const a11y = deltas.find((d) => d.kind === 'accessibility')
    const seo = deltas.find((d) => d.kind === 'seo')
    const ux = deltas.find((d) => d.kind === 'ux')
    expect(a11y).toEqual({
      kind: 'accessibility',
      current: 72,
      previous: 68,
      delta: 4,
      max: 100,
    })
    expect(seo?.delta).toBeNull()
    expect(seo?.current).toBe(80)
    expect(ux?.delta).toBeNull()
    expect(ux?.previous).toBe(50)
  })
})

describe('computeScanRunDelta', () => {
  it('assembles findings + scores for a single run pair', () => {
    const result = computeScanRunDelta({
      kind: 'single',
      currentId: 'cur',
      previousId: 'prev',
      urlSet: ['https://example.com/page/'],
      currentFindings: issuesToFindingRefs([
        issue({
          ruleId: 'r1',
          title: 'R1',
          severity: 'minor',
          section: 'ux',
        }),
      ]),
      previousFindings: [],
      currentScores: [{ kind: 'ux', value: 60, max: 100 }],
      previousScores: [{ kind: 'ux', value: 50, max: 100 }],
    })
    expect(result.urlSet).toEqual(normalizeScanRunUrlSet(['https://example.com/page/']))
    expect(result.findings.new).toHaveLength(1)
    expect(result.scores[0]!.delta).toBe(10)
  })
})

describe('findPreviousRunBaseline', () => {
  it('picks newest completed prior with same URL set', () => {
    const current = {
      id: 'c',
      projectId: 'p',
      urlSet: normalizeScanRunUrlSet(['https://example.com']),
      status: 'completed',
      completedAt: '2026-09-01T12:00:00.000Z',
      startedAt: '2026-09-01T11:00:00.000Z',
    }
    const older = {
      id: 'old',
      projectId: 'p',
      urlSet: normalizeScanRunUrlSet(['https://example.com/']),
      status: 'completed',
      completedAt: '2026-07-01T12:00:00.000Z',
      startedAt: '2026-07-01T11:00:00.000Z',
    }
    const newerPrior = {
      id: 'mid',
      projectId: 'p',
      urlSet: normalizeScanRunUrlSet(['https://example.com']),
      status: 'completed',
      completedAt: '2026-08-01T12:00:00.000Z',
      startedAt: '2026-08-01T11:00:00.000Z',
    }
    const otherUrl = {
      id: 'other',
      projectId: 'p',
      urlSet: normalizeScanRunUrlSet(['https://other.example']),
      status: 'completed',
      completedAt: '2026-08-15T12:00:00.000Z',
      startedAt: '2026-08-15T11:00:00.000Z',
    }
    const found = findPreviousRunBaseline([older, newerPrior, otherUrl, current], current)
    expect(found?.id).toBe('mid')
  })

  it('returns null when no baseline (no_baseline)', () => {
    const current = {
      id: 'only',
      projectId: 'p',
      urlSet: normalizeScanRunUrlSet(['https://example.com']),
      status: 'completed',
      completedAt: '2026-09-01T12:00:00.000Z',
      startedAt: '2026-09-01T11:00:00.000Z',
    }
    expect(findPreviousRunBaseline([current], current)).toBeNull()
  })

  it('does not mix GEO measurements', () => {
    const current = {
      id: 'live-now',
      projectId: 'p',
      urlSet: normalizeScanRunUrlSet(['https://durr.com']),
      status: 'completed',
      completedAt: '2026-09-01T12:00:00.000Z',
      startedAt: '2026-09-01T11:00:00.000Z',
      measurement: 'live' as const,
    }
    const recallPrior = {
      id: 'recall-prior',
      projectId: 'p',
      urlSet: normalizeScanRunUrlSet(['https://durr.com']),
      status: 'completed',
      completedAt: '2026-08-01T12:00:00.000Z',
      startedAt: '2026-08-01T11:00:00.000Z',
      measurement: 'recall' as const,
    }
    expect(findPreviousRunBaseline([recallPrior], current)).toBeNull()
  })
})

describe('geoScoresToDeltaInput / geoRecommendationsToFindingRefs', () => {
  it('maps cited_share and recommendation keys', () => {
    const scores = geoScoresToDeltaInput({
      citedShare: 58,
      eeat: {
        experience: 62,
        expertise: 71,
        authoritativeness: 54,
        trustworthiness: 68,
        geoFitness: 51,
      },
    })
    expect(scores.find((s) => s.kind === 'cited_share')?.value).toBe(58)
    expect(scores.some((s) => s.kind === 'eeat_geo_fitness')).toBe(true)
    const refs = geoRecommendationsToFindingRefs([
      {
        id: 'geo-rec-1',
        title: 'Win comparison',
        severity: 'high',
        body: '…',
      },
    ])
    expect(refs[0]!.key).toBe('rec::geo-rec-1')
  })
})
