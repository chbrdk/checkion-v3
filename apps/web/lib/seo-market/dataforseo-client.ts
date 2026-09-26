import { paths } from '../paths'
import { requireDataForSeoKey } from './live-seo-market-gate'
import { brandSeedFromHost } from './host-utils'
import type {
  SeoBacklinksResult,
  SeoDomainOverviewResult,
  SeoKeywordIdea,
  SeoKeywordsResult,
  SeoSerpOrganicItem,
  SeoSerpResult,
} from '@checkion-v3/contracts'
import { fetchLiveBacklinksPack } from './dataforseo-backlinks'

type DataForSeoTask = {
  status_code?: number
  status_message?: string
  result?: unknown
  cost?: number
}

type DataForSeoEnvelope = {
  status_code?: number
  status_message?: string
  tasks?: DataForSeoTask[]
  cost?: number
}

async function dataForSeoPost(path: string, body: unknown[]): Promise<{
  envelope: DataForSeoEnvelope
  units: number
}> {
  const key = requireDataForSeoKey()
  const url = `${paths.dataForSeoApiBase}${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    // Backlinks pack fans out; individual calls can be slow on large domains.
    signal: AbortSignal.timeout(90_000),
  })
  const envelope = (await res.json()) as DataForSeoEnvelope
  if (!res.ok) {
    throw new Error(
      `DataForSEO HTTP ${res.status}: ${envelope.status_message ?? res.statusText}`,
    )
  }
  if (envelope.status_code && envelope.status_code >= 40000) {
    throw new Error(envelope.status_message ?? `DataForSEO status ${envelope.status_code}`)
  }
  const task = envelope.tasks?.[0]
  if (task?.status_code && task.status_code >= 40000) {
    throw new Error(task.status_message ?? `DataForSEO task ${task.status_code}`)
  }
  const units = Math.max(1, Math.ceil(Number(envelope.cost ?? task?.cost ?? 1) * 100) || 1)
  return { envelope, units }
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

export async function liveKeywords(input: {
  projectId: string
  seed: string
  locationCode?: number
  languageCode?: string
  limit?: number
}): Promise<{ result: SeoKeywordsResult; units: number }> {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50)
  const { envelope, units } = await dataForSeoPost(
    '/keywords_data/google_ads/keywords_for_keywords/live',
    [
      {
        keywords: [input.seed],
        location_code: input.locationCode ?? 2840,
        language_code: input.languageCode ?? 'en',
        sort_by: 'search_volume',
      },
    ],
  )
  const taskResult = envelope.tasks?.[0]?.result
  const rows = Array.isArray(taskResult) ? taskResult : []
  const items: SeoKeywordIdea[] = rows.slice(0, limit).map((row) => {
    const r = asRecord(row) ?? {}
    return {
      keyword: String(r.keyword ?? ''),
      searchVolume: typeof r.search_volume === 'number' ? r.search_volume : null,
      competition: typeof r.competition === 'number' ? r.competition : null,
      cpc: typeof r.cpc === 'number' ? r.cpc : null,
      intent: null,
      difficulty: null,
    }
  }).filter((k) => k.keyword)

  let unitsTotal = units
  const keywords = items.map((i) => i.keyword).filter(Boolean).slice(0, limit)
  if (keywords.length > 0) {
    try {
      const kd = await dataForSeoPost(
        '/dataforseo_labs/google/bulk_keyword_difficulty/live',
        [{ keywords, location_code: input.locationCode ?? 2840, language_code: input.languageCode ?? 'en' }],
      )
      unitsTotal += kd.units
      const kdResult = kd.envelope.tasks?.[0]?.result
      const kdFirst = Array.isArray(kdResult) ? asRecord(kdResult[0]) : null
      const kdItems =
        kdFirst && Array.isArray(kdFirst.items) ? kdFirst.items : Array.isArray(kdResult) ? kdResult : []
      const byKw = new Map<string, number>()
      for (const row of kdItems) {
        const r = asRecord(row)
        if (!r) continue
        const kw = String(r.keyword ?? '')
        const diff =
          typeof r.keyword_difficulty === 'number'
            ? r.keyword_difficulty
            : typeof r.difficulty === 'number'
              ? r.difficulty
              : null
        if (kw && diff != null) byKw.set(kw.toLowerCase(), diff)
      }
      for (const item of items) {
        const d = byKw.get(item.keyword.toLowerCase())
        if (d != null) item.difficulty = d
      }
    } catch {
      /* best-effort KD */
    }
  }

  return {
    units: unitsTotal,
    result: {
      source: 'dataforseo',
      stubbed: false,
      fetchedAt: new Date().toISOString(),
      projectId: input.projectId,
      seed: input.seed,
      items,
    },
  }
}

export async function liveSerp(input: {
  projectId: string
  keyword: string
  locationCode?: number
  languageCode?: string
}): Promise<{ result: SeoSerpResult; units: number }> {
  const { envelope, units } = await dataForSeoPost('/serp/google/organic/live/regular', [
    {
      keyword: input.keyword,
      location_code: input.locationCode ?? 2840,
      language_code: input.languageCode ?? 'en',
      depth: 10,
    },
  ])
  const taskResult = envelope.tasks?.[0]?.result
  const first = Array.isArray(taskResult) ? asRecord(taskResult[0]) : null
  const itemsRaw = first && Array.isArray(first.items) ? first.items : []
  const items: SeoSerpOrganicItem[] = []
  for (const row of itemsRaw) {
    const r = asRecord(row)
    if (!r || r.type !== 'organic') continue
    items.push({
      rank: typeof r.rank_group === 'number' ? r.rank_group : items.length + 1,
      domain: String(r.domain ?? ''),
      url: String(r.url ?? ''),
      title: String(r.title ?? ''),
      description: typeof r.description === 'string' ? r.description : null,
    })
  }
  return {
    units,
    result: {
      source: 'dataforseo',
      stubbed: false,
      fetchedAt: new Date().toISOString(),
      projectId: input.projectId,
      keyword: input.keyword,
      items,
    },
  }
}

export async function liveDomainOverview(input: {
  projectId: string
  domain: string
}): Promise<{ result: SeoDomainOverviewResult; units: number }> {
  const domain = input.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const { envelope, units } = await dataForSeoPost(
    '/dataforseo_labs/google/domain_rank_overview/live',
    [{ target: domain }],
  )
  const taskResult = envelope.tasks?.[0]?.result
  const first = Array.isArray(taskResult) ? asRecord(taskResult[0]) : null
  const metrics = first ? asRecord(first.metrics) : null
  const organic = metrics ? asRecord(metrics.organic) : null

  let topKeywords: SeoKeywordIdea[] = []
  let kwUnits = 0
  try {
    const ranked = await dataForSeoPost(
      '/dataforseo_labs/google/ranked_keywords/live',
      [{ target: domain, limit: 40 }],
    )
    kwUnits = ranked.units
    const kwResult = ranked.envelope.tasks?.[0]?.result
    const kwFirst = Array.isArray(kwResult) ? asRecord(kwResult[0]) : null
    const items = kwFirst && Array.isArray(kwFirst.items) ? kwFirst.items : []
    topKeywords = items.slice(0, 40).map((row) => {
      const r = asRecord(row) ?? {}
      const kd = asRecord(r.keyword_data) ?? {}
      const ki = asRecord(kd.keyword_info) ?? {}
      return {
        keyword: String(kd.keyword ?? r.keyword ?? ''),
        searchVolume: typeof ki.search_volume === 'number' ? ki.search_volume : null,
        competition: typeof ki.competition === 'number' ? ki.competition : null,
        cpc: typeof ki.cpc === 'number' ? ki.cpc : null,
        intent: null,
        difficulty: null,
      }
    }).filter((k) => k.keyword)
  } catch {
    topKeywords = []
  }

  return {
    units: units + kwUnits,
    result: {
      source: 'dataforseo',
      stubbed: false,
      fetchedAt: new Date().toISOString(),
      projectId: input.projectId,
      domain,
      organicKeywords: organic && typeof organic.count === 'number' ? organic.count : null,
      organicTraffic: organic && typeof organic.etv === 'number' ? organic.etv : null,
      organicCost: organic && typeof organic.estimated_paid_traffic_cost === 'number'
        ? organic.estimated_paid_traffic_cost
        : null,
      topKeywords,
    },
  }
}

export async function liveBacklinks(input: {
  projectId: string
  domain: string
  /** Max referring pages to pull (default 25, max 50). */
  limit?: number
}): Promise<{ result: SeoBacklinksResult; units: number }> {
  return fetchLiveBacklinksPack(dataForSeoPost, input)
}

export async function liveKeywordPositions(input: {
  domain: string
  keywords: string[]
  locationCode?: number
  languageCode?: string
}): Promise<{
  snapshots: Array<{ keyword: string; rank: number | null; url: string | null; fetchedAt: string }>
  units: number
}> {
  const domain = input.domain.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
  const at = new Date().toISOString()
  const snapshots: Array<{
    keyword: string
    rank: number | null
    url: string | null
    fetchedAt: string
  }> = []
  let units = 0
  for (const keyword of input.keywords.slice(0, 20)) {
    const serp = await liveSerp({
      projectId: '_rank',
      keyword,
      locationCode: input.locationCode,
      languageCode: input.languageCode,
    })
    units += serp.units
    const brand = brandSeedFromHost(domain)
    const hit =
      serp.result.items.find(
        (i) => brand !== 'brand' && i.domain.toLowerCase().includes(brand),
      ) ?? serp.result.items.find((i) => i.domain.toLowerCase() === domain)
    snapshots.push({
      keyword,
      rank: hit?.rank ?? null,
      url: hit?.url ?? null,
      fetchedAt: at,
    })
  }
  return { snapshots, units }
}
