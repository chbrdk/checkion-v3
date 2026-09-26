/**
 * Collection Knowledge Pack client — pull from / publish to plexon-v3.
 * Spec: specs/domain/geo-knowledge-consume.md · plexon-v3 collection-knowledge-pack API
 */

import {
  getFederationMode,
  getPlexonServiceSecret,
  isPlexonFederationConfigured,
  plexonBaseUrl,
} from './runtime-config'
import { getPlexonContractHeaders } from './plexon-contract'
import { paths } from './paths'

export type KnowledgeProfileSlice = {
  displayName?: string
  industry?: string | null
  primaryDomain?: string | null
  tagline?: string | null
}

export type KnowledgeCompetitiveSlice = {
  category?: string | null
  hosts: string[]
}

export type KnowledgeResearchBriefSlice = {
  summary?: string | null
  topics: string[]
}

export type KnowledgeGeoContextSlice = {
  queryThemes: string[]
  seedQueries: string[]
  knownCompetitors: string[]
}

/** Additive suggest enrichment shape (API body / OpenAI context). */
export type GeoKnowledgeEnrichment = {
  profile?: KnowledgeProfileSlice
  competitive?: KnowledgeCompetitiveSlice
  researchBrief?: KnowledgeResearchBriefSlice
  geoContext?: KnowledgeGeoContextSlice
}

export type KnowledgePackResponse = {
  platformProjectId: string
  revision: number
  facets: {
    profile?: { data?: Record<string, unknown> }
    competitive?: { data?: Record<string, unknown> }
    research_brief?: { data?: Record<string, unknown> }
    geo_context?: { data?: Record<string, unknown> }
  }
}

function knowledgePath(platformProjectId: string): string {
  const base = plexonBaseUrl().replace(/\/$/, '')
  return `${base}/api/platform/projects/${encodeURIComponent(platformProjectId)}/knowledge`
}

function facetPublishPath(platformProjectId: string, facetId: string): string {
  return `${knowledgePath(platformProjectId)}/facets/${encodeURIComponent(facetId)}/publish`
}

function facetFreshnessPath(platformProjectId: string, facetId: string): string {
  return `${knowledgePath(platformProjectId)}/facets/${encodeURIComponent(facetId)}/freshness`
}

