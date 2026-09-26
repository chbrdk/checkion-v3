import { describe, expect, it } from 'vitest'
import { fixtureKeywordsResult, fixtureSerpResult } from '../lib/seo-market/fixtures'
import { shouldRunLiveSeoMarket } from '../lib/seo-market/live-seo-market-gate'

describe('seo-market fixtures', () => {
  it('builds keyword ideas from seed', () => {
    const r = fixtureKeywordsResult({ projectId: 'p1', seed: 'acme', limit: 4 })
    expect(r.stubbed).toBe(true)
    expect(r.source).toBe('fixture')
    expect(r.items).toHaveLength(4)
    expect(r.items[0]?.keyword).toContain('acme')
  })

  it('builds serp rows', () => {
    const r = fixtureSerpResult({ projectId: 'p1', keyword: 'acme pricing' })
    expect(r.items).toHaveLength(10)
    expect(r.items[0]?.rank).toBe(1)
  })
})

describe('seo-market live gate', () => {
  it('is off without key', () => {
    const prevKey = process.env.DATAFORSEO_API_KEY
    const prevFlag = process.env.CHECKION_LIVE_SEO_MARKET
    delete process.env.DATAFORSEO_API_KEY
    process.env.CHECKION_LIVE_SEO_MARKET = '1'
    expect(shouldRunLiveSeoMarket()).toBe(false)
    if (prevKey === undefined) delete process.env.DATAFORSEO_API_KEY
    else process.env.DATAFORSEO_API_KEY = prevKey
    if (prevFlag === undefined) delete process.env.CHECKION_LIVE_SEO_MARKET
    else process.env.CHECKION_LIVE_SEO_MARKET = prevFlag
  })
})
