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
  const backlinks = 100 + (h % 20000)
  const referringDomains = 40 + (h % 2000)
  const rank = 10 + (h % 90)
  const items = Array.from({ length: 8 }, (_, i) => {
    const host = `ref${(h + i) % 50}.example`
    return {
      id: `fix-bl-${i}`,
      title: `Referring page ${i + 1} for ${input.domain}`,
      urlFrom: `https://${host}/posts/${input.domain.replace(/\./g, '-')}-${i}`,
      domainFrom: host,
      domainFromRank: 20 + ((h + i * 7) % 70),
      pageFromRank: 15 + ((h + i * 3) % 60),
      linksCount: 1 + (i % 4),
      anchor: i % 3 === 0 ? input.domain.split('.')[0] ?? 'brand' : `link to ${input.domain}`,
      urlTo: `https://${input.domain}/`,
      itemType: i % 5 === 0 ? 'image' : 'anchor',
      dofollow: i % 3 !== 0,
      isNew: i < 2,
      isLost: false,
      isBroken: false,
      firstSeen: new Date(Date.now() - (60 - i) * 86400000).toISOString(),
      lastSeen: new Date(Date.now() - i * 86400000).toISOString(),
      spamScore: i % 4,
    }
  })
  const timeseries = [3, 2, 1, 0].map((weeksAgo, i) => ({
    date: new Date(Date.now() - weeksAgo * 7 * 86400000).toISOString(),
    backlinks: Math.max(10, backlinks - (3 - i) * 40),
    referringDomains: Math.max(5, referringDomains - (3 - i) * 8),
  }))
  return {
    source: 'fixture',
    stubbed: true,
    fetchedAt: new Date().toISOString(),
    projectId: input.projectId,
    domain: input.domain,
    referringDomains,
    backlinks,
    rank,
    spamScore: h % 30,
    targetSpamScore: h % 15,
    brokenBacklinks: h % 20,
    referringPages: Math.round(backlinks * 0.85),
    referringPagesNofollow: Math.round(backlinks * 0.12),
    newBacklinks: 12 + (h % 20),
    lostBacklinks: 3 + (h % 8),
    newReferringDomains: 4 + (h % 6),
    lostReferringDomains: 1 + (h % 3),
    referringLinksTld: [
      { tld: '.com', count: Math.round(referringDomains * 0.55) },
      { tld: '.de', count: Math.round(referringDomains * 0.18) },
      { tld: '.org', count: Math.round(referringDomains * 0.12) },
      { tld: '.io', count: Math.round(referringDomains * 0.08) },
      { tld: '.net', count: Math.round(referringDomains * 0.07) },
    ],
    referringLinksTypes: {
      anchor: Math.round(backlinks * 0.9),
      image: Math.round(backlinks * 0.08),
      redirect: Math.round(backlinks * 0.02),
    },
    items,
    timeseries,
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
