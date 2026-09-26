import type {
  SeoBacklinkSnapshot,
  SeoCompetitorsResult,
  SeoDomainSnapshot,
  SeoKeywordIdea,
  SeoProjectOverview,
  SeoRankConfig,
  SeoRankSchedule,
  SeoSavedKeywordRow,
} from '@checkion-v3/contracts'
import { getProject } from '../fixtures/project-store'
import {
  liveBacklinks,
  liveDomainOverview,
  liveKeywordPositions,
  liveKeywords,
  liveSerp,
} from './dataforseo-client'
import {
  fixtureBacklinks,
  fixtureCompetitors,
  fixtureDomainOverview,
  fixtureKeywordsResult,
  fixtureRankSnapshots,
} from './fixtures'
import { shouldRunLiveSeoMarket } from './live-seo-market-gate'
import {
  assertSeoMarketSoftCap,
  recordSeoMarketUsage,
} from './store'
import {
  completeRankRun,
  createRankConfig,
  getRankConfig,
  insertBacklinkSnapshot,
  insertDomainSnapshot,
  latestDomainSnapshot,
  listBacklinkSnapshots,
  listRankConfigs,
  listSavedKeywords,
  normalizeDomain,
  saveKeywords,
  upsertKeywordMetrics,
} from './project-store'
import { gscPerformance, gscStatus } from './service'

export async function getSeoProjectOverview(projectId: string): Promise<SeoProjectOverview> {
  const project = await getProject(projectId)
  const domain = project?.domain ? normalizeDomain(project.domain) : ''
  const [domainSnapshot, backlinks, configs, saved] = await Promise.all([
    latestDomainSnapshot(projectId),
    listBacklinkSnapshots(projectId, 1),
    listRankConfigs(projectId),
    listSavedKeywords(projectId),
  ])
  return {
    projectId,
    domain,
    domainSnapshot,
    backlinkSnapshot: backlinks[0] ?? null,
    rankConfigs: configs.map((c) => ({
      id: c.id,
      domain: c.domain,
      keywordCount: c.keywords.length,
      lastCheckedAt: c.lastCheckedAt,
    })),
    savedKeywordCount: saved.length,
  }
}

export async function projectListKeywords(projectId: string): Promise<SeoSavedKeywordRow[]> {
  return listSavedKeywords(projectId)
}

export async function projectSaveKeywords(
  projectId: string,
  keywords: string[],
): Promise<SeoSavedKeywordRow[]> {
  return saveKeywords({ projectId, keywords })
}

export async function projectResearchKeywords(input: {
  projectId: string
  seed: string
  limit?: number
  save?: boolean
}): Promise<{ ideas: SeoKeywordIdea[]; saved: SeoSavedKeywordRow[] }> {
  let ideas: SeoKeywordIdea[]
  if (!shouldRunLiveSeoMarket()) {
    ideas = fixtureKeywordsResult({
      projectId: input.projectId,
      seed: input.seed,
      limit: input.limit ?? 12,
    }).items
  } else {
    await assertSeoMarketSoftCap(input.projectId, 1)
    try {
      const { result, units } = await liveKeywords({
        projectId: input.projectId,
        seed: input.seed,
        limit: input.limit,
      })
      await recordSeoMarketUsage({
        projectId: input.projectId,
        endpoint: 'keywords',
        units,
      })
      ideas = result.items
    } catch (e) {
      if ((e as { code?: string }).code === 'cost_soft_cap') throw e
      ideas = fixtureKeywordsResult({
        projectId: input.projectId,
        seed: input.seed,
        limit: input.limit ?? 12,
      }).items
    }
  }
  await upsertKeywordMetrics(input.projectId, ideas)
  const saved = input.save
    ? await saveKeywords({
        projectId: input.projectId,
        keywords: ideas.map((i) => i.keyword),
      })
    : []
  return { ideas, saved }
}

export async function projectRefreshDomain(projectId: string): Promise<SeoDomainSnapshot> {
  const project = await getProject(projectId)
  if (!project?.domain) throw new Error('project has no domain')
  const domain = normalizeDomain(project.domain)

  let result
  if (!shouldRunLiveSeoMarket()) {
    result = fixtureDomainOverview({ projectId, domain })
  } else {
    await assertSeoMarketSoftCap(projectId, 2)
    try {
      const live = await liveDomainOverview({ projectId, domain })
      await recordSeoMarketUsage({
        projectId,
        endpoint: 'domain-overview',
        units: live.units,
      })
      result = live.result
    } catch (e) {
      if ((e as { code?: string }).code === 'cost_soft_cap') throw e
      result = fixtureDomainOverview({ projectId, domain })
    }
  }

  return insertDomainSnapshot({
    projectId,
    domain: result.domain,
    organicKeywords: result.organicKeywords,
    organicTraffic: result.organicTraffic,
    organicCost: result.organicCost,
    topKeywords: result.topKeywords,
    source: result.source,
    stubbed: result.stubbed,
    fetchedAt: result.fetchedAt,
  })
}