/** Soft-skip visibility — mark facet without changing distillate body. */
export async function markKnowledgeFacetFreshness(opts: {
  platformProjectId: string
  facetId: 'research_brief' | 'geo_context' | 'competitive' | 'brand' | 'profile'
  freshness: 'publish_pending' | 'publish_failed' | 'stale' | 'fresh'
  note?: string
}): Promise<boolean> {
  const id = opts.platformProjectId.trim()
  if (!id || getFederationMode() !== 'live' || !isPlexonFederationConfigured()) return false
  const secret = getPlexonServiceSecret()
  try {
    const res = await fetch(facetFreshnessPath(id, opts.facetId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getPlexonContractHeaders(secret),
      },
      body: JSON.stringify({
        freshness: opts.freshness,
        note: opts.note ?? `checkion soft-skip:${opts.freshness}`,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string').map((s) => s.trim()).filter(Boolean)
}

export function packToEnrichment(pack: KnowledgePackResponse): GeoKnowledgeEnrichment {
  const profileData = pack.facets.profile?.data ?? {}
  const competitiveData = pack.facets.competitive?.data ?? {}
  const researchData = pack.facets.research_brief?.data ?? {}
  const geoData = pack.facets.geo_context?.data ?? {}

  const competitors = Array.isArray(competitiveData.competitors)
    ? competitiveData.competitors
        .map((c) =>
          c && typeof c === 'object' && typeof (c as { host?: string }).host === 'string'
            ? (c as { host: string }).host.trim().toLowerCase()
            : '',
        )
        .filter(Boolean)
    : []

  return {
    profile: {
      displayName:
        typeof profileData.displayName === 'string' ? profileData.displayName : undefined,
      industry: typeof profileData.industry === 'string' ? profileData.industry : null,
      primaryDomain:
        typeof profileData.primaryDomain === 'string' ? profileData.primaryDomain : null,
      tagline: typeof profileData.tagline === 'string' ? profileData.tagline : null,
    },
    competitive: {
      category: typeof competitiveData.category === 'string' ? competitiveData.category : null,
      hosts: competitors,
    },
    researchBrief: {
      summary: typeof researchData.summary === 'string' ? researchData.summary : null,
      topics: asStringArray(researchData.topics),
    },
    geoContext: {
      queryThemes: asStringArray(geoData.queryThemes),
      seedQueries: asStringArray(geoData.seedQueries),
      knownCompetitors: asStringArray(geoData.knownCompetitors).map((h) => h.toLowerCase()),
    },
  }
}

export function enrichmentHasSignal(knowledge: GeoKnowledgeEnrichment | null | undefined): boolean {
  if (!knowledge) return false
  return Boolean(
    knowledge.profile?.displayName ||
      knowledge.profile?.industry ||
      knowledge.profile?.tagline ||
      knowledge.competitive?.hosts?.length ||
      knowledge.competitive?.category ||
      knowledge.researchBrief?.summary ||
      knowledge.researchBrief?.topics?.length ||
      knowledge.geoContext?.queryThemes?.length ||
      knowledge.geoContext?.seedQueries?.length ||
      knowledge.geoContext?.knownCompetitors?.length,
  )
}

export function competitorHostsFromEnrichment(
  knowledge: GeoKnowledgeEnrichment | null | undefined,
): string[] {
  if (!knowledge) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const host of [
    ...(knowledge.competitive?.hosts ?? []),
    ...(knowledge.geoContext?.knownCompetitors ?? []),
  ]) {
    const h = host.trim().toLowerCase().replace(/^www\./, '')
    if (!h || seen.has(h)) continue
    seen.add(h)
    out.push(h)
    if (out.length >= 25) break
  }
  return out
}

/**
 * GET Collection Knowledge Pack from plexon-v3 (service auth).
 * Returns null when federation is dummy / unconfigured / fetch fails.
 */
export async function fetchCollectionKnowledgePack(
  platformProjectId: string,
): Promise<KnowledgePackResponse | null> {
  const id = platformProjectId.trim()
  if (!id) return null
  if (getFederationMode() !== 'live') return null
  if (!isPlexonFederationConfigured()) return null

  const secret = getPlexonServiceSecret()
  try {
    const res = await fetch(knowledgePath(id), {
      method: 'GET',
      headers: {
        ...getPlexonContractHeaders(secret),
      },
      cache: 'no-store',
    })
    if (!res.ok) {
      console.warn(
        '[CHECKION-v3] knowledge pack GET failed:',
        res.status,
        await res.text().catch(() => ''),
      )
      return null
    }
    return (await res.json()) as KnowledgePackResponse
  } catch (e) {
    console.warn(
      '[CHECKION-v3] knowledge pack GET error:',
      e instanceof Error ? e.message : e,
    )
    return null
  }
}

export async function resolveKnowledgeEnrichment(opts: {
  platformProjectId?: string | null
  clientKnowledge?: GeoKnowledgeEnrichment | null
}): Promise<GeoKnowledgeEnrichment | null> {
  if (opts.clientKnowledge && enrichmentHasSignal(opts.clientKnowledge)) {
    return opts.clientKnowledge
  }
  if (!opts.platformProjectId?.trim()) return null
  const pack = await fetchCollectionKnowledgePack(opts.platformProjectId)
  if (!pack) return null
  return packToEnrichment(pack)
}

export async function publishGeoContextToPack(opts: {
  platformProjectId: string
  expectedRevision: number
  geoJobId: string
  queryThemes: string[]
  seedQueries: string[]
  knownCompetitors: string[]
  targetHosts: string[]
  notes?: string | null
}): Promise<{ ok: true; revision: number } | { ok: false; status: number; error: string }> {
  if (getFederationMode() !== 'live' || !isPlexonFederationConfigured()) {
    return { ok: false, status: 503, error: 'federation_not_live' }
  }
  const secret = getPlexonServiceSecret()
  let expectedRevision = opts.expectedRevision
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(facetPublishPath(opts.platformProjectId, 'geo_context'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getPlexonContractHeaders(secret),
        },
        body: JSON.stringify({
          mode: 'replace',
          expectedRevision,
          provenance: {
            actorType: 'service',
            productId: 'checkion',
            runId: opts.geoJobId,
            note: 'post-geo publish',
          },
          data: {
            queryThemes: opts.queryThemes.slice(0, 48),
            seedQueries: opts.seedQueries.slice(0, 24),
            knownCompetitors: opts.knownCompetitors.slice(0, 25),
            targetHosts: opts.targetHosts.slice(0, 32),
            lastGeoJobId: opts.geoJobId,
            notes: opts.notes ?? null,
          },
        }),
      })
      if (res.ok) {
        const body = (await res.json()) as { revision?: number }
        return { ok: true, revision: body.revision ?? expectedRevision + 1 }
      }
      if (res.status === 409 && attempt === 0) {
        const fresh = await fetchCollectionKnowledgePack(opts.platformProjectId)
        if (fresh) {
          expectedRevision = fresh.revision
          continue
        }
      }
      const text = await res.text().catch(() => '')
      return { ok: false, status: res.status, error: text || res.statusText }
    }
    return { ok: false, status: 409, error: 'revision_conflict' }
  } catch (e) {
    return {
      ok: false,
      status: 502,
      error: e instanceof Error ? e.message : 'publish_failed',
    }
  }
}

