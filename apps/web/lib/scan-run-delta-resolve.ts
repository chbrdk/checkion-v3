/**
 * Store-backed Gegentest resolve — specs/domain/scan-run-delta.md / specs/api/scan-run-delta.md
 */

import type {
  DomainScanLight,
  GeoJobSummary,
  GeoMeasurement,
  ScoreCard,
  ScoreKind,
  ScanSummary,
} from '@checkion-v3/contracts'
import { listDomainCorpusPages } from './domain-corpus-pages'
import { geoJobMeasurement } from './geo/measurement'
import { getGeoOverview, listGeoJobs } from './fixtures/geo-store'
import {
  getDomainOverview,
  getDomainScan,
  getScan,
  getScanIssues,
  getScanScores,
  listDomainCorpusPageScans,
  listDomainScans,
  listScans,
} from './fixtures/scan-store'
import {
  computeScanRunDelta,
  findPreviousRunBaseline,
  geoRecommendationsToFindingRefs,
  geoScoresToDeltaInput,
  issuesToFindingRefs,
  normalizeScanRunUrlSet,
  scoreCardsToDeltaInput,
  type ScanRunBaselineCandidate,
  urlSetsEqual,
} from './scan-run-delta'

export type ScanRunDeltaResolveError =
  | { error: 'not_found' }
  | { error: 'no_baseline' }
  | { error: 'measurement_mismatch' }
  | { error: 'kind_mismatch' }

export type ScanRunDeltaResolveResult =
  | { ok: true; delta: import('@checkion-v3/contracts').ScanRunDeltaResult }
  | ({ ok: false } & ScanRunDeltaResolveError)

function scanCandidate(scan: ScanSummary): ScanRunBaselineCandidate {
  return {
    id: scan.id,
    projectId: scan.projectId,
    urlSet: normalizeScanRunUrlSet([scan.url]),
    status: scan.status,
    completedAt: scan.completedAt,
    startedAt: scan.startedAt,
  }
}

function domainRootCandidate(domain: DomainScanLight): ScanRunBaselineCandidate {
  return {
    id: domain.id,
    projectId: domain.projectId,
    urlSet: normalizeScanRunUrlSet([domain.rootUrl]),
    status: domain.status,
    completedAt: domain.completedAt,
    startedAt: domain.startedAt,
  }
}

function geoCandidate(job: GeoJobSummary): ScanRunBaselineCandidate {
  return {
    id: job.id,
    projectId: job.projectId,
    urlSet: normalizeScanRunUrlSet([job.url]),
    status: job.status,
    completedAt: job.completedAt,
    startedAt: job.completedAt ?? job.id,
    measurement: geoJobMeasurement(job),
  }
}

async function domainStoredUrlSet(domain: DomainScanLight): Promise<string[]> {
  const pages = await listDomainCorpusPages(domain.id, {
    page: 1,
    pageSize: 100,
    sort: 'url_asc',
  })
  if (pages?.corpusMode === 'corpus' && pages.items.length > 0 && pages.totalPages === 1) {
    return normalizeScanRunUrlSet(pages.items.map((p) => p.url))
  }
  const pageScans = await listDomainCorpusPageScans(domain.id)
  if (pageScans.length > 0) {
    return normalizeScanRunUrlSet(pageScans.map((s) => s.url))
  }
  return normalizeScanRunUrlSet([domain.rootUrl])
}

function scoresFromDomain(
  overviewScores: ScoreCard[] | undefined,
  light: DomainScanLight,
  fallback: ScoreCard[],
): ScoreCard[] {
  if (overviewScores?.length) return overviewScores
  if (light.scoresByKind) {
    return Object.entries(light.scoresByKind).map(([kind, value]) => ({
      kind: kind as ScoreKind,
      label: kind,
      value: value!,
      max: 100,
    }))
  }
  return fallback
}

/** Standalone single-page scan (not a deep corpus page row). */
function isStandaloneSingle(scan: ScanSummary): boolean {
  return scan.mode === 'single' && !scan.domainScanId
}

export async function resolveSingleScanDelta(
  scanId: string,
  previousId?: string | null,
): Promise<ScanRunDeltaResolveResult> {
  const current = await getScan(scanId)
  if (!current) return { ok: false, error: 'not_found' }
  if (!isStandaloneSingle(current)) return { ok: false, error: 'kind_mismatch' }

  const currentCand = scanCandidate(current)
  let previous: ScanSummary | null = null

  if (previousId) {
    previous = await getScan(previousId)
    if (!previous) return { ok: false, error: 'no_baseline' }
    if (!isStandaloneSingle(previous)) return { ok: false, error: 'kind_mismatch' }
    if (previous.projectId !== current.projectId) return { ok: false, error: 'kind_mismatch' }
    if (!urlSetsEqual(scanCandidate(previous).urlSet, currentCand.urlSet)) {
      return { ok: false, error: 'kind_mismatch' }
    }
  } else {
    const all = await listScans(current.projectId)
    const candidates = all.filter(isStandaloneSingle).map(scanCandidate)
    const baseline = findPreviousRunBaseline(candidates, currentCand)
    if (!baseline) return { ok: false, error: 'no_baseline' }
    previous = await getScan(baseline.id)
    if (!previous) return { ok: false, error: 'no_baseline' }
  }

  const [curIssues, prevIssues, curScores, prevScores] = await Promise.all([
    getScanIssues(current.id),
    getScanIssues(previous.id),
    getScanScores(current.id),
    getScanScores(previous.id),
  ])

  return {
    ok: true,
    delta: computeScanRunDelta({
      kind: 'single',
      currentId: current.id,
      previousId: previous.id,
      urlSet: currentCand.urlSet,
      currentFindings: issuesToFindingRefs(curIssues),
      previousFindings: issuesToFindingRefs(prevIssues),
      currentScores: scoreCardsToDeltaInput(curScores),
      previousScores: scoreCardsToDeltaInput(prevScores),
    }),
  }
}

