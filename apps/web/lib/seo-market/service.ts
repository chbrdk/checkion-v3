import type {
  SeoBacklinksResult,
  SeoCompetitorsResult,
  SeoDomainOverviewResult,
  SeoGscPerformanceResult,
  SeoGscStatus,
  SeoKeywordsResult,
  SeoSerpResult,
} from '@checkion-v3/contracts'
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
  fixtureGscPerformance,
  fixtureKeywordsResult,
  fixtureRankSnapshots,
  fixtureSerpResult,
} from './fixtures'
import { shouldRunLiveSeoMarket } from './live-seo-market-gate'
import { brandSeedFromHost } from './host-utils'
import {
  assertSeoMarketSoftCap,
  getSeoMarketCache,
  recordSeoMarketUsage,
  setSeoMarketCache,
  updateSeoRankTracker,
} from './store'

function normalizeDomain(raw: string): string {
  return raw.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
}

export async function researchKeywords(input: {
  projectId: string
  seed: string
  locationCode?: number
  languageCode?: string
  limit?: number
}): Promise<SeoKeywordsResult> {
  const cacheKey = `keywords:${input.seed}:${input.locationCode ?? 2840}:${input.languageCode ?? 'en'}:${input.limit ?? 20}`
  const cached = await getSeoMarketCache(input.projectId, cacheKey)
  if (cached) return cached as unknown as SeoKeywordsResult

  if (!shouldRunLiveSeoMarket()) {
    const result = fixtureKeywordsResult(input)
    await setSeoMarketCache({
      projectId: input.projectId,
      cacheKey,
      payload: result as unknown as Record<string, unknown>,
    })
    return result
  }

  await assertSeoMarketSoftCap(input.projectId, 1)
  try {
    const { result, units } = await liveKeywords(input)
    await recordSeoMarketUsage({
      projectId: input.projectId,
      endpoint: 'keywords',
      units,
    })
    await setSeoMarketCache({
      projectId: input.projectId,
      cacheKey,
      payload: result as unknown as Record<string, unknown>,
    })
    return result
  } catch (e) {
    if ((e as Error & { code?: string }).code === 'cost_soft_cap') throw e
    throw e
  }
}

export async function researchSerp(input: {
  projectId: string
  keyword: string
  locationCode?: number
  languageCode?: string
}): Promise<SeoSerpResult> {
  const cacheKey = `serp:${input.keyword}:${input.locationCode ?? 2840}`
  const cached = await getSeoMarketCache(input.projectId, cacheKey)
  if (cached) return cached as unknown as SeoSerpResult

  if (!shouldRunLiveSeoMarket()) {
    const result = fixtureSerpResult(input)
    await setSeoMarketCache({
      projectId: input.projectId,
      cacheKey,
      payload: result as unknown as Record<string, unknown>,
      ttlSeconds: 900,
    })
    return result
  }

  await assertSeoMarketSoftCap(input.projectId, 1)
  try {
    const { result, units } = await liveSerp(input)
    await recordSeoMarketUsage({
      projectId: input.projectId,
      endpoint: 'serp',
      units,
    })
    await setSeoMarketCache({
      projectId: input.projectId,
      cacheKey,
      payload: result as unknown as Record<string, unknown>,
      ttlSeconds: 900,
    })
    return result
  } catch (e) {
    if ((e as Error & { code?: string }).code === 'cost_soft_cap') throw e
    throw e
  }
}

export async function researchDomainOverview(input: {
  projectId: string
  domain: string
}): Promise<SeoDomainOverviewResult> {
  const domain = normalizeDomain(input.domain)
  const cacheKey = `domain-overview:${domain}`
  const cached = await getSeoMarketCache(input.projectId, cacheKey)
  if (cached) return cached as unknown as SeoDomainOverviewResult

  if (!shouldRunLiveSeoMarket()) {
    const result = fixtureDomainOverview({ ...input, domain })
    await setSeoMarketCache({
      projectId: input.projectId,
      cacheKey,
      payload: result as unknown as Record<string, unknown>,
    })
    return result
  }

  await assertSeoMarketSoftCap(input.projectId, 2)
  try {
    const { result, units } = await liveDomainOverview({ ...input, domain })
    await recordSeoMarketUsage({
      projectId: input.projectId,
      endpoint: 'domain-overview',
      units,
    })
    await setSeoMarketCache({
      projectId: input.projectId,
      cacheKey,
      payload: result as unknown as Record<string, unknown>,
    })
    return result
  } catch (e) {
    if ((e as Error & { code?: string }).code === 'cost_soft_cap') throw e
    throw e
  }
}

