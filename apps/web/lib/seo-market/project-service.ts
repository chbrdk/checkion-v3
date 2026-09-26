import type {
  SeoBacklinkSnapshot,
  SeoCompetitorSnapshot,
  SeoCompetitorsResult,
  SeoDomainSnapshot,
  SeoFieldSuggestResult,
  SeoGscPerformanceResult,
  SeoGscSnapshot,
  SeoGscStatus,
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
import { fixtureBacklinks, fixtureCompetitors, fixtureDomainOverview, fixtureGscPerformance, fixtureKeywordsResult, fixtureRankSnapshots } from './fixtures'
import {
  fixtureFieldSuggestions,
  mergeKeywordCandidates,
  candidatesFromKnowledge,
  sanitizeSuggestKeywords,
  FieldSuggestError,
} from './field-suggest'
import { shouldRunLiveSeoMarket } from './live-seo-market-gate'
import { brandSeedFromHost } from './host-utils'
import {
  enrichmentHasSignal,
  publishMarketSuggestBriefToPack,
  resolveKnowledgeEnrichment,
} from '../plexon-knowledge-pack'
import { isRealPlatformProjectId } from '../plexon-platform-id'
import { fetchUrlSuggestContext } from './url-suggest-context'
import { runMarketSuggestResearchAgent } from './suggest-research-agent'
import {
  evidenceKeywordPool,
  gatherSuggestEvidence,
} from './suggest-evidence'
import {
  assertSeoMarketSoftCap,
  recordSeoMarketUsage,
} from './store'
import {
  completeRankRun,
  createRankConfig,
  getRankConfig,
  insertBacklinkSnapshot,
  insertCompetitorSnapshot,
  insertDomainSnapshot,
  insertGscSnapshot,
  latestCompetitorSnapshot,
  latestDomainSnapshot,
  latestGscSnapshot,
  listBacklinkSnapshots,
  listRankConfigs,
  listSavedKeywords,
  normalizeDomain,
  saveKeywords,
  upsertKeywordMetrics,
  getGscConnection,
  upsertGscConnection,
  deleteGscConnection,
} from './project-store'
import {
  buildGscAuthorizeUrl,
  exchangeGscCode,
  gscOAuthConfigured,
  liveGscPerformance,
  listGscSites,
} from './gsc-client'

export async function getSeoProjectOverview(projectId: string): Promise<SeoProjectOverview> {
  const project = await getProject(projectId)
  const domain = project?.domain ? normalizeDomain(project.domain) : ''
  const [domainSnapshot, backlinks, competitorSnapshot, gscSnapshot, gscConn, configs, saved] =
    await Promise.all([
      latestDomainSnapshot(projectId),
      listBacklinkSnapshots(projectId, 1),
      latestCompetitorSnapshot(projectId),
      latestGscSnapshot(projectId),
      getGscConnection(projectId),
      listRankConfigs(projectId),
      listSavedKeywords(projectId),
    ])
  return {
    projectId,
    domain,
    domainSnapshot,
    backlinkSnapshot: backlinks[0] ?? null,
    competitorSnapshot,
    gscSnapshot,
    gscConnected: Boolean(gscConn),
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
): Promise<SeoCompetitorSnapshot> {
  const project = await getProject(projectId)
  const domain = project?.domain ? normalizeDomain(project.domain) : 'example.com'
  const kw =
    keywords.length > 0
      ? keywords
      : (await listSavedKeywords(projectId)).slice(0, 5).map((k) => k.keyword)

  let result: SeoCompetitorsResult
  if (!shouldRunLiveSeoMarket()) {
    result = fixtureCompetitors({ projectId, domain, keywords: kw })
  } else if (kw.length === 0) {
    result = {
      source: 'dataforseo',
      stubbed: false,
      fetchedAt: new Date().toISOString(),
      projectId,
      domain,
      keywords: [],
      items: [],
    }
  } else {
    await assertSeoMarketSoftCap(projectId, kw.length)
    const counts = new Map<string, { overlap: number; rankSum: number; n: number }>()
    let units = 0
    try {
      for (const keyword of kw.slice(0, 10)) {
        const { result: serp, units: u } = await liveSerp({ projectId, keyword })
        units += u
        for (const item of serp.items) {
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
      result = {
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

  return insertCompetitorSnapshot({
    ...result,
    projectId,
    domain: result.domain,
    fetchedAt: result.fetchedAt,
  })
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
  const knowledge = await resolveKnowledgeEnrichment({
    platformProjectId: project.platformProjectId,
  })
  const evidence = await gatherSuggestEvidence({
    projectId: input.projectId,
    domain,
  })
  // Homepage chrome when knowledge is thin (or always — cheap, fail-soft).
  const urlContext = await fetchUrlSuggestContext(domain)
  const packSeeds = candidatesFromKnowledge(knowledge)
  const evidenceSeeds = evidenceKeywordPool(evidence, domain)
  const stubFixtures = fixtureFieldSuggestions({
    domain,
    projectName: project.name,
    locale: input.locale,
    surface: input.surface,
    knowledge,
    urlContext,
  })
  const groundedPool = sanitizeSuggestKeywords(
    mergeKeywordCandidates(packSeeds, evidence.savedKeywords, evidence.domainTops, evidenceSeeds),
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
      agent: {
        steps: ['stub'],
        pagesFetched: [],
        usedKnowledge: enrichmentHasSignal(knowledge),
        usedField: evidence.usedField,
        usedGsc: evidence.usedGsc,
        usedQuality: evidence.usedQuality,
      },
    }
  }

  // Ranks: reuse a rich saved Research set; otherwise always Qwen (knowledge + URL).
  if (input.surface === 'ranks') {
    const cleanSaved = sanitizeSuggestKeywords(evidence.savedKeywords, domain, 'ranks', 8)
    if (cleanSaved.length >= 5) {
      return {
        projectId: input.projectId,
        domain,
        keywords: cleanSaved.slice(0, 8),
        model: 'saved-research',
        stubbed: false,
        fetchedAt,
        surface: 'ranks',
        agent: {
          steps: ['saved-research'],
          pagesFetched: [],
          usedKnowledge: enrichmentHasSignal(knowledge),
          usedField: evidence.usedField,
          usedGsc: evidence.usedGsc,
          usedQuality: evidence.usedQuality,
        },
      }
    }
  }

  try {
    const agentResult = await runMarketSuggestResearchAgent({
      surface: input.surface,
      domain,
      projectName:
        knowledge?.profile?.displayName?.trim() || project.name || domain,
      projectDescription: project.description || undefined,
      locale: input.locale,
      seedHint,
      savedKeywords: evidence.savedKeywords.slice(0, 8),
      knowledge,
      evidence,
    })

    const finalKeywords = sanitizeSuggestKeywords(
      mergeKeywordCandidates(
        agentResult.keywords,
        evidenceSeeds,
        evidence.savedKeywords,
        packSeeds,
      ),
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
      throw new FieldSuggestError('Agent returned too few usable keywords', 'invalid')
    }

    const agentMeta = { ...agentResult.agent }
    const autosyncOff = ['0', 'false', 'off'].includes(
      (process.env.KNOWLEDGE_PACK_AUTOSYNC ?? '').trim().toLowerCase(),
    )
    if (
      !autosyncOff &&
      isRealPlatformProjectId(project.platformProjectId) &&
      agentResult.brief.summary.trim().length >= 40
    ) {
      const runId = `suggest-${input.projectId}-${input.surface}-${Date.now().toString(36)}`
      const published = await publishMarketSuggestBriefToPack({
        platformProjectId: project.platformProjectId,
        runId,
        projectId: input.projectId,
        brief: agentResult.brief,
        keywords: finalKeywords,
      })
      if (published.ok) {
        agentMeta.publishedToPack = true
        agentMeta.steps = [...agentMeta.steps, 'publish_knowledge_pack']
      } else {
        agentMeta.publishedToPack = false
        agentMeta.publishError = published.error
      }
    }

    return {
      projectId: input.projectId,
      domain,
      keywords: finalKeywords,
      model: agentResult.model,
      stubbed: false,
      fetchedAt,
      surface: input.surface,
      brief: agentResult.brief,
      agent: agentMeta,
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
  latestCompetitorSnapshot,
  latestDomainSnapshot,
  latestGscSnapshot,
  listDueRankConfigs,
} from './project-store'

export async function projectGscStatus(projectId: string): Promise<SeoGscStatus> {
  const conn = await getGscConnection(projectId)
  const oauthReady = gscOAuthConfigured()
  return {
    projectId,
    connected: Boolean(conn),
    siteUrl: conn?.siteUrl ?? null,
    stubbed: !conn,
    oauthConfigured: oauthReady,
  }
}

export function projectGscAuthorizeUrl(input: {
  projectId: string
  origin: string
  state: string
}): string {
  if (!gscOAuthConfigured()) throw new Error('gsc_oauth_unconfigured')
  return buildGscAuthorizeUrl(input)
}

export async function projectGscOAuthCallback(input: {
  projectId: string
  code: string
  origin: string
  siteUrl?: string
}): Promise<{ siteUrl: string }> {
  const tokens = await exchangeGscCode({
    code: input.code,
    projectId: input.projectId,
    origin: input.origin,
  })
  let siteUrl = input.siteUrl?.trim()
  if (!siteUrl) {
    const sites = await listGscSites(tokens.accessToken)
    siteUrl = sites[0]
  }
  if (!siteUrl) throw new Error('gsc_no_sites')
  await upsertGscConnection({
    projectId: input.projectId,
    siteUrl,
    refreshToken: tokens.refreshToken,
  })
  return { siteUrl }
}

export async function projectRefreshGsc(projectId: string): Promise<SeoGscSnapshot> {
  const conn = await getGscConnection(projectId)
  const end = new Date().toISOString().slice(0, 10)
  const start = new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10)
  let result: SeoGscPerformanceResult
  if (!conn || !gscOAuthConfigured() || !shouldRunLiveSeoMarket()) {
    const project = await getProject(projectId)
    const siteUrl =
      conn?.siteUrl ||
      (project?.domain ? `https://${normalizeDomain(project.domain)}/` : 'https://example.com/')
    result = fixtureGscPerformance({
      projectId,
      siteUrl,
      startDate: start,
      endDate: end,
    })
  } else {
    result = await liveGscPerformance({
      projectId,
      siteUrl: conn.siteUrl,
      refreshToken: conn.refreshToken,
      startDate: start,
      endDate: end,
    })
  }
  return insertGscSnapshot({
    ...result,
    projectId,
    fetchedAt: result.fetchedAt,
  })
}

export async function projectDisconnectGsc(projectId: string): Promise<void> {
  await deleteGscConnection(projectId)
}

/** @deprecated prefer projectGscStatus / projectRefreshGsc */
export async function gscStatus(projectId: string): Promise<SeoGscStatus> {
  return projectGscStatus(projectId)
}

/** @deprecated prefer projectRefreshGsc */
export async function gscPerformance(input: {
  projectId: string
  siteUrl: string
  startDate?: string
  endDate?: string
}): Promise<SeoGscPerformanceResult> {
  const end = input.endDate ?? new Date().toISOString().slice(0, 10)
  const start =
    input.startDate ??
    new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10)
  const snap = await latestGscSnapshot(input.projectId)
  if (snap) {
    return {
      source: snap.source,
      stubbed: snap.stubbed,
      fetchedAt: snap.fetchedAt,
      projectId: snap.projectId,
      siteUrl: snap.siteUrl,
      startDate: snap.startDate,
      endDate: snap.endDate,
      items: snap.items,
    }
  }
  return fixtureGscPerformance({
    projectId: input.projectId,
    siteUrl: input.siteUrl,
    startDate: start,
    endDate: end,
  })
}
