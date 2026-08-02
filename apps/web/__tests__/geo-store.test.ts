import { describe, expect, it } from 'vitest'
import { getGeoOverview, listGeoJobs } from '../lib/fixtures/geo-store'

describe('geo fixtures', () => {
  it('lists completed GEO jobs', async () => {
    const jobs = await listGeoJobs()
    expect(jobs.length).toBeGreaterThanOrEqual(2)
    expect(jobs.every((j) => j.status === 'completed')).toBe(true)
  })

  it('loads Dürr overview with placement matrix and query runs', async () => {
    const overview = await getGeoOverview('geo-1')
    expect(overview).not.toBeNull()
    expect(overview!.targetHost).toBe('durr.com')
    expect(overview!.positionMatrix.length).toBe(4)
    expect(overview!.models).toContain('gpt-5.4')
    expect(overview!.models.length).toBeGreaterThanOrEqual(10)
    expect(overview!.job.modelCount).toBe(overview!.models.length)
    expect(overview!.queryRuns.length).toBe(overview!.models.length * overview!.queries.length)
    expect(overview!.presence.field).not.toBeNull()
    expect(overview!.presence.rivals.length).toBeGreaterThan(0)
    expect(overview!.shareOfVoice.some((s) => s.isTarget)).toBe(true)
    expect(overview!.insights.cells.length).toBe(overview!.queryRuns.length)
    expect(overview!.insights.promptDuels.length).toBe(overview!.queries.length)
    expect(overview!.insights.missVsRival.length).toBeGreaterThan(0)
    expect(overview!.insights.coCitation).not.toBeNull()
    expect(overview!.insights.moves.length).toBeGreaterThan(0)
    expect(overview!.recommendations.some((r) => r.source === 'derived')).toBe(true)
    expect(overview!.insights.intents).toHaveLength(overview!.queries.length)
  })

  it('loads solo fixture without field SoV', async () => {
    const overview = await getGeoOverview('geo-3')
    expect(overview).not.toBeNull()
    expect(overview!.presence.rivalSource).toBe('none')
    expect(overview!.presence.field).toBeNull()
    expect(overview!.competitors).toEqual([])
    expect(overview!.presence.solo.citedShare).toBeGreaterThan(0)
    expect(overview!.insights.missVsRival).toEqual([])
    expect(overview!.insights.coCitation).toBeNull()
    expect(overview!.insights.promptDuels.every((d) => d.outcome === 'solo')).toBe(true)
  })
})