export async function researchCompetitors(input: {
  projectId: string
  domain: string
  keywords: string[]
}): Promise<SeoCompetitorsResult> {
  const domain = normalizeDomain(input.domain)
  const keywords = input.keywords.map((k) => k.trim()).filter(Boolean).slice(0, 10)
  if (keywords.length === 0) {
    if (!shouldRunLiveSeoMarket()) {
      return fixtureCompetitors({ projectId: input.projectId, domain, keywords: [] })
    }
    return {
      source: 'dataforseo',
      stubbed: false,
      fetchedAt: new Date().toISOString(),
      projectId: input.projectId,
      domain,
      keywords: [],
      items: [],
    }
  }

  if (!shouldRunLiveSeoMarket()) {
    return fixtureCompetitors({ projectId: input.projectId, domain, keywords })
  }

  await assertSeoMarketSoftCap(input.projectId, keywords.length)
  const counts = new Map<string, { overlap: number; rankSum: number; n: number }>()
  let units = 0
  try {
    for (const keyword of keywords) {
      const { result, units: u } = await liveSerp({
        projectId: input.projectId,
        keyword,
      })
      units += u
      for (const item of result.items) {
        const d = item.domain.toLowerCase()
        const brand = brandSeedFromHost(domain)
        if (
          !d ||
          d === domain ||
          domain.includes(d) ||
          (brand !== 'brand' && d.includes(brand))
        ) {
          continue
        }
        const cur = counts.get(d) ?? { overlap: 0, rankSum: 0, n: 0 }
        cur.overlap += 1
        cur.rankSum += item.rank
        cur.n += 1
        counts.set(d, cur)
      }
    }
    await recordSeoMarketUsage({
      projectId: input.projectId,
      endpoint: 'competitors',
      units,
    })
    const items = [...counts.entries()]
      .map(([d, v]) => ({
        domain: d,
        overlapCount: v.overlap,
        avgRank: v.n ? Number((v.rankSum / v.n).toFixed(1)) : null,
      }))
      .sort((a, b) => b.overlapCount - a.overlapCount)
      .slice(0, 15)
    return {
      source: 'dataforseo',
      stubbed: false,
      fetchedAt: new Date().toISOString(),
      projectId: input.projectId,
      domain,
      keywords,
      items,
    }
  } catch (e) {
    if ((e as Error & { code?: string }).code === 'cost_soft_cap') throw e
    throw e
  }
}

export async function researchBacklinks(input: {
  projectId: string
  domain: string
}): Promise<SeoBacklinksResult> {
  const domain = normalizeDomain(input.domain)
  const cacheKey = `backlinks:${domain}`
  const cached = await getSeoMarketCache(input.projectId, cacheKey)
  if (cached) return cached as unknown as SeoBacklinksResult

  if (!shouldRunLiveSeoMarket()) {
    const result = fixtureBacklinks({ ...input, domain })
    await setSeoMarketCache({
      projectId: input.projectId,
      cacheKey,
      payload: result as unknown as Record<string, unknown>,
      ttlSeconds: 7200,
    })
    return result
  }

  await assertSeoMarketSoftCap(input.projectId, 2)
  try {
    const { result, units } = await liveBacklinks({ ...input, domain })
    await recordSeoMarketUsage({
      projectId: input.projectId,
      endpoint: 'backlinks',
      units,
    })
    await setSeoMarketCache({
      projectId: input.projectId,
      cacheKey,
      payload: result as unknown as Record<string, unknown>,
      ttlSeconds: 7200,
    })
    return result
  } catch (e) {
    if ((e as Error & { code?: string }).code === 'cost_soft_cap') throw e
    throw e
  }
}

export async function refreshRankTracker(id: string): Promise<void> {
  const { getSeoRankTracker } = await import('./store')
  const tracker = await getSeoRankTracker(id)
  if (!tracker) throw new Error('not_found')
  await updateSeoRankTracker(id, { status: 'running' })
  try {
    await assertSeoMarketSoftCap(tracker.projectId, tracker.keywords.length || 1)
    let latest
    let units = tracker.keywords.length
    if (shouldRunLiveSeoMarket()) {
      const live = await liveKeywordPositions({
        domain: tracker.domain,
        keywords: tracker.keywords,
        locationCode: tracker.locationCode,
        languageCode: tracker.languageCode,
      })
      latest = live.snapshots
      units = live.units
    } else {
      latest = fixtureRankSnapshots(tracker.domain, tracker.keywords)
    }
    await recordSeoMarketUsage({
      projectId: tracker.projectId,
      endpoint: 'rank-refresh',
      units,
    })
    await updateSeoRankTracker(id, {
      status: 'completed',
      lastRefreshAt: new Date().toISOString(),
      latest,
    })
  } catch (e) {
    await updateSeoRankTracker(id, {
      status: 'failed',
      error: e instanceof Error ? e.message : 'refresh_failed',
    })
    throw e
  }
}

export function gscStatus(projectId: string): SeoGscStatus {
  const connected = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim(),
  )
  return {
    projectId,
    connected,
    siteUrl: null,
    stubbed: !connected,
  }
}

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
  // OAuth token store deferred — fixture / stub until suite OAuth lands.
  return fixtureGscPerformance({
    projectId: input.projectId,
    siteUrl: input.siteUrl,
    startDate: start,
    endDate: end,
  })
}
