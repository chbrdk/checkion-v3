import { describe, expect, it } from 'vitest'
import {
  fixtureSeoChapter,
  SEO_CHAPTER_IDS,
} from '../lib/seo-market/chapter-fixtures'

describe('seo chapter fixtures', () => {
  it('covers every market chapter with stats + ledger rows', () => {
    for (const chapter of SEO_CHAPTER_IDS) {
      const model = fixtureSeoChapter(chapter, {
        projectName: 'Test Co',
        domain: 'test.co',
      })
      expect(model.chapter).toBe(chapter)
      expect(model.title.length).toBeGreaterThan(0)
      expect(model.facets.length).toBeGreaterThan(0)
      expect(model.stats?.length ?? 0).toBeGreaterThan(0)
      expect(model.columns.length).toBeGreaterThan(0)
      expect(model.rows.length).toBeGreaterThan(0)
      const first = model.rows[0]!.cells[model.columns[0]!.key]
      expect(first).toBeTruthy()
    }
  })

  it('builds gsc query ledger aligned with dashboard card', () => {
    const model = fixtureSeoChapter('gsc')
    expect(model.stats?.find((s) => s.label === 'Clicks')?.value).toBe('1.284')
    expect(model.rows.some((r) => {
      const q = r.cells.query
      return typeof q === 'string' ? q === 'acme platform' : false
    })).toBe(true)
    expect(model.charts?.some((c) => c.kind === 'series')).toBe(true)
    expect(model.charts?.some((c) => c.kind === 'plot')).toBe(true)
  })

  it('builds OpenSEO-depth backlinks ledger with filters and dual cells', () => {
    const model = fixtureSeoChapter('backlinks')
    expect(model.stats?.map((s) => s.label)).toEqual([
      'DR',
      'UR',
      'Backlinks',
      'Ref. domains',
    ])
    expect(model.charts?.length).toBeGreaterThanOrEqual(3)
    expect(model.filters?.some((f) => f.id === 'dofollow')).toBe(true)
    expect(model.columns.some((c) => c.dual)).toBe(true)
    const page = model.rows[0]!.cells.page
    expect(typeof page === 'object' && page && 'primary' in page).toBe(true)
  })

  it('builds OpenSEO-depth keywords research with aside SERP + trends', () => {
    const model = fixtureSeoChapter('keywords')
    expect(model.title).toMatch(/Keyword research/i)
    expect(model.searchBand?.seedLabel).toBe('Seed')
    expect(model.searchBand?.actionLabel).toBe('Research')
    expect(model.searchBand?.recent?.length).toBeGreaterThan(0)
    expect(model.ledgerMeta).toMatch(/^Ideas/)
    expect(model.pageSize).toBe(5)
    expect(model.columns.map((c) => c.key)).toEqual([
      'keyword',
      'volume',
      'cpc',
      'comp',
      'score',
      'intent',
    ])
    expect(model.columns.find((c) => c.key === 'keyword')?.label).toBe('Idea')
    expect(model.columns.find((c) => c.key === 'score')?.label).toBe('KD')
    expect(model.filters?.some((f) => f.id === 'trans')).toBe(true)
    expect(model.aside?.charts?.[0]?.kind).toBe('series')
    expect(model.aside?.charts?.[0]?.title).toMatch(/Search demand/i)
    expect(model.aside?.ledger?.title).toMatch(/SERP snapshot/i)
    expect(model.aside?.ledger?.rows.length).toBeGreaterThan(0)
  })

  it('builds OpenSEO-depth domain overview with search band + aside pages', () => {
    const model = fixtureSeoChapter('domain')
    expect(model.title).toMatch(/Domain/i)
    expect(model.searchBand?.seedLabel).toBe('Domain')
    expect(model.searchBand?.actionLabel).toBe('Refresh')
    expect(model.pageSize).toBe(5)
    expect(model.columns.map((c) => c.key)).toEqual([
      'keyword',
      'volume',
      'position',
      'traffic',
    ])
    expect(model.columns.some((c) => c.dual)).toBe(true)
    expect(model.filters?.some((f) => f.id === 'top10')).toBe(true)
    expect(model.aside?.charts?.some((c) => c.kind === 'series')).toBe(true)
    expect(model.aside?.ledger?.title).toMatch(/pages/i)
    expect(model.aside?.ledger?.rows.length).toBeGreaterThan(0)
    expect(model.lede).toBeUndefined()
  })

  it('builds OpenSEO-depth rank monitor with movers aside + distribution', () => {
    const model = fixtureSeoChapter('rank-tracking')
    expect(model.title).toBe('Rank monitor')
    expect(model.searchBand?.seedLabel).toBe('Add to track')
    expect(model.searchBand?.actionLabel).toBe('Track & check')
    expect(model.stats?.[0]?.label).toBe('Monitored')
    expect(model.ledgerMeta).toMatch(/^Monitored set/)
    expect(model.pageSize).toBe(6)
    expect(model.columns.map((c) => c.key)).toEqual([
      'keyword',
      'position',
      'previous',
      'change',
      'device',
      'checked',
    ])
    expect(model.columns.some((c) => c.key === 'volume')).toBe(false)
    expect(model.filters?.some((f) => f.id === 'up')).toBe(true)
    expect(
      model.aside?.charts?.some(
        (c) => c.kind === 'series' && c.invertY && /Visibility/i.test(c.title),
      ),
    ).toBe(true)
    expect(model.aside?.charts?.some((c) => c.kind === 'plot')).toBe(true)
    expect(model.aside?.ledger?.title).toMatch(/movers/i)
    expect(model.lede).toBeUndefined()
  })

  it('builds OpenSEO-depth competitors field with aside battles + overlap', () => {
    const model = fixtureSeoChapter('competitors')
    expect(model.title).toBe('Competitive field')
    expect(model.searchBand?.seedLabel).toBe('Keyword set')
    expect(model.searchBand?.actionLabel).toBe('Analyze')
    expect(model.stats?.map((s) => s.label)).toEqual([
      'Rivals',
      'Avg overlap',
      'Best avg rank',
      'High threats',
    ])
    expect(model.ledgerMeta).toMatch(/^Rival domains/)
    expect(model.pageSize).toBe(5)
    expect(model.columns.map((c) => c.key)).toEqual([
      'domain',
      'overlap',
      'avgRank',
      'threat',
    ])
    expect(model.columns.some((c) => c.dual)).toBe(true)
    expect(model.filters?.some((f) => f.id === 'high')).toBe(true)
    expect(model.aside?.charts?.some((c) => c.kind === 'plot')).toBe(true)
    expect(model.aside?.charts?.some((c) => c.kind === 'series')).toBe(true)
    expect(model.aside?.ledger?.title).toMatch(/Battles/i)
    expect(model.aside?.ledger?.rows.length).toBeGreaterThan(0)
    expect(model.lede).toBeUndefined()
    expect(model.charts).toBeUndefined()
  })
})
