import type {
  DomainOverview,
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
  synthesizeAffectedPageUrl,
} from '../domain-issue-page-synth'
import { isDatabaseConfigured } from '../db/config'
import { shouldRunLiveScans } from '../scan/live-scan-gate'
import { executeSingleLiveScan } from '../scan/pipeline'
import { startDomainScan } from '../scan/domain-scan-start'
import { withScanCorrelation } from '../scan-correlation'

const TEMPLATE_SINGLE_SCAN_ID = 'scan-single-1'

let scans = [...SCAN_FIXTURES]
const issuesByScan: Record<string, IssueSummary[]> = Object.fromEntries(
  Object.entries(ISSUE_FIXTURES).map(([k, v]) => [k, [...v]]),
)
const scoresByScan: Record<string, ScoreCard[]> = Object.fromEntries(
  Object.entries(SCORE_FIXTURES).map(([k, v]) => [k, [...v]]),
)
const overviewByScan: Record<string, ScanOverview> = {}
const domainOverviewExtras: Record<string, Record<string, unknown>> = {}
let domainScans = [...DOMAIN_SCAN_FIXTURES]

async function dbApi() {
  return import('../db/scans')
}

function memoryListScans(projectId?: string): ScanSummary[] {
  return projectId ? scans.filter((s) => s.projectId === projectId) : [...scans]
}

function resolveVirtualDomainPageScan(id: string): ScanSummary | null {
  const parsed = parseDomainPageScanId(id)
  if (!parsed) return null

  const template = scans.find((s) => s.id === TEMPLATE_SINGLE_SCAN_ID)
  if (!template) return null

  const domainIssues = issuesByScan[parsed.domainId] ?? []
  const issue = domainIssues.find((i) => i.id === parsed.issueId)
  if (!issue) return null

  const overview = memoryGetDomainOverview(parsed.domainId)
  const rootUrl = overview?.scan.rootUrl ?? template.url
  const seeds =
    issue.affectedPages?.length
      ? issue.affectedPages
      : (overview?.pageSamples ?? []).map((p) => p.url)
  const url = synthesizeAffectedPageUrl(rootUrl, parsed.issueId, parsed.pageIndex, seeds)

  return {
    ...template,
    id,
    mode: 'single',
    url,
  }
}

function memoryGetScan(id: string): ScanSummary | null {
  return scans.find((s) => s.id === id) ?? resolveVirtualDomainPageScan(id)
}

function memoryGetScanOverview(id: string): ScanOverview | null {
  const virtual = parseDomainPageScanId(id)
  if (virtual) {
    const scan = resolveVirtualDomainPageScan(id)
    if (!scan) return null
    const rich = buildRichScanOverview(
      TEMPLATE_SINGLE_SCAN_ID,
      null,
      scoresByScan[TEMPLATE_SINGLE_SCAN_ID],
      issuesByScan[TEMPLATE_SINGLE_SCAN_ID],
    )
    if (!rich) return null
    return {
      ...rich,
      scan,
      topIssues: enrichIssueInspect(rich.topIssues).map((issue) => ({
        ...issue,
        scanId: id,
      })),
      ux: rich.ux ? normalizeUxReadability(rich.ux) : rich.ux,
    }
  }

  const stored = overviewByScan[id]
  if (stored) {
    const scan = memoryGetScan(id)
    if (!scan) return null
    return {
      ...stored,
      scan,
      scores: scoresByScan[id] ?? stored.scores,
      topIssues: enrichIssueInspect(issuesByScan[id] ?? stored.topIssues).slice(0, 8),
      ux: stored.ux ? normalizeUxReadability(stored.ux) : stored.ux,
    }
  }

  const scan = memoryGetScan(id)
  const rich = buildRichScanOverview(
    id,
    scan,
    scoresByScan[id],
    issuesByScan[id],
  )
  if (!rich) return null
  return {
    ...rich,
    topIssues: enrichIssueInspect(rich.topIssues),
    ux: rich.ux ? normalizeUxReadability(rich.ux) : rich.ux,
  }
}

function memoryGetScanIssues(id: string): IssueSummary[] {
  if (parseDomainPageScanId(id)) {
    return enrichIssueInspect(issuesByScan[TEMPLATE_SINGLE_SCAN_ID] ?? []).map((issue) => ({
      ...issue,
      scanId: id,
    }))
  }
  return enrichIssueInspect(issuesByScan[id] ?? [])
}

function memoryGetScanScores(id: string): ScoreCard[] {
  const overview = memoryGetScanOverview(id)
  if (overview?.scores.length) return overview.scores
  if (parseDomainPageScanId(id)) return scoresByScan[TEMPLATE_SINGLE_SCAN_ID] ?? []
  return scoresByScan[id] ?? []
}