export async function publishCompetitiveMergeToPack(opts: {
  platformProjectId: string
  expectedRevision: number
  geoJobId: string
  hosts: string[]
  category?: string | null
}): Promise<{ ok: true; revision: number } | { ok: false; status: number; error: string }> {
  if (getFederationMode() !== 'live' || !isPlexonFederationConfigured()) {
    return { ok: false, status: 503, error: 'federation_not_live' }
  }
  const secret = getPlexonServiceSecret()
  let expectedRevision = opts.expectedRevision
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(facetPublishPath(opts.platformProjectId, 'competitive'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getPlexonContractHeaders(secret),
        },
        body: JSON.stringify({
          mode: 'merge',
          expectedRevision,
          provenance: {
            actorType: 'service',
            productId: 'checkion',
            runId: opts.geoJobId,
            note: 'post-geo competitive merge',
          },
          data: {
            category: opts.category ?? null,
            competitors: opts.hosts.slice(0, 25).map((host) => ({
              host,
              source: 'checkion' as const,
            })),
            notes: null,
          },
        }),
      })
      if (res.ok) {
        const body = (await res.json()) as { revision?: number }
        return { ok: true, revision: body.revision ?? expectedRevision + 1 }
      }
      if (res.status === 409 && attempt === 0) {
        const fresh = await fetchCollectionKnowledgePack(opts.platformProjectId)
        if (fresh) {
          expectedRevision = fresh.revision
          continue
        }
      }
      const text = await res.text().catch(() => '')
      return { ok: false, status: res.status, error: text || res.statusText }
    }
    return { ok: false, status: 409, error: 'revision_conflict' }
  } catch (e) {
    return {
      ok: false,
      status: 502,
      error: e instanceof Error ? e.message : 'publish_failed',
    }
  }
}

type FacetPublishResult =
  | { ok: true; revision: number }
  | { ok: false; status: number; error: string }

async function publishFacetMerge(opts: {
  platformProjectId: string
  facetId: 'research_brief' | 'profile' | 'geo_context'
  expectedRevision: number
  runId: string
  note: string
  data: Record<string, unknown>
}): Promise<FacetPublishResult> {
  if (getFederationMode() !== 'live' || !isPlexonFederationConfigured()) {
    return { ok: false, status: 503, error: 'federation_not_live' }
  }
  const secret = getPlexonServiceSecret()
  let expectedRevision = opts.expectedRevision
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(facetPublishPath(opts.platformProjectId, opts.facetId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getPlexonContractHeaders(secret),
        },
        body: JSON.stringify({
          mode: 'merge',
          expectedRevision,
          provenance: {
            actorType: 'service',
            productId: 'checkion',
            runId: opts.runId,
            note: opts.note,
          },
          data: opts.data,
        }),
      })
      if (res.ok) {
        const body = (await res.json()) as { revision?: number }
        return { ok: true, revision: body.revision ?? expectedRevision + 1 }
      }
      if (res.status === 409 && attempt === 0) {
        const fresh = await fetchCollectionKnowledgePack(opts.platformProjectId)
        if (fresh) {
          expectedRevision = fresh.revision
          continue
        }
      }
      const text = await res.text().catch(() => '')
      return { ok: false, status: res.status, error: text || res.statusText }
    }
    return { ok: false, status: 409, error: 'revision_conflict' }
  } catch (e) {
    return {
      ok: false,
      status: 502,
      error: e instanceof Error ? e.message : 'publish_failed',
    }
  }
}

