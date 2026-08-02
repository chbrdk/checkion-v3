import type {
  DomainOverview,
  DomainScanLight,
  DomainSystemicIssue,
  IssueSummary,
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

const TEMPLATE_SINGLE_SCAN_ID = 'scan-single-1'

let scans = [...SCAN_FIXTURES]
const issuesByScan: Record<string, IssueSummary[]> = Object.fromEntries(
  Object.entries(ISSUE_FIXTURES).map(([k, v]) => [k, [...v]]),
)
const scoresByScan: Record<string, ScoreCard[]> = Object.fromEntries(
  Object.entries(SCORE_FIXTURES).map(([k, v]) => [k, [...v]]),
)
let domainScans = [...DOMAIN_SCAN_FIXTURES]

export function listScans(projectId?: string): ScanSummary[] {
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

  const overview = getDomainOverview(parsed.domainId)
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

export function getScan(id: string): ScanSummary | null {
  return scans.find((s) => s.id === id) ?? resolveVirtualDomainPageScan(id)
}

export function getScanOverview(id: string): ScanOverview | null {
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

  const scan = getScan(id)
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

export function getScanIssues(id: string): IssueSummary[] {
  if (parseDomainPageScanId(id)) {
    return enrichIssueInspect(issuesByScan[TEMPLATE_SINGLE_SCAN_ID] ?? []).map((issue) => ({
      ...issue,
      scanId: id,
    }))
  }
  return enrichIssueInspect(issuesByScan[id] ?? [])
}

export function getScanScores(id: string): ScoreCard[] {
  const overview = getScanOverview(id)
  if (overview?.scores.length) return overview.scores
  if (parseDomainPageScanId(id)) return scoresByScan[TEMPLATE_SINGLE_SCAN_ID] ?? []
  return scoresByScan[id] ?? []
}

export function listDomainScans(projectId?: string): DomainScanLight[] {
  return projectId
    ? domainScans.filter((d) => d.projectId === projectId)
    : [...domainScans]
}

export function getDomainScan(id: string): DomainScanLight | null {
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

export function getDomainOverview(id: string): DomainOverview | null {
  if (id === 'domain-1') {
    return {
      ...LIVE_DOMAIN_OVERVIEW,
      scores: scoresByScan[id] ?? LIVE_DOMAIN_OVERVIEW.scores,
    }
  }

  const domain = getDomainScan(id)
  if (!domain) return null
  const issues = issuesByScan[id] ?? []

  return {
    scan: domain,
    scores: scoresByScan[id] ?? [],
    lede: `Deep domain crawl across ${domain.pageCount} pages (dummy corpus).`,
    systemicIssues: systemicFromIssues(issues),
  }
}

export function createScan(input: {
  projectId: string
  mode: 'single' | 'deep'
  url: string
}): ScanSummary {
  const id = `scan-${input.mode}-${Date.now()}`
  const synthesized = synthesizeCompletedScan({ ...input, id })
  scans = [synthesized.scan, ...scans]
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
        overallScore: synthesized.scan.overallScore,
        issueCount: synthesized.issues.length,
        startedAt: synthesized.scan.startedAt,
        completedAt: synthesized.scan.completedAt,
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

  return synthesized.scan
}

export function deleteScan(id: string): boolean {
  const before = scans.length
  scans = scans.filter((s) => s.id !== id)
  delete issuesByScan[id]
  delete scoresByScan[id]
  return scans.length < before
}

/** Move scans + domain crawls from one project to another (e.g. after delete). */
export function reassignProjectResources(
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

export function rerunScan(id: string): ScanSummary | null {
  const source = getScan(id)
  if (!source) return null
  return createScan({
    projectId: source.projectId,
    mode: source.mode,
    url: source.url,
  })
}
