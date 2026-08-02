/**
 * Start a domain (deep) scan: create row + run spider in background.
 * Slim Phase 2 port of CHECKION `lib/domain-scan-start.ts` (no LLM / reuse / issues tables).
 */

import type { DomainScanLight, IssueSummary, ScoreCard } from '@checkion-v3/contracts'
import { executeDomainLiveScan } from './pipeline'
import { resolveDomainScanMaxPages } from './domain-scan-max-pages'

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
  persistFailed: (id: string, error: string) => Promise<void>
}

export type StartDomainScanInput = {
  projectId: string
  url: string
  maxPages?: number
  useSitemap?: boolean
  /** When true, await the crawl before returning (tests / sync callers). */
  waitForCompletion?: boolean
}

export async function startDomainScan(
  input: StartDomainScanInput,
  hooks: DomainScanPersistHooks,
): Promise<{ id: string; domain: DomainScanLight }> {
  const id = `domain-${Date.now()}`
  const startedAt = new Date().toISOString()
  const maxPages = resolveDomainScanMaxPages(input.maxPages)

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
      await hooks.markRunning(id)
      const bundle = await executeDomainLiveScan({
        id,
        projectId: input.projectId,
        url: input.url,
        maxPages,
        useSitemap: input.useSitemap,
        onProgress: async (scanned, total, currentUrl) => {
          await hooks.updateProgress?.(id, scanned, total, currentUrl)
        },
      })
      const { pageSamples, systemicIssues, lede, ...rest } = bundle.overview
      await hooks.persistCompleted({
        domain: bundle.domain,
        issues: bundle.issues,
        scores: bundle.scores,
        overviewExtras: {
          lede,
          systemicIssues,
          pageSamples,
          ...rest,
        },
      })
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
