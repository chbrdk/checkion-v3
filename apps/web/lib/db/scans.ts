import { desc, eq } from 'drizzle-orm'
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
import { getDb } from './client'
import { domainScans, scans, type DomainScanRow, type ScanRow } from './schema'
import { synthesizeCompletedScan } from '../fixtures/scans'
import { buildRichScanOverview, enrichIssueInspect } from '../fixtures/scan-overview-rich'
import { LIVE_DOMAIN_OVERVIEW } from '../fixtures/live-scan-domain-1'
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
import { shouldRunLiveScans } from '../scan/live-scan-gate'
import { executeSingleLiveScan } from '../scan/pipeline'
import { startDomainScan } from '../scan/domain-scan-start'
import { withScanCorrelation } from '../scan-correlation'
import { selectTopIssueGroups } from '../issue-groups'
import { applyDomainScanControlAction, isActiveDomainScanStatus } from '../scan/domain-scan-control'
import { createLiveDomainScanHooks } from '../scan/live-domain-scan-hooks'

const TEMPLATE_SINGLE_SCAN_ID = 'scan-single-1'
const WORKER_SESSION_ID = crypto.randomUUID()
const STALE_JOB_GRACE_MS = 45_000
let lastRecoverySweepAt = 0

function isActiveSingleScanStatus(status: string | null | undefined): status is 'queued' | 'running' {
  return status === 'queued' || status === 'running'
}

function isStaleSweepDomainStatus(status: string | null | undefined): boolean {
  return status === 'queued' || status === 'running' || status === 'cancelling'
}

function isStaleForCurrentWorker(
  updatedAt: Date | string | null | undefined,
  workerSessionId: string | undefined,
): boolean {
  const updatedMs =
    updatedAt instanceof Date
      ? updatedAt.getTime()
      : typeof updatedAt === 'string'
        ? Date.parse(updatedAt)
        : NaN
  if (!Number.isFinite(updatedMs)) return true
  if (Date.now() - updatedMs < STALE_JOB_GRACE_MS) return false
  return workerSessionId !== WORKER_SESSION_ID
}

async function recoverStaleBackgroundScans(): Promise<void> {
  const now = Date.now()
  if (now - lastRecoverySweepAt < 15_000) return
  lastRecoverySweepAt = now

  const db = getDb()
  const activeDomainRows = await db.select().from(domainScans)
  const activeScanRows = await db.select().from(scans)
  const staleDomainRows = activeDomainRows.filter(
    (row) =>
      isStaleSweepDomainStatus(row.status) &&
      isStaleForCurrentWorker(row.updatedAt, row.payload?.runtime?.workerSessionId),
  )
  const staleDeepScanRows = activeScanRows.filter(
    (row) =>
      row.mode === 'deep' &&
      isActiveSingleScanStatus(row.status) &&
      isStaleForCurrentWorker(row.updatedAt, row.payload?.runtime?.workerSessionId),
  )
  if (staleDomainRows.length === 0 && staleDeepScanRows.length === 0) return

  const interruptedAt = new Date().toISOString()
  const interruptionMessage = 'Scan interrupted by app restart before completion'

  for (const row of staleDomainRows) {
    await db
      .update(domainScans)
      .set({
        status: 'failed',
        completedAt: interruptedAt,
        payload: {
          ...(row.payload ?? {}),
          error: interruptionMessage,
        },
        updatedAt: new Date(),
      })
      .where(eq(domainScans.id, row.id))

    const linkedScan = activeScanRows.find(
      (scanRow) =>
        scanRow.mode === 'deep' &&
        isActiveSingleScanStatus(scanRow.status) &&
        scanRow.payload?.scan?.domainScanId === row.id,
    )
    if (!linkedScan) continue
    await db
      .update(scans)
      .set({
        status: 'failed',
        completedAt: interruptedAt,
        payload: {
          ...(linkedScan.payload ?? {}),
          scan: {
            ...(linkedScan.payload?.scan ?? {}),
            status: 'failed',
            completedAt: interruptedAt,
          },
          error: interruptionMessage,
        },
        updatedAt: new Date(),
      })
      .where(eq(scans.id, linkedScan.id))
  }

  for (const row of staleDeepScanRows) {
    await db
      .update(scans)
      .set({
        status: 'failed',
        completedAt: interruptedAt,
        payload: {
          ...(row.payload ?? {}),
          scan: {
            ...(row.payload?.scan ?? {}),
            status: 'failed',
            completedAt: interruptedAt,
          },
          error: interruptionMessage,
        },
        updatedAt: new Date(),
      })
      .where(eq(scans.id, row.id))
  }
}