/**
 * Publish Market Suggest Research Agent distillate → Collection Knowledge Pack.
 * Spec: specs/domain/seo-market-suggest-agent.md § Phase 2.
 */
export async function publishMarketSuggestBriefToPack(opts: {
  platformProjectId: string
  runId: string
  projectId: string
  brief: {
    summary: string
    category: string | null
    products: string[]
    services: string[]
    audiences: string[]
  }
  keywords: string[]
}): Promise<
  | { ok: true; revision: number; facets: string[] }
  | { ok: false; status: number; error: string }
> {
  if (getFederationMode() !== 'live' || !isPlexonFederationConfigured()) {
    return { ok: false, status: 503, error: 'federation_not_live' }
  }
  const pack = await fetchCollectionKnowledgePack(opts.platformProjectId)
  if (!pack) {
    return { ok: false, status: 502, error: 'knowledge_pack_unavailable' }
  }
  let revision = pack.revision
  const facets: string[] = []
  const topics = [
    ...opts.brief.products,
    ...opts.brief.services,
    ...opts.brief.audiences,
    opts.brief.category ?? '',
  ]
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 24)

  const briefPub = await publishFacetMerge({
    platformProjectId: opts.platformProjectId,
    facetId: 'research_brief',
    expectedRevision: revision,
    runId: opts.runId,
    note: 'market-suggest-agent',
    data: {
      summary: opts.brief.summary.slice(0, 2000),
      topics,
      sections: [
        {
          id: 'market-suggest',
          title: 'Market Suggest brief',
          plainText: opts.brief.summary.slice(0, 2000),
          bullets: [...opts.brief.products, ...opts.brief.services].slice(0, 12),
        },
      ],
      sourceRunId: opts.runId,
      sourceProjectId: opts.projectId,
    },
  })
  if (!briefPub.ok) return briefPub
  revision = briefPub.revision
  facets.push('research_brief')

  if (opts.brief.category?.trim()) {
    const profilePub = await publishFacetMerge({
      platformProjectId: opts.platformProjectId,
      facetId: 'profile',
      expectedRevision: revision,
      runId: opts.runId,
      note: 'market-suggest-agent profile',
      data: {
        industry: opts.brief.category.trim().slice(0, 120),
        tagline: opts.brief.summary.slice(0, 200),
      },
    })
    if (profilePub.ok) {
      revision = profilePub.revision
      facets.push('profile')
    }
  }

  const seeds = [...opts.keywords, ...opts.brief.products].filter(Boolean).slice(0, 24)
  const themes = [
    opts.brief.category,
    ...opts.brief.audiences,
    ...opts.brief.products.slice(0, 6),
  ]
    .filter((t): t is string => Boolean(t?.trim()))
    .slice(0, 24)
  if (seeds.length || themes.length) {
    const geoPub = await publishFacetMerge({
      platformProjectId: opts.platformProjectId,
      facetId: 'geo_context',
      expectedRevision: revision,
      runId: opts.runId,
      note: 'market-suggest-agent geo seeds',
      data: {
        seedQueries: seeds,
        queryThemes: themes,
      },
    })
    if (geoPub.ok) {
      revision = geoPub.revision
      facets.push('geo_context')
    }
  }

  return { ok: true, revision, facets }
}

/** Path helper for docs / tests. */
export function plexonKnowledgeApiPath(platformProjectId: string): string {
  return `${paths.envPlexonBase} → /api/platform/projects/${platformProjectId}/knowledge`
}