export async function projectRefreshBacklinks(projectId: string): Promise<SeoBacklinkSnapshot> {
  const project = await getProject(projectId)
  if (!project?.domain) throw new Error('project has no domain')
  const domain = normalizeDomain(project.domain)

  let result
  if (!shouldRunLiveSeoMarket()) {
    result = fixtureBacklinks({ projectId, domain })
  } else {
    await assertSeoMarketSoftCap(projectId, 2)
    try {
      const live = await liveBacklinks({ projectId, domain })
      await recordSeoMarketUsage({
        projectId,
        endpoint: 'backlinks',
        units: live.units,
      })
      result = live.result
    } catch (e) {
      if ((e as { code?: string }).code === 'cost_soft_cap') throw e
      result = fixtureBacklinks({ projectId, domain })
    }
  }

  return insertBacklinkSnapshot({
    projectId,
    domain: result.domain,
    referringDomains: result.referringDomains,
    backlinks: result.backlinks,
    rank: result.rank,
    spamScore: result.spamScore,
    source: result.source,
    stubbed: result.stubbed,
    fetchedAt: result.fetchedAt,
  })
}

export async function projectCompetitors(
  projectId: string,
  keywords: string[],
): Promise<SeoCompetitorsResult> {
  const project = await getProject(projectId)
  const domain = project?.domain ? normalizeDomain(project.domain) : 'example.com'
  const kw =
    keywords.length > 0
      ? keywords
      : (await listSavedKeywords(projectId)).slice(0, 5).map((k) => k.keyword)
  if (!shouldRunLiveSeoMarket() || kw.length === 0) {
    return fixtureCompetitors({ projectId, domain, keywords: kw })
  }
  await assertSeoMarketSoftCap(projectId, kw.length)
  const counts = new Map<string, { overlap: number; rankSum: number; n: number }>()
  let units = 0
  try {
    for (const keyword of kw.slice(0, 10)) {
      const { result, units: u } = await liveSerp({ projectId, keyword })
      units += u
      for (const item of result.items) {
        const d = item.domain.toLowerCase()
        if (!d || d === domain || d.includes(domain.split('.')[0]!)) continue
        const cur = counts.get(d) ?? { overlap: 0, rankSum: 0, n: 0 }
        cur.overlap += 1
        cur.rankSum += item.rank
        cur.n += 1
        counts.set(d, cur)
      }
    }
    await recordSeoMarketUsage({ projectId, endpoint: 'competitors', units })
    return {
      source: 'dataforseo',
      stubbed: false,
      fetchedAt: new Date().toISOString(),
      projectId,
      domain,
      keywords: kw,
      items: [...counts.entries()]
        .map(([d, v]) => ({
          domain: d,
          overlapCount: v.overlap,
          avgRank: v.n ? Number((v.rankSum / v.n).toFixed(1)) : null,
        }))
        .sort((a, b) => b.overlapCount - a.overlapCount)
        .slice(0, 15),
    }
  } catch (e) {
    if ((e as { code?: string }).code === 'cost_soft_cap') throw e
    return fixtureCompetitors({ projectId, domain, keywords: kw })
  }
}

export async function projectCreateRankConfig(input: {
  projectId: string
  domain?: string
  keywords: string[]
  schedule?: SeoRankSchedule
}): Promise<SeoRankConfig> {
  const project = await getProject(input.projectId)
  const domain = input.domain || project?.domain
  if (!domain) throw new Error('domain is required')
  let keywords = input.keywords
  if (keywords.length === 0) {
    keywords = (await listSavedKeywords(input.projectId)).map((k) => k.keyword).slice(0, 20)
  }
  if (keywords.length === 0) throw new Error('keywords are required')
  return createRankConfig({
    projectId: input.projectId,
    domain,
    keywords,
    schedule: input.schedule,
  })
}

export async function projectRefreshRankConfig(configId: string): Promise<SeoRankConfig> {
  const config = await getRankConfig(configId)
  if (!config) throw new Error('not_found')
  await assertSeoMarketSoftCap(config.projectId, config.keywords.length || 1)

  let snapshots
  if (!shouldRunLiveSeoMarket()) {
    snapshots = fixtureRankSnapshots(config.domain, config.keywords)
  } else {
    try {
      const live = await liveKeywordPositions({
        domain: config.domain,
        keywords: config.keywords,
        locationCode: config.locationCode,
        languageCode: config.languageCode,
      })
      await recordSeoMarketUsage({
        projectId: config.projectId,
        endpoint: 'rank-refresh',
        units: live.units,
      })
      snapshots = live.snapshots
    } catch (e) {
      if ((e as { code?: string }).code === 'cost_soft_cap') throw e
      snapshots = fixtureRankSnapshots(config.domain, config.keywords)
    }
  }

  await completeRankRun({
    configId,
    projectId: config.projectId,
    snapshots,
    schedule: config.schedule,
  })
  const updated = await getRankConfig(configId)
  if (!updated) throw new Error('not_found')
  return updated
}

export {
  listBacklinkSnapshots,
  listRankConfigs,
  getRankConfig,
  latestDomainSnapshot,
  listDueRankConfigs,
} from './project-store'

export { gscStatus, gscPerformance }