export async function resolveDomainScanDelta(
  domainId: string,
  previousId?: string | null,
): Promise<ScanRunDeltaResolveResult> {
  const current = await getDomainScan(domainId)
  if (!current) return { ok: false, error: 'not_found' }

  const currentRoot = domainRootCandidate(current)
  let previous: DomainScanLight | null = null

  if (previousId) {
    previous = await getDomainScan(previousId)
    if (!previous) return { ok: false, error: 'no_baseline' }
    if (previous.projectId !== current.projectId) return { ok: false, error: 'kind_mismatch' }
    if (!urlSetsEqual(domainRootCandidate(previous).urlSet, currentRoot.urlSet)) {
      return { ok: false, error: 'kind_mismatch' }
    }
  } else {
    const all = await listDomainScans(current.projectId)
    const candidates = all.map(domainRootCandidate)
    const baseline = findPreviousRunBaseline(candidates, currentRoot)
    if (!baseline) return { ok: false, error: 'no_baseline' }
    previous = await getDomainScan(baseline.id)
    if (!previous) return { ok: false, error: 'no_baseline' }
  }

  const [curIssues, prevIssues, curOverview, prevOverview, curFallback, prevFallback] =
    await Promise.all([
      getScanIssues(current.id),
      getScanIssues(previous.id),
      getDomainOverview(current.id),
      getDomainOverview(previous.id),
      getScanScores(current.id),
      getScanScores(previous.id),
    ])

  const urlSet = await domainStoredUrlSet(current)

  return {
    ok: true,
    delta: computeScanRunDelta({
      kind: 'deep',
      currentId: current.id,
      previousId: previous.id,
      urlSet,
      currentFindings: issuesToFindingRefs(curIssues),
      previousFindings: issuesToFindingRefs(prevIssues),
      currentScores: scoreCardsToDeltaInput(
        scoresFromDomain(curOverview?.scores, current, curFallback),
      ),
      previousScores: scoreCardsToDeltaInput(
        scoresFromDomain(prevOverview?.scores, previous, prevFallback),
      ),
    }),
  }
}

export async function resolveGeoJobDelta(
  jobId: string,
  previousId?: string | null,
): Promise<ScanRunDeltaResolveResult> {
  const currentOverview = await getGeoOverview(jobId)
  if (!currentOverview) return { ok: false, error: 'not_found' }
  const current = currentOverview.job
  const measurement: GeoMeasurement = geoJobMeasurement(current)
  const currentCand = geoCandidate(current)

  let previousOverview = null as Awaited<ReturnType<typeof getGeoOverview>>

  if (previousId) {
    previousOverview = await getGeoOverview(previousId)
    if (!previousOverview) return { ok: false, error: 'no_baseline' }
    if (geoJobMeasurement(previousOverview.job) !== measurement) {
      return { ok: false, error: 'measurement_mismatch' }
    }
    if (previousOverview.job.projectId !== current.projectId) {
      return { ok: false, error: 'kind_mismatch' }
    }
    if (!urlSetsEqual(geoCandidate(previousOverview.job).urlSet, currentCand.urlSet)) {
      return { ok: false, error: 'kind_mismatch' }
    }
  } else {
    const all = await listGeoJobs()
    const candidates = all
      .filter((j) => j.projectId === current.projectId)
      .map(geoCandidate)
    const baseline = findPreviousRunBaseline(candidates, currentCand)
    if (!baseline) return { ok: false, error: 'no_baseline' }
    previousOverview = await getGeoOverview(baseline.id)
    if (!previousOverview) return { ok: false, error: 'no_baseline' }
  }

  const previous = previousOverview.job

  return {
    ok: true,
    delta: computeScanRunDelta({
      kind: 'geo',
      currentId: current.id,
      previousId: previous.id,
      urlSet: currentCand.urlSet,
      currentFindings: geoRecommendationsToFindingRefs(currentOverview.recommendations),
      previousFindings: geoRecommendationsToFindingRefs(previousOverview.recommendations),
      currentScores: geoScoresToDeltaInput({
        citedShare: current.citedShare,
        eeat: currentOverview.eeat,
      }),
      previousScores: geoScoresToDeltaInput({
        citedShare: previous.citedShare,
        eeat: previousOverview.eeat,
      }),
      measurement,
    }),
  }
}
