import { describe, expect, it } from 'vitest'
import {
  evidenceKeywordPool,
  formatEvidenceForPrompt,
  qualityGapsFromOverview,
  seedHintsFromEvidence,
  type SuggestEvidence,
} from '../lib/seo-market/suggest-evidence'
import {
  encryptGscToken,
  decryptGscToken,
  insertGscSnapshot,
  latestGscSnapshot,
  upsertGscConnection,
  getGscConnection,
  deleteGscConnection,
} from '../lib/seo-market/project-store'
import { buildSeedHintsFromOverview } from '../lib/seo-market/dashboard-from-overview'
import type { SeoProjectOverview } from '@checkion-v3/contracts'

const sampleEvidence = (): SuggestEvidence => ({
  brand: 'vaillant',
  savedKeywords: ['wärmepumpe'],
  domainTops: ['heizung'],
  trackedKeywords: ['boiler'],
  fieldKeywords: ['wärmepumpe kaufen'],
  fieldRivals: ['bosch.de'],
  gscQueries: ['vaillant wärmepumpe'],
  qualityGaps: ['missing meta description (3 pages)'],
  usedField: true,
  usedGsc: true,
  usedQuality: true,
})

describe('suggest-evidence', () => {
  it('maps seoCoverage into gap themes', () => {
    const gaps = qualityGapsFromOverview({
      seoCoverage: {
        totalPages: 10,
        withTitle: 8,
        withH1: 7,
        withMetaDescription: 5,
        withCanonical: 10,
        duplicateTitleGroupCount: 2,
        canonicalMismatchCount: 0,
      },
      topIssues: [{ title: 'Thin content on product pages' }],
    })
    expect(gaps.some((g) => /missing title/i.test(g))).toBe(true)
    expect(gaps.some((g) => /meta description/i.test(g))).toBe(true)
    expect(gaps).toContain('Thin content on product pages')
  })

  it('builds seed hints and keyword pool from evidence', () => {
    const ev = sampleEvidence()
    expect(seedHintsFromEvidence(ev)[0]).toBe('vaillant')
    expect(evidenceKeywordPool(ev)).toEqual(
      expect.arrayContaining(['vaillant wärmepumpe', 'wärmepumpe kaufen', 'heizung']),
    )
    expect(formatEvidenceForPrompt(ev, 'field')).toMatch(/Field rivals/)
  })
})

describe('gsc store', () => {
  it('encrypts refresh tokens round-trip', () => {
    const enc = encryptGscToken('refresh-secret')
    expect(enc).not.toContain('refresh-secret')
    expect(decryptGscToken(enc)).toBe('refresh-secret')
  })

  it('persists connection and snapshot in memory', async () => {
    const projectId = `gsc-${Date.now()}`
    await upsertGscConnection({
      projectId,
      siteUrl: 'https://vaillant.de/',
      refreshToken: 'tok-1',
    })
    const conn = await getGscConnection(projectId)
    expect(conn?.siteUrl).toBe('https://vaillant.de/')
    expect(conn?.refreshToken).toBe('tok-1')

    const snap = await insertGscSnapshot({
      projectId,
      siteUrl: 'https://vaillant.de/',
      startDate: '2026-08-01',
      endDate: '2026-08-28',
      items: [{ query: 'wärmepumpe', clicks: 12, impressions: 100, ctr: 0.12, position: 4.2 }],
      source: 'fixture',
      stubbed: true,
      fetchedAt: new Date().toISOString(),
    })
    const latest = await latestGscSnapshot(projectId)
    expect(latest?.id).toBe(snap.id)
    expect(latest?.items[0]?.query).toBe('wärmepumpe')

    await deleteGscConnection(projectId)
    expect(await getGscConnection(projectId)).toBeNull()
  })
})

describe('overview seed hints with GSC', () => {
  it('prefers GSC queries after brand', () => {
    const overview: SeoProjectOverview = {
      projectId: 'p1',
      domain: 'vaillant.de',
      domainSnapshot: null,
      backlinkSnapshot: null,
      competitorSnapshot: null,
      gscConnected: true,
      gscSnapshot: {
        id: 'g1',
        projectId: 'p1',
        siteUrl: 'https://vaillant.de/',
        startDate: '2026-08-01',
        endDate: '2026-08-28',
        items: [
          { query: 'vaillant service', clicks: 40, impressions: 200, ctr: 0.2, position: 3 },
          { query: 'wärmepumpe preis', clicks: 10, impressions: 80, ctr: 0.1, position: 8 },
        ],
        source: 'fixture',
        stubbed: true,
        fetchedAt: '2026-09-26T10:00:00.000Z',
        capturedAt: '2026-09-26T10:00:00.000Z',
      },
      rankConfigs: [],
      savedKeywordCount: 0,
    }
    const hints = buildSeedHintsFromOverview(overview)
    expect(hints[0]).toBe('vaillant')
    expect(hints).toContain('vaillant service')
  })
})
