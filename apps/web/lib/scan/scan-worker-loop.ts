/**
 * Scan-worker claim / execute loop (DB-backed).
 * @see specs/domain/scan-worker.md
 */

import { and, asc, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/lib/db/client'
import { domainScans, scans, type DomainScanRow, type ScanRow } from '@/lib/db/schema'
import { executeSingleLiveScan } from '@/lib/scan/pipeline'
import { createLiveDomainScanHooks } from '@/lib/scan/live-domain-scan-hooks'
import { enrichIssueInspect } from '@/lib/fixtures/scan-overview-rich'
import {
  pickOldestClaimCandidate,
  resolveWorkerReclaimAction,
  type DomainScanJobOptions,
} from '@/lib/scan/scan-worker-claim'
import { resolveDomainScanMaxPages } from '@/lib/scan/domain-scan-max-pages'
import { resolveSkipUnchangedPages } from '@/lib/scan/domain-scan-reuse'
import {
  resolveScanWorkerAbandonNoProgressMs,
  resolveScanWorkerJobTimeoutMs,
  resolveScanWorkerStaleMs,
} from '@/lib/scan/scan-worker-mode'
import { screenshotStorageProbe } from '@/lib/scan/screenshot-storage'
import { paths } from '@/lib/paths'
import {
  listDueRankConfigs,
  projectRefreshRankConfig,
} from '@/lib/seo-market/project-service'

export const SCAN_WORKER_SESSION_ID = crypto.randomUUID()

const HEARTBEAT_MS = 15_000
const POLL_IDLE_MS = 2_000
/** At most one scheduled SEO rank refresh per idle tick. */
const SEO_RANK_REFRESH_PER_TICK = 1

function createdAtMs(row: { createdAt: Date | string | null }): number {
  if (row.createdAt instanceof Date) return row.createdAt.getTime()
  if (typeof row.createdAt === 'string') {
    const n = Date.parse(row.createdAt)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

async function listQueuedSingles(): Promise<ScanRow[]> {
  const db = getDb()
  return db
    .select()
    .from(scans)
    .where(and(eq(scans.status, 'queued'), eq(scans.mode, 'single')))
    .orderBy(asc(scans.createdAt))
    .limit(20)
}

async function listQueuedDomains(): Promise<DomainScanRow[]> {
  const db = getDb()
  return db
    .select()
    .from(domainScans)
    .where(eq(domainScans.status, 'queued'))
    .orderBy(asc(domainScans.createdAt))
    .limit(20)
}

async function reclaimStaleJobs(): Promise<number> {
  const staleMs = resolveScanWorkerStaleMs()
  const abandonNoProgressMs = resolveScanWorkerAbandonNoProgressMs()
  const now = Date.now()
  const db = getDb()
  let n = 0

  const activeDomains = await db
    .select()
    .from(domainScans)
    .where(inArray(domainScans.status, ['running', 'cancelling']))
  for (const row of activeDomains) {
    const action = resolveWorkerReclaimAction({
      workerSessionId: row.payload?.runtime?.workerSessionId,
      currentSessionId: SCAN_WORKER_SESSION_ID,
      updatedAt: row.updatedAt,
      startedAt: row.startedAt,
      pageCount: row.pageCount,
      nowMs: now,
      staleMs,
      abandonNoProgressMs,
    })
    if (action === 'keep') continue

    if (action === 'abandon') {
      const failedAt = new Date().toISOString()
      await db
        .update(domainScans)
        .set({
          status: 'failed',
          completedAt: failedAt,
          payload: {
            ...(row.payload ?? {}),
            error: 'scan_worker_abandoned',
            runtime: {},
          },
          updatedAt: new Date(),
        })
        .where(eq(domainScans.id, row.id))
      console.warn('[checkion-scan-worker] abandoned domain (session lost or no progress)', row.id)
      n += 1
      continue
    }

    await db
      .update(domainScans)
      .set({
        status: 'queued',
        payload: {
          ...(row.payload ?? {}),
          runtime: {},
        },
        updatedAt: new Date(),
      })
      .where(eq(domainScans.id, row.id))
    console.info('[checkion-scan-worker] requeued stale domain', row.id)
    n += 1
  }

  const activeSingles = await db
    .select()
    .from(scans)
    .where(and(eq(scans.mode, 'single'), inArray(scans.status, ['running'])))
  for (const row of activeSingles) {
    // Singles have no pageCount column — treat as 0 so long-stuck jobs are abandoned, not requeued forever.
    const action = resolveWorkerReclaimAction({
      workerSessionId: row.payload?.runtime?.workerSessionId,
      currentSessionId: SCAN_WORKER_SESSION_ID,
      updatedAt: row.updatedAt,
      startedAt: row.startedAt,
      pageCount: 0,
      nowMs: now,
      staleMs,
      abandonNoProgressMs,
    })
    if (action === 'keep') continue

    if (action === 'abandon') {
      const failedAt = new Date().toISOString()
      await db
        .update(scans)
        .set({
          status: 'failed',
          completedAt: failedAt,
          payload: {
            ...(row.payload ?? {}),
            error: 'scan_worker_abandoned',
            runtime: {},
          },
          updatedAt: new Date(),
        })
        .where(eq(scans.id, row.id))
      console.warn('[checkion-scan-worker] abandoned single (session lost or no progress)', row.id)
      n += 1
      continue
    }

    await db
      .update(scans)
      .set({
        status: 'queued',
        payload: {
          ...(row.payload ?? {}),
          runtime: {},
        },
        updatedAt: new Date(),
      })
      .where(eq(scans.id, row.id))
    console.info('[checkion-scan-worker] requeued stale single', row.id)
    n += 1
  }

  return n
}

async function claimSingle(id: string): Promise<ScanRow | null> {
  const db = getDb()
  const rows = await db.select().from(scans).where(eq(scans.id, id)).limit(1)
  const row = rows[0]
  if (!row || row.status !== 'queued' || row.mode !== 'single') return null
  const now = new Date()
  await db
    .update(scans)
    .set({
      status: 'running',
      payload: {
        ...(row.payload ?? {}),
        scan: { ...(row.payload?.scan ?? {}), status: 'running' },
        runtime: { workerSessionId: SCAN_WORKER_SESSION_ID },
      },
      updatedAt: now,
    })
    .where(and(eq(scans.id, id), eq(scans.status, 'queued')))
  const claimed = await db.select().from(scans).where(eq(scans.id, id)).limit(1)
  const next = claimed[0]
  if (!next || next.status !== 'running') return null
  if (next.payload?.runtime?.workerSessionId !== SCAN_WORKER_SESSION_ID) return null
  return next
}

async function claimDomain(id: string): Promise<DomainScanRow | null> {
  const db = getDb()
  const rows = await db.select().from(domainScans).where(eq(domainScans.id, id)).limit(1)
  const row = rows[0]
  if (!row || row.status !== 'queued') return null
  const now = new Date()
  await db
    .update(domainScans)
    .set({
      status: 'running',
      payload: {
        ...(row.payload ?? {}),
        runtime: { workerSessionId: SCAN_WORKER_SESSION_ID },
      },
      updatedAt: now,
    })
    .where(and(eq(domainScans.id, id), eq(domainScans.status, 'queued')))
  const claimed = await db.select().from(domainScans).where(eq(domainScans.id, id)).limit(1)
  const next = claimed[0]
  if (!next || next.status !== 'running') return null
  if (next.payload?.runtime?.workerSessionId !== SCAN_WORKER_SESSION_ID) return null
  return next
}

function startHeartbeat(kind: 'single' | 'domain', id: string): () => void {
  const tick = async () => {
    try {
      const db = getDb()
      if (kind === 'single') {
        await db.update(scans).set({ updatedAt: new Date() }).where(eq(scans.id, id))
      } else {
        await db.update(domainScans).set({ updatedAt: new Date() }).where(eq(domainScans.id, id))
      }
    } catch (err) {
      console.warn('[checkion-scan-worker] heartbeat failed', kind, id, err)
    }
  }
  const handle = setInterval(() => {
    void tick()
  }, HEARTBEAT_MS)
  return () => clearInterval(handle)
}

async function runSingleJob(row: ScanRow): Promise<void> {
  const db = getDb()
  const stopHb = startHeartbeat('single', row.id)
  try {
    const bundle = await executeSingleLiveScan({
      id: row.id,
      projectId: row.projectId,
      url: row.url,
      mode: 'single',
    })
    await db
      .update(scans)
      .set({
        status: bundle.scan.status,
        completedAt: bundle.scan.completedAt,
        overallScore: bundle.scan.overallScore,
        issueCount: bundle.scan.issueCount,
        payload: {
          scan: bundle.scan,
          issues: enrichIssueInspect(bundle.issues),
          scores: bundle.scores,
          overview: bundle.overview,
          runtime: { workerSessionId: SCAN_WORKER_SESSION_ID },
        },
        updatedAt: new Date(),
      })
      .where(eq(scans.id, row.id))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'scan_failed'
    console.error('[checkion-scan-worker] single failed', row.id, message)
    const failedAt = new Date().toISOString()
    await db
      .update(scans)
      .set({
        status: 'failed',
        completedAt: failedAt,
        payload: {
          ...(row.payload ?? {}),
          scan: {
            id: row.id,
            projectId: row.projectId,
            mode: 'single',
            url: row.url,
            status: 'failed',
            startedAt: row.startedAt,
            completedAt: failedAt,
            overallScore: null,
            issueCount: 0,
          },
          runtime: { workerSessionId: SCAN_WORKER_SESSION_ID },
          error: message,
        },
        updatedAt: new Date(),
      })
      .where(eq(scans.id, row.id))
  } finally {
    stopHb()
  }
}

async function getDomainRow(id: string): Promise<DomainScanRow | null> {
  const db = getDb()
  const rows = await db.select().from(domainScans).where(eq(domainScans.id, id)).limit(1)
  return rows[0] ?? null
}

async function runDomainJob(row: DomainScanRow): Promise<void> {
  const job = (row.payload?.job ?? {}) as Partial<DomainScanJobOptions>
  const maxPages = resolveDomainScanMaxPages(job.maxPages)
  const skipUnchangedPages = resolveSkipUnchangedPages(job.skipUnchangedPages)
  const linkScanId = job.linkScanId?.trim() || undefined
  const stopHb = startHeartbeat('domain', row.id)
  const jobTimeoutMs = resolveScanWorkerJobTimeoutMs(maxPages)

  const linkScan = linkScanId
    ? {
        id: linkScanId,
        projectId: row.projectId,
        url: row.rootUrl,
        startedAt: row.startedAt,
      }
    : undefined

  try {
    const hooks = createLiveDomainScanHooks({
      workerSessionId: SCAN_WORKER_SESSION_ID,
      getDomainRow,
      linkScan,
    })

    const beforeOk = (await hooks.beforeWorkerStart?.(row.id)) ?? true
    if (!beforeOk) return

    await hooks.markRunning(row.id)
    console.info(
      '[checkion-scan-worker] domain execute start',
      row.id,
      row.rootUrl,
      `maxPages=${maxPages}`,
      `timeoutMs=${jobTimeoutMs}`,
    )

    const { executeDomainLiveScan } = await import('@/lib/scan/pipeline')
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined
    const executePromise = executeDomainLiveScan({
      id: row.id,
      projectId: row.projectId,
      url: row.rootUrl,
      maxPages,
      useSitemap: job.useSitemap,
      skipUnchangedPages,
      getScanControl: hooks.getScanControl ? () => hooks.getScanControl!(row.id) : undefined,
      onProgress: async (scanned, total, currentUrl) => {
        await hooks.updateProgress?.(row.id, scanned, total, currentUrl)
        const db = getDb()
        await db.update(domainScans).set({ updatedAt: new Date() }).where(eq(domainScans.id, row.id))
        if (scanned === 1 || scanned % 5 === 0 || scanned === total) {
          console.info('[checkion-scan-worker] domain progress', row.id, `${scanned}/${total}`, currentUrl)
        } else {
          console.info('[checkion-scan-worker] domain page', row.id, `${scanned}/${total}`, currentUrl)
        }
      },
    })

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        void (async () => {
          try {
            await getDb()
              .update(domainScans)
              .set({
                status: 'cancelling',
                payload: {
                  ...(row.payload ?? {}),
                  runtime: { workerSessionId: SCAN_WORKER_SESSION_ID },
                  error: 'scan_worker_job_timeout',
                },
                updatedAt: new Date(),
              })
              .where(eq(domainScans.id, row.id))
          } catch {
            /* best-effort cancel signal for spider */
          }
        })()
        reject(new Error(`scan_worker_job_timeout after ${jobTimeoutMs}ms`))
      }, jobTimeoutMs)
    })

    let bundle: Awaited<ReturnType<typeof executeDomainLiveScan>>
    try {
      bundle = await Promise.race([executePromise, timeoutPromise])
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle)
    }

    const { pageSamples, systemicIssues, lede, ...rest } = bundle.overview
    const payload = {
      domain: bundle.domain,
      issues: bundle.issues,
      scores: bundle.scores,
      pageScans: bundle.pageScans,
      overviewExtras: {
        lede,
        systemicIssues,
        pageSamples,
        ...rest,
      },
    }

    if (bundle.terminal === 'cancelled' && hooks.persistCancelled) {
      await hooks.persistCancelled(payload)
    } else {
      await hooks.persistCompleted(payload)
    }
    console.info('[checkion-scan-worker] domain execute done', row.id, bundle.terminal)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'domain_scan_failed'
    console.error('[checkion-scan-worker] domain failed', row.id, message)
    const hooks = createLiveDomainScanHooks({
      workerSessionId: SCAN_WORKER_SESSION_ID,
      getDomainRow,
      linkScan,
    })
    await hooks.persistFailed(row.id, message)
  } finally {
    stopHb()
  }
}

