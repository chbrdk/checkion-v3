/**
 * Publish GEO distillates to Collection Knowledge Pack (CTA + post-job autosync).
 */

import type { GeoOverview } from '@checkion-v3/contracts'
import { getGeoOverview } from './fixtures/geo-store'
import { getProject } from './fixtures/project-store'
import { hostFromUrl } from './geo-query-suggest'
import {
  fetchCollectionKnowledgePack,
  publishCompetitiveMergeToPack,
  publishGeoContextToPack,
} from './plexon-knowledge-pack'
import { getFederationMode, isPlexonFederationConfigured } from './runtime-config'

export type GeoKnowledgePublishResult =
  | {
      ok: true
      platformProjectId: string
      revision: number
      skipped?: never
    }
  | {
      ok: false
      status: number
      error: string
      detail?: string
      skipped?: boolean
      geoContextRevision?: number
    }

function autosyncDisabled(): boolean {
  const raw = process.env.KNOWLEDGE_PACK_AUTOSYNC?.trim().toLowerCase()
  return raw === '0' || raw === 'false' || raw === 'off'
}

function distillFromOverview(overview: GeoOverview) {
  const rivalHosts = (overview.presence.rivals ?? [])
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12)

  const knownCompetitors = [
    ...overview.competitors.map((c) => c.trim().toLowerCase()),
    ...rivalHosts,
  ].filter((h, i, arr) => h && arr.indexOf(h) === i)

  const themes = (overview.insights?.moves ?? overview.recommendations ?? [])
    .map((m) => m.title?.trim())
    .filter((t): t is string => Boolean(t))
    .slice(0, 12)

  return {
    knownCompetitors,
    queryThemes: themes.length
      ? themes
      : overview.queries.slice(0, 8).map((q) => q.slice(0, 80)),
    seedQueries: overview.queries.slice(0, 24),
    targetHosts: [overview.targetHost || hostFromUrl(overview.job.url)].filter(Boolean),
    notes: overview.lede?.slice(0, 500) || null,
  }
}

/**
 * Publish geo_context + competitive merge for a completed GEO job.
 */
export async function publishGeoJobKnowledge(opts: {
  jobId: string
  /** When true, missing Collection / federation dummy → soft skip. */
  soft?: boolean
}): Promise<GeoKnowledgePublishResult> {
  const soft = Boolean(opts.soft)
  const jobId = opts.jobId.trim()
  if (!jobId) {
    return { ok: false, status: 400, error: 'invalid_id' }
  }

  if (getFederationMode() !== 'live' || !isPlexonFederationConfigured()) {
    return soft
      ? { ok: false, status: 503, error: 'federation_not_live', skipped: true }
      : { ok: false, status: 503, error: 'federation_not_live' }
  }

  const overview = await getGeoOverview(jobId)
  if (!overview) {
    return { ok: false, status: 404, error: 'not_found' }
  }
  if (overview.job.status !== 'completed') {
    return soft
      ? { ok: false, status: 409, error: 'not_ready', skipped: true }
      : {
          ok: false,
          status: 409,
          error: 'not_ready',
          detail: 'GEO job must be completed before publish',
        }
  }

  const project = await getProject(overview.job.projectId)
  const platformProjectId = project?.platformProjectId?.trim() ?? ''
  if (!platformProjectId || platformProjectId.startsWith('plx-local-')) {
    return soft
      ? { ok: false, status: 422, error: 'no_collection', skipped: true }
      : {
          ok: false,
          status: 422,
          error: 'no_collection',
          detail: 'Project is not bound to a Plexon Collection',
        }
  }

  const pack = await fetchCollectionKnowledgePack(platformProjectId)
  if (!pack) {
    return soft
      ? { ok: false, status: 502, error: 'pack_unavailable', skipped: true }
      : {
          ok: false,
          status: 502,
          error: 'pack_unavailable',
          detail: 'Could not load Collection knowledge pack',
        }
  }

  const distilled = distillFromOverview(overview)
  const geoPub = await publishGeoContextToPack({
    platformProjectId,
    expectedRevision: pack.revision,
    geoJobId: jobId,
    queryThemes: distilled.queryThemes,
    seedQueries: distilled.seedQueries,
    knownCompetitors: distilled.knownCompetitors,
    targetHosts: distilled.targetHosts,
    notes: distilled.notes,
  })
  if (!geoPub.ok) {
    return {
      ok: false,
      status: geoPub.status >= 400 ? geoPub.status : 502,
      error: 'publish_geo_failed',
      detail: geoPub.error,
      skipped: soft,
    }
  }

  const competitivePub = await publishCompetitiveMergeToPack({
    platformProjectId,
    expectedRevision: geoPub.revision,
    geoJobId: jobId,
    hosts: distilled.knownCompetitors,
  })
  if (!competitivePub.ok) {
    return {
      ok: false,
      status: competitivePub.status >= 400 ? competitivePub.status : 502,
      error: 'publish_competitive_failed',
      detail: competitivePub.error,
      geoContextRevision: geoPub.revision,
      skipped: soft,
    }
  }

  return {
    ok: true,
    platformProjectId,
    revision: competitivePub.revision,
  }
}

/** Fire-and-forget after GEO completes (no-op when dummy / unbound / disabled). */
export function scheduleGeoKnowledgeAutosync(jobId: string): void {
  if (autosyncDisabled()) return
  void publishGeoJobKnowledge({ jobId, soft: true }).then((result) => {
    if (result.ok) {
      console.info(
        '[CHECKION-v3] knowledge autosync ok',
        jobId,
        `rev=${result.revision}`,
      )
      return
    }
    if (result.skipped) return
    console.warn(
      '[CHECKION-v3] knowledge autosync failed',
      jobId,
      result.error,
      result.detail ?? '',
    )
  })
}
