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

/** Path helper for docs / tests. */
export function plexonKnowledgeApiPath(platformProjectId: string): string {
  return `${paths.envPlexonBase} → /api/platform/projects/${platformProjectId}/knowledge`
}
