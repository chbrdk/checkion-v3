import { describe, expect, it } from 'vitest'
import {
  buildBacklinksChapterModel,
  mapBacklinkPagesToRows,
} from '../lib/seo-market/backlinks-chapter-map'
import { fixtureBacklinks } from '../lib/seo-market/fixtures'
import type { SeoBacklinkSnapshot } from '@checkion-v3/contracts'

function asSnap(): SeoBacklinkSnapshot {
  const base = fixtureBacklinks({ projectId: 'p1', domain: 'acme.example' })
  return {
    ...base,
    id: 'bl-1',
    capturedAt: base.fetchedAt,
  }
}

describe('backlinks-chapter-map', () => {
  it('maps referring pages into OpenSEO ledger rows', () => {
    const snap = asSnap()
    const rows = mapBacklinkPagesToRows(snap.items ?? [])
    expect(rows.length).toBeGreaterThanOrEqual(5)
    expect(rows[0]!.cells.page).toMatchObject({
      primary: expect.any(String),
      secondary: expect.any(String),
    })
    expect(rows.some((r) => r.tags?.includes('dofollow'))).toBe(true)
  })

  it('fills KPIs, charts, and page ledger from a full snapshot', () => {
    const snap = asSnap()
    const model = buildBacklinksChapterModel({
      projectId: 'p1',
      projectName: 'Acme',
      domain: 'acme.example',
      snapshot: snap,
      history: [snap],
    })
    expect(model.searchBand?.actionLabel).toBe('Refresh')
    expect(model.stats?.find((s) => s.label === 'DR')?.value).not.toBe('—')
    expect(model.stats?.find((s) => s.label === 'Backlinks')?.value).not.toBe('—')
    expect(model.stats?.find((s) => s.label === 'UR')?.value).not.toBe('—')
    expect(model.rows.length).toBeGreaterThan(0)
    expect(model.charts?.length).toBeGreaterThanOrEqual(2)
    expect(model.filters?.some((f) => f.id === 'new')).toBe(true)
    expect(model.aside?.ledger?.title).toBe('Top anchors')
    expect(model.aside?.ledgers?.some((l) => l.title === 'Link competitors')).toBe(
      true,
    )
    expect(model.emptyMessage).toBeUndefined()
  })

  it('keeps empty chrome when no snapshot yet', () => {
    const model = buildBacklinksChapterModel({
      projectId: 'p1',
      projectName: 'Acme',
      domain: 'acme.example',
    })
    expect(model.stats?.every((s) => s.value === '—')).toBe(true)
    expect(model.rows).toHaveLength(0)
    expect(model.emptyMessage).toBeTruthy()
  })
})
