import type { DomainScanLight, IssueSummary, ScoreCard } from '@checkion-v3/contracts'
import { eq } from 'drizzle-orm'
import type { DomainPageScanPersistBundle, DomainScanPersistHooks } from './domain-scan-start'
import { readDomainScanControlState } from './domain-scan-control'
import { enrichIssueInspect } from '../fixtures/scan-overview-rich'
import { getDb } from '../db/client'
import { domainScans, scans, type DomainScanRow } from '../db/schema'

type ScanRowQueued = {
  id: string
  projectId: string
  url: string
  startedAt: string
}

async function upsertDomainPageScans(
  pageScans: DomainPageScanPersistBundle[],
  workerSessionId: string,
): Promise<void> {
  if (!pageScans.length) return
  const db = getDb()
  const now = new Date()
  for (const page of pageScans) {
    const scan = page.scan
    const payload = {
      scan,
      issues: enrichIssueInspect(page.issues),
      scores: page.scores,
      overview: page.overview,
      runtime: { workerSessionId },
    }
    await db
      .insert(scans)
      .values({
        id: scan.id,
        projectId: scan.projectId,
        mode: 'single',
        url: scan.url,
        status: scan.status,
        startedAt: scan.startedAt,
        completedAt: scan.completedAt,
        overallScore: scan.overallScore,
        issueCount: scan.issueCount,
        payload,
        updatedAt: now,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: scans.id,
        set: {
          status: scan.status,
          completedAt: scan.completedAt,
          overallScore: scan.overallScore,
          issueCount: scan.issueCount,
          url: scan.url,
          payload,
          updatedAt: now,
        },
      })
  }
}