export type ScanWorkerTickResult = {
  claimed: boolean
  kind?: 'single' | 'domain' | 'seo-rank'
  id?: string
  reclaimed: number
}

async function runDueSeoRankRefreshes(): Promise<{ ran: boolean; id?: string }> {
  try {
    const due = await listDueRankConfigs()
    const slice = due.slice(0, SEO_RANK_REFRESH_PER_TICK)
    if (slice.length === 0) return { ran: false }
    const config = slice[0]!
    console.info('[checkion-scan-worker] seo rank refresh', config.id, config.domain)
    await projectRefreshRankConfig(config.id)
    return { ran: true, id: config.id }
  } catch (err) {
    console.error('[checkion-scan-worker] seo rank refresh failed', err)
    return { ran: false }
  }
}

/** One poll/claim/execute cycle (for tests + loop). */
export async function runScanWorkerTick(): Promise<ScanWorkerTickResult> {
  const reclaimed = await reclaimStaleJobs()
  const singles = await listQueuedSingles()
  const domains = await listQueuedDomains()
  const pick = pickOldestClaimCandidate(
    singles.map((s) => ({ id: s.id, createdAtMs: createdAtMs(s) })),
    domains.map((d) => ({ id: d.id, createdAtMs: createdAtMs(d) })),
  )
  if (!pick) {
    const seo = await runDueSeoRankRefreshes()
    if (seo.ran) {
      return { claimed: true, kind: 'seo-rank', id: seo.id, reclaimed }
    }
    return { claimed: false, reclaimed }
  }

  if (pick.kind === 'single') {
    const claimed = await claimSingle(pick.id)
    if (!claimed) return { claimed: false, reclaimed }
    console.info('[checkion-scan-worker] claimed single', claimed.id)
    await runSingleJob(claimed)
    return { claimed: true, kind: 'single', id: claimed.id, reclaimed }
  }

  const claimed = await claimDomain(pick.id)
  if (!claimed) return { claimed: false, reclaimed }
  console.info('[checkion-scan-worker] claimed domain', claimed.id)
  await runDomainJob(claimed)
  return { claimed: true, kind: 'domain', id: claimed.id, reclaimed }
}

export async function runScanWorkerLoop(signal?: AbortSignal): Promise<void> {
  console.info(
    `[checkion-scan-worker] loop start session=${SCAN_WORKER_SESSION_ID} staleMs=${resolveScanWorkerStaleMs()}`,
  )
  while (!signal?.aborted) {
    try {
      const tick = await runScanWorkerTick()
      if (!tick.claimed) {
        await new Promise((r) => setTimeout(r, POLL_IDLE_MS))
      }
    } catch (err) {
      console.error('[checkion-scan-worker] tick error', err)
      await new Promise((r) => setTimeout(r, POLL_IDLE_MS))
    }
  }
}

export function scanWorkerHealthPayload(): {
  ok: true
  service: string
  sessionId: string
  port: number
  screenshots: { path: string; writable: boolean; jpegCount: number }
} {
  return {
    ok: true,
    service: paths.scanWorkerServiceName,
    sessionId: SCAN_WORKER_SESSION_ID,
    port: paths.scanWorkerPort,
    screenshots: screenshotStorageProbe(),
  }
}