function rowToScan(row: ScanRow): ScanSummary {
  const extra = row.payload?.scan ?? {}
  return {
    ...extra,
    id: row.id,
    projectId: row.projectId,
    mode: row.mode as ScanSummary['mode'],
    url: row.url,
    domainScanId:
      typeof extra.domainScanId === 'string' && extra.domainScanId.trim()
        ? extra.domainScanId
        : undefined,
    status: row.status as ScanSummary['status'],
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    overallScore: row.overallScore,
    issueCount: row.issueCount,
    error: row.payload?.error,
  }
}

function rowToDomain(row: DomainScanRow): DomainScanLight {
  return {
    ...(row.payload?.domain ?? {}),
    id: row.id,
    projectId: row.projectId,
    rootUrl: row.rootUrl,
    status: row.status as DomainScanLight['status'],
    pageCount: row.pageCount,
    overallScore: row.overallScore,
    issueCount: row.issueCount,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    error: row.payload?.error,
    progress: row.payload?.progress,
  }
}

export async function dbListScans(projectId?: string): Promise<ScanSummary[]> {
  await recoverStaleBackgroundScans()
  const db = getDb()
  const rows = projectId
    ? await db
        .select()
        .from(scans)
        .where(eq(scans.projectId, projectId))
        .orderBy(desc(scans.createdAt))
    : await db.select().from(scans).orderBy(desc(scans.createdAt))
  return rows.map(rowToScan)
}

async function dbGetScanRow(id: string): Promise<ScanRow | null> {
  await recoverStaleBackgroundScans()
  const db = getDb()
  const rows = await db.select().from(scans).where(eq(scans.id, id)).limit(1)
  return rows[0] ?? null
}

export async function dbGetScan(id: string): Promise<ScanSummary | null> {
  const row = await dbGetScanRow(id)
  if (row) return rowToScan(row)
  return resolveVirtualDomainPageScan(id)
}

