/**
 * Start a domain (deep) scan: create row + run spider in background.
 * Supports pause / resume / cancel via DB-backed getScanControl (v2 parity).
 */

import type { DomainScanLight, IssueSummary, ScoreCard } from '@checkion-v3/contracts'
import { executeDomainLiveScan } from './pipeline'
import { resolveDomainScanMaxPages } from './domain-scan-max-pages'
import { resolveSkipUnchangedPages } from './domain-scan-reuse'
import type { DomainScanControlState } from './spider'

export type DomainScanPersistHooks = {
  insertQueued: (row: {
    id: string
    projectId: string
    rootUrl: string
    startedAt: string
    maxPages: number
  }) => Promise<void>
  markRunning: (id: string) => Promise<void>
  updateProgress?: (id: string, scanned: number, total: number, currentUrl: string) => Promise<void>
  persistCompleted: (bundle: {
    domain: DomainScanLight
    issues: IssueSummary[]
    scores: ScoreCard[]
    overviewExtras: Record<string, unknown>
  }) => Promise<void>
  persistCancelled?: (bundle: {
    domain: DomainScanLight
    issues: IssueSummary[]
    scores: ScoreCard[]
    overviewExtras: Record<string, unknown>
  }) => Promise<void>
  persistFailed: (id: string, error: string) => Promise<void>
  /** Return false to abort worker before spider starts (already cancelled). */
  beforeWorkerStart?: (id: string) => Promise<boolean>
  /** When true, skip markRunning (resume after pause). */
  isPaused?: (id: string) => Promise<boolean>
  getScanControl?: (id: string) => Promise<DomainScanControlState>
}

export type StartDomainScanInput = {
  projectId: string
  url: string
  maxPages?: number
  useSitemap?: boolean
  /** When true, await the crawl before returning (tests / sync callers). */
  waitForCompletion?: boolean
  /** Reuse prior page results when ETag/Last-Modified still match (default true). */
  skipUnchangedPages?: boolean
}

export async function startDomainScan(
  input: StartDomainScanInput,
  hooks: DomainScanPersistHooks,
): Promise<{ id: string; domain: DomainScanLight }> {
  const id = `domain-${Date.now()}`
  const startedAt = new Date().toISOString()
  const maxPages = resolveDomainScanMaxPages(input.maxPages)
  const skipUnchangedPages = resolveSkipUnchangedPages(input.skipUnchangedPages)

  const queued: DomainScanLight = {
    id,
    projectId: input.projectId,
    rootUrl: input.url,
    status: 'queued',
    pageCount: 0,
    overallScore: null,
    issueCount: 0,
    startedAt,
    completedAt: null,
  }

  await hooks.insertQueued({
    id,
    projectId: input.projectId,
    rootUrl: input.url,
    startedAt,
    maxPages,
  })

  const run = async () => {
    try {
      if (hooks.beforeWorkerStart) {
        const ok = await hooks.beforeWorkerStart(id)
        if (!ok) return
      }

      const paused = (await hooks.isPaused?.(id)) ?? false
      if (!paused) {
        await hooks.markRunning(id)
      }

      const bundle = await executeDomainLiveScan({
        id,
        projectId: input.projectId,
        url: input.url,
        maxPages,
        useSitemap: input.useSitemap,
        skipUnchangedPages,
        getScanControl: hooks.getScanControl
          ? () => hooks.getScanControl!(id)
          : undefined,
        onProgress: async (scanned, total, currentUrl) => {
          await hooks.updateProgress?.(id, scanned, total, currentUrl)
        },
      })

      const { pageSamples, systemicIssues, lede, ...rest } = bundle.overview
      const payload = {
        domain: bundle.domain,
        issues: bundle.issues,
        scores: bundle.scores,
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'domain_scan_failed'
      console.error('[checkion-v3] domain scan failed', id, message)
      await hooks.persistFailed(id, message)
    }
  }

  if (input.waitForCompletion) {
    await run()
  } else {
    void run()
  }

  return { id, domain: queued }
}
