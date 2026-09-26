import type {
  SeoBacklinkSnapshot,
  SeoCompetitorsResult,
  SeoDomainSnapshot,
  SeoFieldSuggestResult,
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
import {
  fixtureFieldSuggestions,
  mergeKeywordCandidates,
  candidatesFromKnowledge,
  sanitizeSuggestKeywords,
  suggestMarketKeywordsViaQwen,
} from './field-suggest'
import { shouldRunLiveSeoMarket } from './live-seo-market-gate'
import { brandSeedFromHost } from './host-utils'
import {
  enrichmentHasSignal,
  resolveKnowledgeEnrichment,
} from '../plexon-knowledge-pack'
import { fetchUrlSuggestContext } from './url-suggest-context'
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
      throw e
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
      throw e
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
    await assertSeoMarketSoftCap(projectId, 20)
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
      throw e
    }
  }

  return insertBacklinkSnapshot({
    ...result,
    projectId,
    domain: result.domain,
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
  if (!shouldRunLiveSeoMarket()) {
    return fixtureCompetitors({ projectId, domain, keywords: kw })
  }
  if (kw.length === 0) {
    return {
      source: 'dataforseo',
      stubbed: false,
      fetchedAt: new Date().toISOString(),
      projectId,
      domain,
      keywords: [],
      items: [],
    }
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
        const brand = brandSeedFromHost(domain)
        if (!d || d === domain || (brand !== 'brand' && d.includes(brand))) continue
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
    throw e
  }
}

export async function projectSuggestFieldKeywords(input: {
  projectId: string
  locale?: string
  seedHint?: string
}): Promise<SeoFieldSuggestResult> {
  return projectSuggestMarketKeywords({ ...input, surface: 'field' })
}

export async function projectSuggestResearchSeeds(input: {
  projectId: string
  locale?: string
  seedHint?: string
}): Promise<SeoFieldSuggestResult> {
  return projectSuggestMarketKeywords({ ...input, surface: 'research' })
}

export async function projectSuggestRankTrackSet(input: {
  projectId: string
  locale?: string
  seedHint?: string
}): Promise<SeoFieldSuggestResult> {
  return projectSuggestMarketKeywords({ ...input, surface: 'ranks' })
}

async function projectSuggestMarketKeywords(input: {
  projectId: string
  surface: 'field' | 'research' | 'ranks'
  locale?: string
  seedHint?: string
}): Promise<SeoFieldSuggestResult> {
  const project = await getProject(input.projectId)
  if (!project?.domain) throw new Error('project has no domain')
  const domain = normalizeDomain(project.domain)
  const saved = (await listSavedKeywords(input.projectId))
    .slice(0, 12)
    .map((k) => k.keyword)
  const domainSnap = await latestDomainSnapshot(input.projectId)
  const domainTops = (domainSnap?.topKeywords ?? [])
    .map((k) => k.keyword)
    .filter(Boolean)
    .slice(0, 12)
  const knowledge = await resolveKnowledgeEnrichment({
    platformProjectId: project.platformProjectId,
  })
  // Homepage chrome when knowledge is thin (or always — cheap, fail-soft).
  const urlContext = await fetchUrlSuggestContext(domain)
  const packSeeds = candidatesFromKnowledge(knowledge)
  const stubFixtures = fixtureFieldSuggestions({
    domain,
    projectName: project.name,
    locale: input.locale,
    surface: input.surface,
    knowledge,
    urlContext,
  })
  const groundedPool = sanitizeSuggestKeywords(
    mergeKeywordCandidates(packSeeds, saved, domainTops),
    domain,
    input.surface,
    12,
  )
  const fetchedAt = new Date().toISOString()
  const seedHint =
    input.seedHint?.trim() && input.seedHint.trim().toLowerCase() !== 'www'
      ? input.seedHint.trim()
      : undefined

  if (!shouldRunLiveSeoMarket()) {
    const merged = sanitizeSuggestKeywords(
      mergeKeywordCandidates(groundedPool, stubFixtures),
      domain,
      input.surface,
      8,
    )
    return {
      projectId: input.projectId,
      domain,
      keywords: merged,
      model: enrichmentHasSignal(knowledge)
        ? 'fixture+knowledge'
        : urlContext
          ? 'fixture+url'
          : 'fixture',
      stubbed: true,
      fetchedAt,
      surface: input.surface,
    }
  }

  // Ranks: reuse a rich saved Research set; otherwise always Qwen (knowledge + URL).
  if (input.surface === 'ranks') {
    const cleanSaved = sanitizeSuggestKeywords(saved, domain, 'ranks', 8)
    if (cleanSaved.length >= 5) {
      return {
        projectId: input.projectId,
        domain,
        keywords: cleanSaved.slice(0, 8),
        model: 'saved-research',
        stubbed: false,
        fetchedAt,
        surface: 'ranks',
      }
    }
  }

  try {
    const { keywords, model } = await suggestMarketKeywordsViaQwen({
      surface: input.surface,
      domain,
      projectName:
        knowledge?.profile?.displayName?.trim() || project.name || domain,
      projectDescription: project.description || undefined,
      locale: input.locale,
      seedHint,
      savedKeywords: saved.slice(0, 8),
      candidateKeywords: groundedPool,
      knowledge,
      urlContext,
    })

    const finalKeywords = sanitizeSuggestKeywords(
      mergeKeywordCandidates(keywords, packSeeds, saved),
      domain,
      input.surface,
      8,
    )

    if (finalKeywords.length < 3) {
      const fb = sanitizeSuggestKeywords(stubFixtures, domain, input.surface, 8)
      if (fb.length >= 3) {
        return {
          projectId: input.projectId,
          domain,
          keywords: fb,
          model: 'url-stub-fallback',
          stubbed: false,
          fetchedAt,
          surface: input.surface,
        }
      }
    }

    return {
      projectId: input.projectId,
      domain,
      keywords: finalKeywords,
      model,
      stubbed: false,
      fetchedAt,
      surface: input.surface,
    }
  } catch (err) {
    const fallback = sanitizeSuggestKeywords(
      mergeKeywordCandidates(groundedPool, stubFixtures),
      domain,
      input.surface,
      8,
    )
    if (fallback.length >= 3) {
      return {
        projectId: input.projectId,
        domain,
        keywords: fallback,
        model: 'url-stub-fallback',
        stubbed: false,
        fetchedAt,
        surface: input.surface,
      }
    }
    throw err
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
      throw e
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