function memoryListDomainScans(projectId?: string): DomainScanLight[] {
  return projectId
    ? domainScans.filter((d) => d.projectId === projectId)
    : [...domainScans]
}

function memoryGetDomainScan(id: string): DomainScanLight | null {
  return domainScans.find((d) => d.id === id) ?? null
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
    }
  }

  const domain = memoryGetDomainScan(id)
  if (!domain) return null
  const issues = issuesByScan[id] ?? []
  const extras = domainOverviewExtras[id] ?? {}

  return {
    scan: domain,
    scores: scoresByScan[id] ?? [],
    lede:
      typeof extras.lede === 'string'
        ? extras.lede
        : `Deep domain crawl across ${domain.pageCount} pages (dummy corpus).`,
    systemicIssues:
      (extras.systemicIssues as DomainSystemicIssue[] | undefined) ?? systemicFromIssues(issues),
    ...extras,
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
  scans = [scan, ...scans]
  issuesByScan[id] = enrichIssueInspect(synthesized.issues)
  scoresByScan[id] = synthesized.scores

  if (input.mode === 'deep') {
    const domainId = `domain-${Date.now()}`
    domainScans = [
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
      ...domainScans,
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
  scans = [queued, ...scans]
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
    scans = scans.map((s) => (s.id === id ? queuedWithDomain : s))
    return queuedWithDomain
  }

  const run = async () => {
    try {
      scans = scans.map((s) => (s.id === id ? { ...s, status: 'running' } : s))
      const bundle = await executeSingleLiveScan({
        id,
        projectId: input.projectId,
        url: input.url,
        mode: 'single',
      })
      const completed = withScanCorrelation(bundle.scan, input.correlation)
      scans = scans.map((s) => (s.id === id ? completed : s))
      issuesByScan[id] = enrichIssueInspect(bundle.issues)
      scoresByScan[id] = bundle.scores
      overviewByScan[id] = bundle.overview
    } catch (err) {
      const message = err instanceof Error ? err.message : 'scan_failed'
      const failedAt = new Date().toISOString()
      scans = scans.map((s) =>
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
  linkScanId?: string
}): Promise<DomainScanLight> {
  if (!shouldRunLiveScans()) {
    const synth = memoryCreateSynthesizedScan({
      projectId: input.projectId,
      mode: 'deep',
      url: input.url,
    })
    return domainScans.find((d) => d.startedAt === synth.startedAt) ?? domainScans[0]!
  }

  const { domain } = await startDomainScan(
    {
      projectId: input.projectId,
      url: input.url,
      maxPages: input.maxPages,
      useSitemap: input.useSitemap,
      waitForCompletion: input.waitForCompletion,
    },
    {
      insertQueued: async (row) => {
        domainScans = [
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
          ...domainScans,
        ]
        issuesByScan[row.id] = []
        scoresByScan[row.id] = []
      },
      markRunning: async (domainId) => {
        domainScans = domainScans.map((d) =>
          d.id === domainId ? { ...d, status: 'running' } : d,
        )
        if (input.linkScanId) {
          scans = scans.map((s) =>
            s.id === input.linkScanId ? { ...s, status: 'running' } : s,
          )
        }
      },
      updateProgress: async (domainId, scanned, total, currentUrl) => {
        domainScans = domainScans.map((d) =>
          d.id === domainId ? { ...d, pageCount: scanned, progress: { scanned, total, currentUrl } } : d,
        )
      },
      persistCompleted: async (bundle) => {
        domainScans = domainScans.map((d) => (d.id === bundle.domain.id ? bundle.domain : d))
        issuesByScan[bundle.domain.id] = enrichIssueInspect(bundle.issues)
        scoresByScan[bundle.domain.id] = bundle.scores
        domainOverviewExtras[bundle.domain.id] = bundle.overviewExtras
        if (input.linkScanId) {
          scans = scans.map((s) =>
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
      persistFailed: async (domainId) => {
        const failedAt = new Date().toISOString()
        domainScans = domainScans.map((d) =>
          d.id === domainId ? { ...d, status: 'failed', completedAt: failedAt } : d,
        )
        if (input.linkScanId) {
          scans = scans.map((s) =>
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
  const before = scans.length
  scans = scans.filter((s) => s.id !== id)
  delete issuesByScan[id]
  delete scoresByScan[id]
  return scans.length < before
}

function memoryReassignProjectResources(
  fromProjectId: string,
  toProjectId: string,
): { scanCount: number; recentScanIds: string[]; lastScanAt: string | null } {
  const movedScans = scans.filter((s) => s.projectId === fromProjectId)
  scans = scans.map((s) =>
    s.projectId === fromProjectId ? { ...s, projectId: toProjectId } : s,
  )
  domainScans = domainScans.map((d) =>
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
