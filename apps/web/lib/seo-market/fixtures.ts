import type {
  SeoBacklinksResult,
  SeoCompetitorsResult,
  SeoDomainOverviewResult,
  SeoGscPerformanceResult,
  SeoKeywordIdea,
  SeoKeywordsResult,
  SeoSerpOrganicItem,
  SeoSerpResult,
} from '@checkion-v3/contracts'

function hashSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h || 1
}

function fixtureKeywords(seed: string, limit: number): SeoKeywordIdea[] {
  const h = hashSeed(seed)
  const base = seed.trim().toLowerCase() || 'brand'
  const suffixes = ['guide', 'pricing', 'vs', 'best', 'software', 'tools', 'near me', '2026']
  return suffixes.slice(0, limit).map((suf, i) => ({
    keyword: `${base} ${suf}`.trim(),
    searchVolume: 100 + ((h + i * 17) % 9000),
    competition: Number((((h + i) % 100) / 100).toFixed(2)),
    cpc: Number((0.2 + ((h + i * 3) % 50) / 10).toFixed(2)),
    intent: i % 3 === 0 ? 'informational' : i % 3 === 1 ? 'commercial' : 'transactional',
    difficulty: 10 + ((h + i * 7) % 70),
  }))
}

export function fixtureKeywordsResult(input: {
  projectId: string
  seed: string
  limit?: number
}): SeoKeywordsResult {
  const limit = Math.min(Math.max(input.limit ?? 8, 1), 50)
  return {
    source: 'fixture',
    stubbed: true,
    fetchedAt: new Date().toISOString(),
    projectId: input.projectId,
    seed: input.seed,
    items: fixtureKeywords(input.seed, limit),
  }
}

export function fixtureSerpResult(input: {
  projectId: string
  keyword: string
}): SeoSerpResult {
  const h = hashSeed(input.keyword)
  const items: SeoSerpOrganicItem[] = Array.from({ length: 10 }, (_, i) => {
    const host = `example${(h + i) % 7}.com`
    return {
      rank: i + 1,
      domain: host,
      url: `https://${host}/page-${i + 1}`,
      title: `${input.keyword} — result ${i + 1}`,
      description: `Fixture SERP snippet for ${input.keyword}.`,
    }
  })
  return {
    source: 'fixture',
    stubbed: true,
    fetchedAt: new Date().toISOString(),
    projectId: input.projectId,
    keyword: input.keyword,
    items,
  }
}

export function fixtureDomainOverview(input: {
  projectId: string
  domain: string
}): SeoDomainOverviewResult {
  const h = hashSeed(input.domain)
  return {
    source: 'fixture',
    stubbed: true,
    fetchedAt: new Date().toISOString(),
    projectId: input.projectId,
    domain: input.domain,
    organicKeywords: 200 + (h % 8000),
    organicTraffic: 1000 + (h % 50000),
    organicCost: 50 + (h % 4000),
    topKeywords: fixtureKeywords(input.domain.replace(/^www\./, ''), 5),
  }
}

export function fixtureCompetitors(input: {
  projectId: string
  domain: string
  keywords: string[]
}): SeoCompetitorsResult {
  const h = hashSeed(input.domain + input.keywords.join('|'))
  const items = Array.from({ length: 5 }, (_, i) => ({
    domain: `competitor-${(h + i) % 20}.example`,
    overlapCount: 1 + ((h + i) % Math.max(input.keywords.length, 1)),
    avgRank: 3 + ((h + i) % 20),
  }))
  return {
    source: 'fixture',
    stubbed: true,
    fetchedAt: new Date().toISOString(),
    projectId: input.projectId,
    domain: input.domain,
    keywords: input.keywords,
    items,
  }
}

export function fixtureBacklinks(input: {
  projectId: string
  domain: string
}): SeoBacklinksResult {
  const h = hashSeed(input.domain)
  return {
    source: 'fixture',
    stubbed: true,
    fetchedAt: new Date().toISOString(),
    projectId: input.projectId,
    domain: input.domain,
    referringDomains: 40 + (h % 2000),
    backlinks: 100 + (h % 20000),
    rank: 10 + (h % 400),
    spamScore: h % 30,
  }
}

export function fixtureGscPerformance(input: {
  projectId: string
  siteUrl: string
  startDate: string
  endDate: string
}): SeoGscPerformanceResult {
  const host = input.siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return {
    source: 'fixture',
    stubbed: true,
    fetchedAt: new Date().toISOString(),
    projectId: input.projectId,
    siteUrl: input.siteUrl,
    startDate: input.startDate,
    endDate: input.endDate,
    items: fixtureKeywords(host, 6).map((k, i) => ({
      query: k.keyword,
      clicks: 10 + i * 3,
      impressions: 100 + i * 40,
      ctr: Number((0.05 + i * 0.01).toFixed(3)),
      position: 4 + i,
    })),
  }
}

export function fixtureRankSnapshots(
  domain: string,
  keywords: string[],
): Array<{ keyword: string; rank: number | null; url: string | null; fetchedAt: string }> {
  const at = new Date().toISOString()
  return keywords.map((keyword, i) => {
    const h = hashSeed(domain + keyword)
    const rank = 1 + ((h + i) % 40)
    return {
      keyword,
      rank,
      url: `https://${domain.replace(/^https?:\/\//, '').split('/')[0]}/`,
      fetchedAt: at,
    }
  })
}
