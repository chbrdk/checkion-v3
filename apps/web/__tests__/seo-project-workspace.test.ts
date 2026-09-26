import { describe, expect, it } from 'vitest'
import {
  createRankConfig,
  insertBacklinkSnapshot,
  insertCompetitorSnapshot,
  latestCompetitorSnapshot,
  listBacklinkSnapshots,
  listDueRankConfigs,
  listSavedKeywords,
  saveKeywords,
  completeRankRun,
} from '../lib/seo-market/project-store'
import {
  getSeoProjectOverview,
  projectCompetitors,
  projectResearchKeywords,
} from '../lib/seo-market/project-service'
import { paths } from '../lib/paths'

describe('seo project store (memory)', () => {
  const projectId = `seo-proj-${Date.now()}`

  it('saves keywords and lists them', async () => {
    const saved = await saveKeywords({
      projectId,
      keywords: ['Brand Check', 'seo tools'],
    })
    expect(saved.length).toBe(2)
    const listed = await listSavedKeywords(projectId)
    expect(listed.map((k) => k.keyword)).toEqual(
      expect.arrayContaining(['brand check', 'seo tools']),
    )
  })

  it('persists backlink snapshots as history', async () => {
    const snap = await insertBacklinkSnapshot({
      projectId,
      domain: 'example.com',
      referringDomains: 12,
      backlinks: 40,
      rank: 80,
      spamScore: 5,
      source: 'fixture',
      stubbed: true,
      fetchedAt: new Date().toISOString(),
    })
    expect(snap.id).toBeTruthy()
    const history = await listBacklinkSnapshots(projectId, 5)
    expect(history[0]?.id).toBe(snap.id)
  })

  it('persists Field competitor snapshots', async () => {
    const snap = await insertCompetitorSnapshot({
      projectId,
      domain: 'example.com',
      keywords: ['brand', 'product'],
      items: [{ domain: 'rival.example', overlapCount: 4, avgRank: 8 }],
      source: 'fixture',
      stubbed: true,
      fetchedAt: new Date().toISOString(),
    })
    const latest = await latestCompetitorSnapshot(projectId)
    expect(latest?.id).toBe(snap.id)
    expect(latest?.items[0]?.domain).toBe('rival.example')
  })

  it('creates rank config and completes a run', async () => {
    const config = await createRankConfig({
      projectId,
      domain: 'example.com',
      keywords: ['brand', 'product'],
      schedule: 'daily',
    })
    await completeRankRun({
      configId: config.id,
      projectId,
      schedule: 'daily',
      snapshots: [
        {
          keyword: 'brand',
          rank: 3,
          url: 'https://example.com/',
          fetchedAt: new Date().toISOString(),
        },
      ],
    })
    const due = await listDueRankConfigs(
      new Date(Date.now() + 2 * 86400000).toISOString(),
    )
    expect(due.some((c) => c.id === config.id)).toBe(true)
  })
})

describe('seo project service fixtures', () => {
  it('researches and can save keywords without live vendor', async () => {
    const projectId = `seo-svc-${Date.now()}`
    const result = await projectResearchKeywords({
      projectId,
      seed: 'acme',
      limit: 5,
      save: true,
    })
    expect(result.ideas.length).toBeGreaterThan(0)
    expect(result.saved.length).toBeGreaterThan(0)
  })

  it('overview returns zeroed shape for empty project', async () => {
    const projectId = `seo-ov-${Date.now()}`
    const overview = await getSeoProjectOverview(projectId)
    expect(overview.projectId).toBe(projectId)
    expect(overview.savedKeywordCount).toBe(0)
    expect(overview.competitorSnapshot).toBeNull()
  })

  it('analyze competitors persists snapshot into overview', async () => {
    const projectId = `seo-field-${Date.now()}`
    // Memory project store has no project — fixture path still needs domain via getProject.
    // projectCompetitors falls back to example.com when project missing.
    const snap = await projectCompetitors(projectId, ['heat pump', 'boiler'])
    expect(snap.id).toBeTruthy()
    expect(snap.items.length).toBeGreaterThan(0)
    const overview = await getSeoProjectOverview(projectId)
    expect(overview.competitorSnapshot?.id).toBe(snap.id)
  })
})

describe('seo project paths', () => {
  it('builds project SEO routes and APIs', () => {
    expect(paths.routes.projectSeo('p1')).toBe('/projects/p1/seo')
    expect(paths.routes.projectSeo('p1', 'rank-tracking')).toBe(
      '/projects/p1/seo/rank-tracking',
    )
    expect(paths.routes.seoLaunch({ projectId: 'p1', chapter: 'backlinks' })).toBe(
      '/projects/p1/seo/backlinks',
    )
    expect(paths.routes.apiProjectSeoKeywords('p1')).toBe(
      '/api/projects/p1/seo/keywords',
    )
  })
})
