import type {
  DomainOverview,
  DomainScanControlAction,
  DomainScanLight,
  DomainSystemicIssue,
  IssueSummary,
  ScanCorrelationInput,
  ScanOverview,
  ScanSummary,
  ScoreCard,
} from '@checkion-v3/contracts'
import {
  DOMAIN_SCAN_FIXTURES,
  ISSUE_FIXTURES,
  SCAN_FIXTURES,
  SCORE_FIXTURES,
  synthesizeCompletedScan,
} from './scans'
import { buildRichScanOverview, enrichIssueInspect } from './scan-overview-rich'
import { LIVE_DOMAIN_OVERVIEW } from './live-scan-domain-1'
import { normalizeUxReadability } from '../readability-cefr'
import {
  parseDomainPageScanId,
  parseDomainPageSampleScanId,
  synthesizeAffectedPageUrl,
  withPageSampleScanIds,
} from '../domain-issue-page-synth'
import {
  buildVirtualPageScanOverview,
  buildVirtualPageScanSummary,
  virtualPageTemplateIssues,
  virtualPageTemplateScores,
} from '../virtual-domain-page-scan'
import { isDatabaseConfigured } from '../db/config'
import { shouldRunLiveScans } from '../scan/live-scan-gate'
import { executeSingleLiveScan } from '../scan/pipeline'
import { startDomainScan } from '../scan/domain-scan-start'
import { withScanCorrelation } from '../scan-correlation'
import { selectTopIssueGroups } from '../issue-groups'
import { applyDomainScanControlAction, isActiveDomainScanStatus, readDomainScanControlState } from '../scan/domain-scan-control'

const TEMPLATE_SINGLE_SCAN_ID = 'scan-single-1'

/**
 * Next.js (webpack) can instantiate this module per route bundle.
 * Pin mutable memory state on globalThis so POST /api/scans and GET /api/scans/:id share data.
 */
type MemoryStore = {
  scans: ScanSummary[]
  issuesByScan: Record<string, IssueSummary[]>
  scoresByScan: Record<string, ScoreCard[]>
  overviewByScan: Record<string, ScanOverview>
  domainOverviewExtras: Record<string, Record<string, unknown>>
  domainScans: DomainScanLight[]
}

const globalForMemory = globalThis as typeof globalThis & {
  __checkionV3ScanMemory?: MemoryStore
}

function createMemoryStore(): MemoryStore {
  return {
    scans: [...SCAN_FIXTURES],
    issuesByScan: Object.fromEntries(Object.entries(ISSUE_FIXTURES).map(([k, v]) => [k, [...v]])),
    scoresByScan: Object.fromEntries(Object.entries(SCORE_FIXTURES).map(([k, v]) => [k, [...v]])),
    overviewByScan: {},
    domainOverviewExtras: {},
    domainScans: [...DOMAIN_SCAN_FIXTURES],
  }
}

const store = (globalForMemory.__checkionV3ScanMemory ??= createMemoryStore())
const issuesByScan = store.issuesByScan
const scoresByScan = store.scoresByScan
const overviewByScan = store.overviewByScan
const domainOverviewExtras = store.domainOverviewExtras

async function dbApi() {
  return import('../db/scans')
}

function memoryListScans(projectId?: string): ScanSummary[] {
  return projectId ? store.scans.filter((s) => s.projectId === projectId) : [...store.scans]
}