async function resolveVirtualDomainPageScan(id: string): Promise<ScanSummary | null> {
  const sampleParsed = parseDomainPageSampleScanId(id)
  if (sampleParsed) {
    const overview = await dbGetDomainOverview(sampleParsed.domainId)
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
  const domainRow = await dbGetDomainScanRow(parsed.domainId)
  if (!domainRow) return null
  const domain = rowToDomain(domainRow)
  const issues = domainRow.payload?.issues ?? []
  const issue = issues.find((i) => i.id === parsed.issueId)
  if (!issue) return null
  const overview = await dbGetDomainOverview(parsed.domainId)
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

export async function dbGetScanIssues(id: string): Promise<IssueSummary[]> {
  const row = await dbGetScanRow(id)
  if (row) return enrichIssueInspect(row.payload?.issues ?? [])
  if (parseDomainPageScanId(id) || parseDomainPageSampleScanId(id)) {
    const template = await dbGetScanRow(TEMPLATE_SINGLE_SCAN_ID)
    return virtualPageTemplateIssues(template?.payload?.issues).map((issue) => ({
      ...issue,
      scanId: id,
    }))
  }
  const domain = await dbGetDomainScanRow(id)
  return enrichIssueInspect(domain?.payload?.issues ?? [])
}

export async function dbGetScanScores(id: string): Promise<ScoreCard[]> {
  const overview = await dbGetScanOverview(id)
  if (overview?.scores.length) return overview.scores
  const row = await dbGetScanRow(id)
  if (row) return row.payload?.scores ?? []
  if (parseDomainPageScanId(id) || parseDomainPageSampleScanId(id)) {
    const template = await dbGetScanRow(TEMPLATE_SINGLE_SCAN_ID)
    return virtualPageTemplateScores(template?.payload?.scores)
  }
  return []
}

export async function dbGetScanOverview(id: string): Promise<ScanOverview | null> {
  const row = await dbGetScanRow(id)
  if (row) {
    const scan = rowToScan(row)

    if (row.payload?.overview && typeof row.payload.overview === 'object') {
      const stored = row.payload.overview
      return {
        ...stored,
        scan,
        scores: row.payload.scores ?? stored.scores ?? [],
        topIssues: selectTopIssueGroups(
          enrichIssueInspect(row.payload.issues ?? stored.topIssues ?? []),
          8,
        ),
        ux: stored.ux ? normalizeUxReadability(stored.ux) : stored.ux,
      }
    }

    const rich = buildRichScanOverview(
      id,
      scan,
      row.payload?.scores,
      row.payload?.issues,
    )
    if (!rich) return null
    return {
      ...rich,
      topIssues: enrichIssueInspect(rich.topIssues),
      ux: rich.ux ? normalizeUxReadability(rich.ux) : rich.ux,
    }
  }

  const virtual = parseDomainPageScanId(id) || parseDomainPageSampleScanId(id)
  if (virtual) {
    const scan = await resolveVirtualDomainPageScan(id)
    if (!scan) return null
    const template = await dbGetScanRow(TEMPLATE_SINGLE_SCAN_ID)
    return buildVirtualPageScanOverview(
      scan,
      template?.payload?.scores,
      template?.payload?.issues,
    )
  }

  return null
}

export async function dbListDomainScans(projectId?: string): Promise<DomainScanLight[]> {
  await recoverStaleBackgroundScans()
  const db = getDb()
  const rows = projectId
    ? await db
        .select()
        .from(domainScans)
        .where(eq(domainScans.projectId, projectId))
        .orderBy(desc(domainScans.createdAt))
    : await db.select().from(domainScans).orderBy(desc(domainScans.createdAt))
  return rows.map(rowToDomain)
}

async function dbGetDomainScanRow(id: string): Promise<DomainScanRow | null> {
  await recoverStaleBackgroundScans()
  const db = getDb()
  const rows = await db.select().from(domainScans).where(eq(domainScans.id, id)).limit(1)
  return rows[0] ?? null
}

export async function dbListDomainCorpusPageScans(domainId: string): Promise<ScanSummary[]> {
  const domain = await dbGetDomainScan(domainId)
  if (!domain) return []
  const rows = await dbListScans(domain.projectId)
  return rows.filter((s) => s.domainScanId === domainId && s.mode === 'single')
}

export async function dbGetDomainScan(id: string): Promise<DomainScanLight | null> {
  const row = await dbGetDomainScanRow(id)
  return row ? rowToDomain(row) : null
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

export async function dbGetDomainOverview(id: string): Promise<DomainOverview | null> {
  if (id === 'domain-1') {
    const row = await dbGetDomainScanRow(id)
    return {
      ...LIVE_DOMAIN_OVERVIEW,
      scores: row?.payload?.scores ?? LIVE_DOMAIN_OVERVIEW.scores,
      pageSamples: withPageSampleScanIds(id, LIVE_DOMAIN_OVERVIEW.pageSamples),
    }
  }

  const row = await dbGetDomainScanRow(id)
  if (!row) return null
  const domain = rowToDomain(row)
  const issues = row.payload?.issues ?? []
  const extras = row.payload?.overviewExtras ?? {}
  const overview: DomainOverview = {
    scan: domain,
    scores: row.payload?.scores ?? [],
    lede:
      typeof extras.lede === 'string'
        ? extras.lede
        : `Deep scan across ${domain.pageCount} pages.`,
    systemicIssues:
      (extras.systemicIssues as DomainSystemicIssue[] | undefined) ?? systemicFromIssues(issues),
    ...extras,
  }
  return {
    ...overview,
    pageSamples: withPageSampleScanIds(id, overview.pageSamples),
  }
}

export async function dbCreateScan(input: {
  projectId: string
  mode: 'single' | 'deep'
  url: string
  /** Await live crawl before returning (tests). */
  waitForCompletion?: boolean
  correlation?: ScanCorrelationInput
}): Promise<ScanSummary> {
  if (!shouldRunLiveScans()) {
    return dbCreateSynthesizedScan(input)
  }
  return dbCreateLiveScan(input)
}

async function dbCreateSynthesizedScan(input: {
  projectId: string
  mode: 'single' | 'deep'
  url: string
  correlation?: ScanCorrelationInput
}): Promise<ScanSummary> {
  const id = `scan-${input.mode}-${Date.now()}`
  const synthesized = synthesizeCompletedScan({
    ...input,
    id,
    ...input.correlation,
  })
  const scan = withScanCorrelation(synthesized.scan, input.correlation)
  const now = new Date()
  const db = getDb()
  await db.insert(scans).values({
    id,
    projectId: input.projectId,
    mode: scan.mode,
    url: scan.url,
    status: scan.status,
    startedAt: scan.startedAt,
    completedAt: scan.completedAt,
    overallScore: scan.overallScore,
    issueCount: scan.issueCount,
    payload: {
      scan,
      issues: enrichIssueInspect(synthesized.issues),
      scores: synthesized.scores,
      runtime: { workerSessionId: WORKER_SESSION_ID },
    },
    updatedAt: now,
    createdAt: now,
  })

  if (input.mode === 'deep') {
    const domainId = `domain-${Date.now()}`
    await db.insert(domainScans).values({
      id: domainId,
      projectId: input.projectId,
      rootUrl: input.url,
      status: 'completed',
      pageCount: 12 + (input.url.length % 40),
      overallScore: scan.overallScore,
      issueCount: synthesized.issues.length,
      startedAt: scan.startedAt,
      completedAt: scan.completedAt,
      payload: {
        issues: synthesized.issues.map((i, idx) => ({
          ...i,
          id: `${domainId}-i${idx}`,
          scanId: domainId,
        })),
        scores: [...synthesized.scores],
      },
      updatedAt: now,
      createdAt: now,
    })
  }

  return scan
}

async function dbCreateLiveScan(input: {
  projectId: string
  mode: 'single' | 'deep'
  url: string
  waitForCompletion?: boolean
  correlation?: ScanCorrelationInput
}): Promise<ScanSummary> {
  const id = `scan-${input.mode}-${Date.now()}`
  const startedAt = new Date().toISOString()
  const now = new Date()
  const db = getDb()

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

  await db.insert(scans).values({
    id,
    projectId: input.projectId,
    mode: input.mode,
    url: input.url,
    status: 'queued',
    startedAt,
    completedAt: null,
    overallScore: null,
    issueCount: 0,
    payload: {
      scan: queued,
      runtime: { workerSessionId: WORKER_SESSION_ID },
    },
    updatedAt: now,
    createdAt: now,
  })

  if (input.mode === 'deep') {
    const { domain } = await startDomainScan(
      {
        projectId: input.projectId,
        url: input.url,
        waitForCompletion: input.waitForCompletion,
      },
      createLiveDomainScanHooks({
        workerSessionId: WORKER_SESSION_ID,
        getDomainRow: dbGetDomainScanRow,
        linkScan: {
          id,
          projectId: input.projectId,
          url: input.url,
          startedAt,
        },
      }),
    )
    const queuedWithDomain = { ...queued, domainScanId: domain.id }
    await db
      .update(scans)
      .set({
        payload: {
          scan: queuedWithDomain,
          runtime: { workerSessionId: WORKER_SESSION_ID },
        },
        updatedAt: new Date(),
      })
      .where(eq(scans.id, id))
    return queuedWithDomain
  }

  const runSingle = async () => {
    try {
      await db
        .update(scans)
        .set({
          status: 'running',
          payload: {
            scan: { ...queued, status: 'running' },
            runtime: { workerSessionId: WORKER_SESSION_ID },
          },
          updatedAt: new Date(),
        })
        .where(eq(scans.id, id))
      const bundle = await executeSingleLiveScan({
        id,
        projectId: input.projectId,
        url: input.url,
        mode: 'single',
      })
      const completed = withScanCorrelation(bundle.scan, input.correlation)
      await db
        .update(scans)
        .set({
          status: completed.status,
          completedAt: completed.completedAt,
          overallScore: completed.overallScore,
          issueCount: completed.issueCount,
          payload: {
            scan: completed,
            issues: enrichIssueInspect(bundle.issues),
            scores: bundle.scores,
            overview: bundle.overview,
            runtime: { workerSessionId: WORKER_SESSION_ID },
          },
          updatedAt: new Date(),
        })
        .where(eq(scans.id, id))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'scan_failed'
      console.error('[checkion-v3] single scan failed', id, message)
      const failedAt = new Date().toISOString()
      await db
        .update(scans)
        .set({
          status: 'failed',
          completedAt: failedAt,
          payload: {
            scan: { ...queued, status: 'failed', completedAt: failedAt },
            runtime: { workerSessionId: WORKER_SESSION_ID },
            error: message,
          },
          updatedAt: new Date(),
        })
        .where(eq(scans.id, id))
    }
  }

  if (input.waitForCompletion) {
    await runSingle()
    const done = await dbGetScan(id)
    return done ?? queued
  }

  void runSingle()
  return queued
}

export async function dbCreateDomainScan(input: {
  projectId: string
  url: string
  maxPages?: number
  useSitemap?: boolean
  waitForCompletion?: boolean
  skipUnchangedPages?: boolean
}): Promise<DomainScanLight> {
  if (!shouldRunLiveScans()) {
    // Fixture-style instant domain row when live off
    const synthesized = await dbCreateSynthesizedScan({
      projectId: input.projectId,
      mode: 'deep',
      url: input.url,
    })
    const rows = await dbListDomainScans(input.projectId)
    return (
      rows.find((d) => d.rootUrl === input.url && d.startedAt === synthesized.startedAt) ??
      rows[0]!
    )
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
    createLiveDomainScanHooks({
      workerSessionId: WORKER_SESSION_ID,
      getDomainRow: dbGetDomainScanRow,
    }),
  )
  return domain
}

export async function dbDeleteScan(id: string): Promise<boolean> {
  const db = getDb()
  const existing = await dbGetScanRow(id)
  if (!existing) return false
  await db.delete(scans).where(eq(scans.id, id))
  return true
}

export async function dbReassignProjectResources(
  fromProjectId: string,
  toProjectId: string,
): Promise<{ scanCount: number; recentScanIds: string[]; lastScanAt: string | null }> {
  const db = getDb()
  const moved = await db
    .select()
    .from(scans)
    .where(eq(scans.projectId, fromProjectId))

  await db
    .update(scans)
    .set({ projectId: toProjectId, updatedAt: new Date() })
    .where(eq(scans.projectId, fromProjectId))
  await db
    .update(domainScans)
    .set({ projectId: toProjectId, updatedAt: new Date() })
    .where(eq(domainScans.projectId, fromProjectId))

  const lastScanAt =
    moved
      .map((s) => s.completedAt ?? s.startedAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null

  return {
    scanCount: moved.length,
    recentScanIds: moved.map((s) => s.id).slice(0, 10),
    lastScanAt,
  }
}

export async function dbRerunScan(id: string): Promise<ScanSummary | null> {
  const source = await dbGetScan(id)
  if (!source) return null
  return dbCreateScan({
    projectId: source.projectId,
    mode: source.mode,
    url: source.url,
  })
}

export async function dbControlDomainScan(
  id: string,
  action: import('@checkion-v3/contracts').DomainScanControlAction,
): Promise<{ status: DomainScanLight['status']; message?: string } | null> {
  const row = await dbGetDomainScanRow(id)
  if (!row) return null

  const result = applyDomainScanControlAction(row.status, action)
  if (!result.ok) {
    throw new Error(result.error)
  }

  const db = getDb()
  const nextPayload = {
    ...(row.payload ?? {}),
    runtime: { workerSessionId: row.payload?.runtime?.workerSessionId ?? WORKER_SESSION_ID },
    ...(result.status === 'cancelled' ? { error: 'Cancelled by user' } : {}),
  }

  await db
    .update(domainScans)
    .set({
      status: result.status,
      completedAt:
        result.status === 'cancelled'
          ? new Date().toISOString()
          : result.status === 'paused'
            ? null
            : row.completedAt,
      payload: nextPayload,
      updatedAt: new Date(),
    })
    .where(eq(domainScans.id, id))

  return { status: result.status, message: result.message }
}

export async function dbListActiveDomainScans(projectId: string): Promise<DomainScanLight[]> {
  const rows = await dbListDomainScans(projectId)
  return rows.filter((row) => isActiveDomainScanStatus(row.status))
}
