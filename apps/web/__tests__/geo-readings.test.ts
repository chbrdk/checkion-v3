import { describe, expect, it } from 'vitest'
import { getGeoOverview } from '../lib/fixtures/geo-store'
import {
  buildGeoReadingFallback,
  buildPromptReadingFallback,
  buildQueryTake,
  groupRunsByQuery,
} from '../lib/geo-readings'

describe('geo readings', () => {
  it('builds evaluative one-liners per kind', async () => {
    const overview = (await getGeoOverview('geo-1'))!
    for (const kind of ['verdict', 'eeat', 'placement', 'queries'] as const) {
      const line = buildGeoReadingFallback(overview, kind)
      expect(line.length).toBeGreaterThan(40)
      expect(line.endsWith('.')).toBe(true)
    }
  })

  it('builds prompt-level reading from insights', async () => {
    const overview = (await getGeoOverview('geo-1'))!
    const q = overview.queries[0]!
    const line = buildPromptReadingFallback(overview, q)
    expect(line.length).toBeGreaterThan(30)
    expect(line.endsWith('.')).toBe(true)
  })

  it('groups queries with a take each', async () => {
    const overview = (await getGeoOverview('geo-1'))!
    const groups = groupRunsByQuery(overview)
    expect(groups).toHaveLength(4)
    expect(buildQueryTake(overview, groups[2]!.query).length).toBeGreaterThan(20)
  })
})