function resolveVirtualDomainPageScan(id: string): ScanSummary | null {
  const sampleParsed = parseDomainPageSampleScanId(id)
  if (sampleParsed) {
    const overview = memoryGetDomainOverview(sampleParsed.domainId)
    const page = overview?.pageSamples?.[sampleParsed.pageIndex]
    if (!page || !overview) return null
    return buildVirtualPageScanSummary({
      id,
      projectId: overview.scan.projectId,
      url: page.url,
      domainScanId: sampleParsed.domainId,
      overallScore: page.score,
      issueCount: page.errors ?? 0,
      startedAt: overview.scan.startedAt,
      completedAt: overview.scan.completedAt,
    })
  }

  const parsed = parseDomainPageScanId(id)
  if (!parsed) return null

  const domainIssues = issuesByScan[parsed.domainId] ?? []
  const issue = domainIssues.find((i) => i.id === parsed.issueId)
  if (!issue) return null

  const overview = memoryGetDomainOverview(parsed.domainId)
  const domain = memoryGetDomainScan(parsed.domainId)
  if (!domain) return null
  const rootUrl = overview?.scan.rootUrl ?? domain.rootUrl
  const seeds =
    issue.affectedPages?.length
      ? issue.affectedPages
      : (overview?.pageSamples ?? []).map((p) => p.url)
  const url = synthesizeAffectedPageUrl(rootUrl, parsed.issueId, parsed.pageIndex, seeds)

  return buildVirtualPageScanSummary({
    id,
    projectId: domain.projectId,
    url,
    domainScanId: parsed.domainId,
    overallScore: overview?.scan.overallScore ?? domain.overallScore,
    issueCount: issue.affectedCount,
    startedAt: domain.startedAt,
    completedAt: domain.completedAt,
  })
}

function memoryGetScan(id: string): ScanSummary | null {
  return store.scans.find((s) => s.id === id) ?? resolveVirtualDomainPageScan(id)
}

function memoryGetScanOverview(id: string): ScanOverview | null {
  const stored = overviewByScan[id]
  if (stored) {
    const scan = store.scans.find((s) => s.id === id) ?? null
    if (!scan) return null
    return {
      ...stored,
      scan,
      scores: scoresByScan[id] ?? stored.scores,
      topIssues: selectTopIssueGroups(enrichIssueInspect(issuesByScan[id] ?? stored.topIssues), 8),
      ux: stored.ux ? normalizeUxReadability(stored.ux) : stored.ux,
    }
  }

  const real = store.scans.find((s) => s.id === id)
  if (real) {
    const rich = buildRichScanOverview(id, real, scoresByScan[id], issuesByScan[id])
    if (!rich) return null
    return {
      ...rich,
      topIssues: enrichIssueInspect(rich.topIssues),
      ux: rich.ux ? normalizeUxReadability(rich.ux) : rich.ux,
    }
  }

  const virtualIssue = parseDomainPageScanId(id)
  const virtualSample = parseDomainPageSampleScanId(id)
  if (virtualIssue || virtualSample) {
    const scan = resolveVirtualDomainPageScan(id)
    if (!scan) return null
    return buildVirtualPageScanOverview(
      scan,
      scoresByScan[TEMPLATE_SINGLE_SCAN_ID],
      issuesByScan[TEMPLATE_SINGLE_SCAN_ID],
    )
  }

  return null
}

function memoryGetScanIssues(id: string): IssueSummary[] {
  if (store.scans.some((s) => s.id === id)) {
    return enrichIssueInspect(issuesByScan[id] ?? [])
  }
  if (parseDomainPageScanId(id) || parseDomainPageSampleScanId(id)) {
    return virtualPageTemplateIssues(issuesByScan[TEMPLATE_SINGLE_SCAN_ID]).map((issue) => ({
      ...issue,
      scanId: id,
    }))
  }
  return enrichIssueInspect(issuesByScan[id] ?? [])
}

function memoryGetScanScores(id: string): ScoreCard[] {
  const overview = memoryGetScanOverview(id)
  if (overview?.scores.length) return overview.scores
  if (parseDomainPageScanId(id) || parseDomainPageSampleScanId(id)) {
    return virtualPageTemplateScores(scoresByScan[TEMPLATE_SINGLE_SCAN_ID])
  }
  return scoresByScan[id] ?? []
}

function memoryListDomainScans(projectId?: string): DomainScanLight[] {
  return projectId
    ? store.domainScans.filter((d) => d.projectId === projectId)
    : [...store.domainScans]
}

function memoryGetDomainScan(id: string): DomainScanLight | null {
  return store.domainScans.find((d) => d.id === id) ?? null
}

function systemicFromIssues(issues: IssueSummary[]): DomainSystemicIssue[] {
  return issues.slice(0, 8).map((i) => ({
    id: i.ruleId,
    title: i.title,
    pageCount: i.affectedCount,
    severity: i.severity,
    ruleId: i.ruleId,
  }))
}