export function createLiveDomainScanHooks(input: {
  workerSessionId: string
  getDomainRow: (id: string) => Promise<DomainScanRow | null>
  linkScan?: ScanRowQueued
}): DomainScanPersistHooks {
  const { workerSessionId, getDomainRow, linkScan } = input

  const persistBundle = async (
    domainId: string,
    bundle: {
      domain: DomainScanLight
      issues: IssueSummary[]
      scores: ScoreCard[]
      overviewExtras: Record<string, unknown>
      pageScans: DomainPageScanPersistBundle[]
    },
    status: DomainScanLight['status'],
  ) => {
    const db = getDb()
    const completedAt = bundle.domain.completedAt ?? new Date().toISOString()
    const domain: DomainScanLight = { ...bundle.domain, status, completedAt }
    await db
      .update(domainScans)
      .set({
        status,
        pageCount: domain.pageCount,
        overallScore: domain.overallScore,
        issueCount: domain.issueCount,
        completedAt,
        payload: {
          domain,
          issues: enrichIssueInspect(bundle.issues),
          scores: bundle.scores,
          overviewExtras: bundle.overviewExtras,
          runtime: { workerSessionId },
        },
        updatedAt: new Date(),
      })
      .where(eq(domainScans.id, domainId))

    await upsertDomainPageScans(bundle.pageScans ?? [], workerSessionId)

    if (!linkScan) return
    await db
      .update(scans)
      .set({
        status: status === 'cancelled' ? 'cancelled' : status === 'failed' ? 'failed' : 'completed',
        completedAt,
        overallScore: domain.overallScore,
        issueCount: domain.issueCount,
        payload: {
          scan: {
            id: linkScan.id,
            projectId: linkScan.projectId,
            mode: 'deep',
            url: linkScan.url,
            domainScanId: domainId,
            status: status === 'cancelled' ? 'cancelled' : status === 'failed' ? 'failed' : 'completed',
            startedAt: linkScan.startedAt,
            completedAt,
            overallScore: domain.overallScore,
            issueCount: domain.issueCount,
          },
          issues: enrichIssueInspect(bundle.issues),
          scores: bundle.scores,
          runtime: { workerSessionId },
        },
        updatedAt: new Date(),
      })
      .where(eq(scans.id, linkScan.id))
  }

  return {
    insertQueued: async (row) => {
      const db = getDb()
      await db.insert(domainScans).values({
        id: row.id,
        projectId: row.projectId,
        rootUrl: row.rootUrl,
        status: 'queued',
        pageCount: 0,
        overallScore: null,
        issueCount: 0,
        startedAt: row.startedAt,
        completedAt: null,
        payload: {
          progress: { scanned: 0, total: row.maxPages },
          runtime: { workerSessionId },
        },
        updatedAt: new Date(),
        createdAt: new Date(),
      })
    },
    beforeWorkerStart: async (domainId) => {
      const row = await getDomainRow(domainId)
      if (!row) return false
      if (row.status === 'cancelling' || row.status === 'cancelled') {
        const db = getDb()
        await db
          .update(domainScans)
          .set({
            status: 'cancelled',
            completedAt: new Date().toISOString(),
            payload: {
              ...(row.payload ?? {}),
              error: 'Cancelled by user',
              runtime: { workerSessionId },
            },
            updatedAt: new Date(),
          })
          .where(eq(domainScans.id, domainId))
        return false
      }
      return true
    },
    isPaused: async (domainId) => {
      const row = await getDomainRow(domainId)
      return row?.status === 'paused'
    },
    getScanControl: async (domainId) => {
      const row = await getDomainRow(domainId)
      if (!row) return 'cancel'
      return readDomainScanControlState(row.status)
    },
    markRunning: async (domainId) => {
      const db = getDb()
      const existing = await getDomainRow(domainId)
      await db
        .update(domainScans)
        .set({
          status: 'running',
          payload: {
            ...(existing?.payload ?? {}),
            runtime: { workerSessionId },
          },
          updatedAt: new Date(),
        })
        .where(eq(domainScans.id, domainId))

      if (!linkScan) return
      await db
        .update(scans)
        .set({
          status: 'running',
          payload: {
            scan: {
              id: linkScan.id,
              projectId: linkScan.projectId,
              mode: 'deep',
              url: linkScan.url,
              domainScanId: domainId,
              status: 'running',
              startedAt: linkScan.startedAt,
              completedAt: null,
              overallScore: null,
              issueCount: 0,
            },
            runtime: { workerSessionId },
          },
          updatedAt: new Date(),
        })
        .where(eq(scans.id, linkScan.id))
    },
    updateProgress: async (domainId, scanned, total, currentUrl) => {
      const db = getDb()
      const existing = await getDomainRow(domainId)
      await db
        .update(domainScans)
        .set({
          pageCount: scanned,
          payload: {
            ...(existing?.payload ?? {}),
            progress: { scanned, total, currentUrl },
            runtime: { workerSessionId },
          },
          updatedAt: new Date(),
        })
        .where(eq(domainScans.id, domainId))
    },
    persistCompleted: async (bundle) => {
      await persistBundle(bundle.domain.id, bundle, 'completed')
    },
    persistCancelled: async (bundle) => {
      await persistBundle(bundle.domain.id, bundle, 'cancelled')
    },
    persistFailed: async (domainId, error) => {
      const db = getDb()
      const failedAt = new Date().toISOString()
      const existing = await getDomainRow(domainId)
      await db
        .update(domainScans)
        .set({
          status: 'failed',
          completedAt: failedAt,
          payload: {
            ...(existing?.payload ?? {}),
            runtime: { workerSessionId },
            error,
          },
          updatedAt: new Date(),
        })
        .where(eq(domainScans.id, domainId))

      if (!linkScan) return
      await db
        .update(scans)
        .set({
          status: 'failed',
          completedAt: failedAt,
          payload: {
            scan: {
              id: linkScan.id,
              projectId: linkScan.projectId,
              mode: 'deep',
              url: linkScan.url,
              domainScanId: domainId,
              status: 'failed',
              startedAt: linkScan.startedAt,
              completedAt: failedAt,
              overallScore: null,
              issueCount: 0,
            },
            runtime: { workerSessionId },
            error,
          },
          updatedAt: new Date(),
        })
        .where(eq(scans.id, linkScan.id))
    },
  }
}