function memoryGetDomainOverview(id: string): DomainOverview | null {
  if (id === 'domain-1') {
    return {
      ...LIVE_DOMAIN_OVERVIEW,
      scores: scoresByScan[id] ?? LIVE_DOMAIN_OVERVIEW.scores,
      pageSamples: withPageSampleScanIds(id, LIVE_DOMAIN_OVERVIEW.pageSamples),
    }
  }

  const domain = memoryGetDomainScan(id)
  if (!domain) return null
  const issues = issuesByScan[id] ?? []
  const extras = domainOverviewExtras[id] ?? {}

  const overview: DomainOverview = {
    scan: domain,
    scores: scoresByScan[id] ?? [],
    lede:
      typeof extras.lede === 'string'
        ? extras.lede
        : `Deep scan across ${domain.pageCount} pages (dummy corpus).`,
    systemicIssues:
      (extras.systemicIssues as DomainSystemicIssue[] | undefined) ?? systemicFromIssues(issues),
    ...extras,
  }
  return {
    ...overview,
    pageSamples: withPageSampleScanIds(id, overview.pageSamples),
  }
}

function memoryCreateSynthesizedScan(input: {
  projectId: string
  mode: 'single' | 'deep'
  url: string
  correlation?: ScanCorrelationInput
}): ScanSummary {
  const id = `scan-${input.mode}-${Date.now()}`
  const synthesized = synthesizeCompletedScan({
    ...input,
    id,
    ...input.correlation,
  })
  const scan = withScanCorrelation(synthesized.scan, input.correlation)
  store.scans = [scan, ...store.scans]
  issuesByScan[id] = enrichIssueInspect(synthesized.issues)
  scoresByScan[id] = synthesized.scores

  if (input.mode === 'deep') {
    const domainId = `domain-${Date.now()}`
    store.domainScans = [
      {
        id: domainId,
        projectId: input.projectId,
        rootUrl: input.url,
        status: 'completed',
        pageCount: 12 + (input.url.length % 40),
        overallScore: scan.overallScore,
        issueCount: synthesized.issues.length,
        startedAt: scan.startedAt,
        completedAt: scan.completedAt,
      },
      ...store.domainScans,
    ]
    issuesByScan[domainId] = synthesized.issues.map((i, idx) => ({
      ...i,
      id: `${domainId}-i${idx}`,
      scanId: domainId,
    }))
    scoresByScan[domainId] = [...synthesized.scores]
  }

  return scan
}

async function memoryCreateLiveScan(input: {
  projectId: string
  mode: 'single' | 'deep'
  url: string
  waitForCompletion?: boolean
  correlation?: ScanCorrelationInput
}): Promise<ScanSummary> {
  const id = `scan-${input.mode}-${Date.now()}`
  const startedAt = new Date().toISOString()
  const queued: ScanSummary = withScanCorrelation(
    {
      id,
      projectId: input.projectId,
      mode: input.mode,
      url: input.url,
      status: 'queued',
      startedAt,
      completedAt: null,
      overallScore: null,
      issueCount: 0,
    },
    input.correlation,
  )
  store.scans = [queued, ...store.scans]
  issuesByScan[id] = []
  scoresByScan[id] = []

  if (input.mode === 'deep') {
    const domain = await memoryCreateDomainScan({
      projectId: input.projectId,
      url: input.url,
      waitForCompletion: input.waitForCompletion,
      linkScanId: id,
    })
    const queuedWithDomain = { ...queued, domainScanId: domain.id }
    store.scans = store.scans.map((s) => (s.id === id ? queuedWithDomain : s))
    return queuedWithDomain
  }

  const run = async () => {
    try {
      store.scans = store.scans.map((s) => (s.id === id ? { ...s, status: 'running' } : s))
      const bundle = await executeSingleLiveScan({
        id,
        projectId: input.projectId,
        url: input.url,
        mode: 'single',
      })
      const completed = withScanCorrelation(bundle.scan, input.correlation)
      store.scans = store.scans.map((s) => (s.id === id ? completed : s))
      issuesByScan[id] = enrichIssueInspect(bundle.issues)
      scoresByScan[id] = bundle.scores
      overviewByScan[id] = bundle.overview
    } catch (err) {
      const message = err instanceof Error ? err.message : 'scan_failed'
      const failedAt = new Date().toISOString()
      store.scans = store.scans.map((s) =>
        s.id === id ? { ...s, status: 'failed', completedAt: failedAt } : s,
      )
      console.error('[checkion-v3] memory single scan failed', id, message)
    }
  }

  if (input.waitForCompletion) {
    await run()
    return memoryGetScan(id) ?? queued
  }
  void run()
  return queued
}

async function memoryCreateDomainScan(input: {
  projectId: string
  url: string
  maxPages?: number
  useSitemap?: boolean
  waitForCompletion?: boolean
  skipUnchangedPages?: boolean
  linkScanId?: string
}): Promise<DomainScanLight> {
  if (!shouldRunLiveScans()) {
    const synth = memoryCreateSynthesizedScan({
      projectId: input.projectId,
      mode: 'deep',
      url: input.url,
    })
    return store.domainScans.find((d) => d.startedAt === synth.startedAt) ?? store.domainScans[0]!
  }

  const { domain } = await startDomainScan(
    {
      projectId: input.projectId,
      url: input.url,
      maxPages: input.maxPages,
      useSitemap: input.useSitemap,
      waitForCompletion: input.waitForCompletion,
      skipUnchangedPages: input.skipUnchangedPages,
    },
    {
      insertQueued: async (row) => {
        store.domainScans = [
          {
            id: row.id,
            projectId: row.projectId,
            rootUrl: row.rootUrl,
            status: 'queued',
            pageCount: 0,
            overallScore: null,
            issueCount: 0,
            startedAt: row.startedAt,
            completedAt: null,
            progress: { scanned: 0, total: row.maxPages },
          },
          ...store.domainScans,
        ]
        issuesByScan[row.id] = []
        scoresByScan[row.id] = []
      },
      markRunning: async (domainId) => {
        store.domainScans = store.domainScans.map((d) =>
          d.id === domainId ? { ...d, status: 'running' } : d,
        )
        if (input.linkScanId) {
          store.scans = store.scans.map((s) =>
            s.id === input.linkScanId ? { ...s, status: 'running' } : s,
          )
        }
      },
      beforeWorkerStart: async (domainId) => {
        const row = memoryGetDomainScan(domainId)
        if (!row) return false
        if (row.status === 'cancelling' || row.status === 'cancelled') {
          const cancelledAt = new Date().toISOString()
          store.domainScans = store.domainScans.map((d) =>
            d.id === domainId
              ? { ...d, status: 'cancelled', completedAt: cancelledAt, error: 'Cancelled by user' }
              : d,
          )
          return false
        }
        return true
      },
      isPaused: async (domainId) => memoryGetDomainScan(domainId)?.status === 'paused',
      getScanControl: async (domainId) => {
        const row = memoryGetDomainScan(domainId)
        if (!row) return 'cancel'
        return readDomainScanControlState(row.status)
      },
      updateProgress: async (domainId, scanned, total, currentUrl) => {
        store.domainScans = store.domainScans.map((d) =>
          d.id === domainId ? { ...d, pageCount: scanned, progress: { scanned, total, currentUrl } } : d,
        )
      },
      persistCompleted: async (bundle) => {
        store.domainScans = store.domainScans.map((d) => (d.id === bundle.domain.id ? bundle.domain : d))
        issuesByScan[bundle.domain.id] = enrichIssueInspect(bundle.issues)
        scoresByScan[bundle.domain.id] = bundle.scores
        domainOverviewExtras[bundle.domain.id] = bundle.overviewExtras
        for (const page of bundle.pageScans ?? []) {
          const scan = page.scan
          store.scans = [scan, ...store.scans.filter((s) => s.id !== scan.id)]
          issuesByScan[scan.id] = enrichIssueInspect(page.issues)
          scoresByScan[scan.id] = page.scores
          overviewByScan[scan.id] = page.overview
        }
        if (input.linkScanId) {
          store.scans = store.scans.map((s) =>
            s.id === input.linkScanId
              ? {
                  ...s,
                  status: 'completed',
                  completedAt: bundle.domain.completedAt,
                  overallScore: bundle.domain.overallScore,
                  issueCount: bundle.domain.issueCount,
                }
              : s,
          )
          issuesByScan[input.linkScanId] = enrichIssueInspect(bundle.issues)
          scoresByScan[input.linkScanId] = bundle.scores
        }
      },
      persistCancelled: async (bundle) => {
        const cancelled = { ...bundle.domain, status: 'cancelled' as const }
        store.domainScans = store.domainScans.map((d) => (d.id === cancelled.id ? cancelled : d))
        issuesByScan[cancelled.id] = enrichIssueInspect(bundle.issues)
        scoresByScan[cancelled.id] = bundle.scores
        domainOverviewExtras[cancelled.id] = bundle.overviewExtras
        for (const page of bundle.pageScans ?? []) {
          const scan = { ...page.scan, status: 'cancelled' as const }
          store.scans = [scan, ...store.scans.filter((s) => s.id !== scan.id)]
          issuesByScan[scan.id] = enrichIssueInspect(page.issues)
          scoresByScan[scan.id] = page.scores
          overviewByScan[scan.id] = page.overview
        }
        if (input.linkScanId) {
          store.scans = store.scans.map((s) =>
            s.id === input.linkScanId
              ? {
                  ...s,
                  status: 'cancelled',
                  completedAt: cancelled.completedAt,
                  overallScore: cancelled.overallScore,
                  issueCount: cancelled.issueCount,
                }
              : s,
          )
        }
      },
      persistFailed: async (domainId) => {
        const failedAt = new Date().toISOString()
        store.domainScans = store.domainScans.map((d) =>
          d.id === domainId ? { ...d, status: 'failed', completedAt: failedAt } : d,
        )
        if (input.linkScanId) {
          store.scans = store.scans.map((s) =>
            s.id === input.linkScanId
              ? { ...s, status: 'failed', completedAt: failedAt }
              : s,
          )
        }
      },
    },
  )
  return memoryGetDomainScan(domain.id) ?? domain
}

function memoryCreateScan(input: {
  projectId: string
  mode: 'single' | 'deep'
  url: string
  correlation?: ScanCorrelationInput
}): ScanSummary {
  return memoryCreateSynthesizedScan(input)
}

function memoryDeleteScan(id: string): boolean {
  const before = store.scans.length
  store.scans = store.scans.filter((s) => s.id !== id)
  delete issuesByScan[id]
  delete scoresByScan[id]
  return store.scans.length < before
}

function memoryReassignProjectResources(
  fromProjectId: string,
  toProjectId: string,
): { scanCount: number; recentScanIds: string[]; lastScanAt: string | null } {
  const movedScans = store.scans.filter((s) => s.projectId === fromProjectId)
  store.scans = store.scans.map((s) =>
    s.projectId === fromProjectId ? { ...s, projectId: toProjectId } : s,
  )
  store.domainScans = store.domainScans.map((d) =>
    d.projectId === fromProjectId ? { ...d, projectId: toProjectId } : d,
  )

  const lastScanAt =
    movedScans
      .map((s) => s.completedAt ?? s.startedAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null

  return {
    scanCount: movedScans.length,
    recentScanIds: movedScans.map((s) => s.id).slice(0, 10),
    lastScanAt,
  }
}

export async function listScans(projectId?: string): Promise<ScanSummary[]> {
  if (isDatabaseConfigured()) return (await dbApi()).dbListScans(projectId)
  return memoryListScans(projectId)
}

export async function listDomainCorpusPageScans(domainId: string): Promise<ScanSummary[]> {
  if (isDatabaseConfigured()) return (await dbApi()).dbListDomainCorpusPageScans(domainId)
  return store.scans.filter((s) => s.domainScanId === domainId && s.mode === 'single')
}

export async function getScan(id: string): Promise<ScanSummary | null> {
  if (isDatabaseConfigured()) return (await dbApi()).dbGetScan(id)
  return memoryGetScan(id)
}

export async function getScanOverview(id: string): Promise<ScanOverview | null> {
  if (isDatabaseConfigured()) return (await dbApi()).dbGetScanOverview(id)
  return memoryGetScanOverview(id)
}

export async function getScanIssues(id: string): Promise<IssueSummary[]> {
  if (isDatabaseConfigured()) return (await dbApi()).dbGetScanIssues(id)
  return memoryGetScanIssues(id)
}

export async function getScanScores(id: string): Promise<ScoreCard[]> {
  if (isDatabaseConfigured()) return (await dbApi()).dbGetScanScores(id)
  return memoryGetScanScores(id)
}

export async function listDomainScans(projectId?: string): Promise<DomainScanLight[]> {
  if (isDatabaseConfigured()) return (await dbApi()).dbListDomainScans(projectId)
  return memoryListDomainScans(projectId)
}

export async function getDomainScan(id: string): Promise<DomainScanLight | null> {
  if (isDatabaseConfigured()) return (await dbApi()).dbGetDomainScan(id)
  return memoryGetDomainScan(id)
}

export async function getDomainOverview(id: string): Promise<DomainOverview | null> {
  if (isDatabaseConfigured()) return (await dbApi()).dbGetDomainOverview(id)
  return memoryGetDomainOverview(id)
}

export async function createScan(input: {
  projectId: string
  mode: 'single' | 'deep'
  url: string
  waitForCompletion?: boolean
  correlation?: ScanCorrelationInput
}): Promise<ScanSummary> {
  if (isDatabaseConfigured()) {
    return (await dbApi()).dbCreateScan(input)
  }
  if (shouldRunLiveScans()) {
    return memoryCreateLiveScan(input)
  }
  return memoryCreateScan(input)
}

export async function createDomainScan(input: {
  projectId: string
  url: string
  maxPages?: number
  useSitemap?: boolean
  waitForCompletion?: boolean
  skipUnchangedPages?: boolean
}): Promise<DomainScanLight> {
  if (isDatabaseConfigured()) {
    return (await dbApi()).dbCreateDomainScan(input)
  }
  return memoryCreateDomainScan(input)
}

export async function deleteScan(id: string): Promise<boolean> {
  if (isDatabaseConfigured()) return (await dbApi()).dbDeleteScan(id)
  return memoryDeleteScan(id)
}

/** Move scans + domain crawls from one project to another (e.g. after delete). */
export async function reassignProjectResources(
  fromProjectId: string,
  toProjectId: string,
): Promise<{ scanCount: number; recentScanIds: string[]; lastScanAt: string | null }> {
  if (isDatabaseConfigured()) {
    return (await dbApi()).dbReassignProjectResources(fromProjectId, toProjectId)
  }
  return memoryReassignProjectResources(fromProjectId, toProjectId)
}

export async function rerunScan(id: string): Promise<ScanSummary | null> {
  if (isDatabaseConfigured()) return (await dbApi()).dbRerunScan(id)
  const source = memoryGetScan(id)
  if (!source) return null
  return memoryCreateScan({
    projectId: source.projectId,
    mode: source.mode,
    url: source.url,
  })
}

export async function controlDomainScan(
  id: string,
  action: DomainScanControlAction,
): Promise<{ status: DomainScanLight['status']; message?: string } | null> {
  if (isDatabaseConfigured()) return (await dbApi()).dbControlDomainScan(id, action)

  const current = memoryGetDomainScan(id)
  if (!current) return null
  const result = applyDomainScanControlAction(current.status, action)
  if (!result.ok) throw new Error(result.error)

  store.domainScans = store.domainScans.map((row) =>
    row.id === id
      ? {
          ...row,
          status: result.status,
          completedAt:
            result.status === 'cancelled'
              ? new Date().toISOString()
              : result.status === 'paused'
                ? null
                : row.completedAt,
          error: result.status === 'cancelled' ? 'Cancelled by user' : row.error,
        }
      : row,
  )
  return { status: result.status, message: result.message }
}

export async function listActiveDomainScans(projectId: string): Promise<DomainScanLight[]> {
  if (isDatabaseConfigured()) return (await dbApi()).dbListActiveDomainScans(projectId)
  return memoryListDomainScans(projectId).filter((row) => isActiveDomainScanStatus(row.status))
}
