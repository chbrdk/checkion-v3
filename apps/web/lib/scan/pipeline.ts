/**
 * Live scan pipeline orchestration — single + domain.
 * Scanner entrypoints are injectable for tests (no Chromium in CI).
 */

import type {
  DomainOverview,
  DomainScanLight,
  IssueSummary,
  ScanOverview,
  ScanSummary,
  ScoreCard,
} from '@checkion-v3/contracts'
import type { ScanStatus } from '@checkion-v3/contracts'
import { adaptDomainResultToContracts, adaptScanResultToContracts } from './adapt-scan-result'
import type { DomainScanResultWithFullPages, ScanOptions, ScanResult } from './types'
import { resolveDomainScanMaxPages } from './domain-scan-max-pages'
import type { DomainScanControlState, DomainScanStreamUpdate } from './spider'

export type SingleScanRunner = (
  options: ScanOptions & { groupId?: string; userId?: string },
) => Promise<ScanResult>

export type DomainScanRunner = (
  url: string,
  options: {
    useSitemap?: boolean
    maxPages?: number
    domainScanId?: string
    projectId?: string | null
    skipUnchangedPages?: boolean
    getScanControl?: () => Promise<DomainScanControlState>
  },
) =>
  | AsyncGenerator<DomainScanStreamUpdate, unknown, unknown>
  | Promise<AsyncGenerator<DomainScanStreamUpdate, unknown, unknown>>

let singleRunner: SingleScanRunner | null = null
let domainRunner: DomainScanRunner | null = null

/** Test hook — inject a stub instead of Puppeteer. */
export function setSingleScanRunnerForTests(runner: SingleScanRunner | null): void {
  singleRunner = runner
}

export function setDomainScanRunnerForTests(runner: DomainScanRunner | null): void {
  domainRunner = runner
}

async function defaultSingleRunner(
  options: ScanOptions & { groupId?: string; userId?: string },
): Promise<ScanResult> {
  const { runScan } = await import('./scanner')
  return runScan(options)
}

async function defaultDomainRunner(
  url: string,
  options: {
    useSitemap?: boolean
    maxPages?: number
    domainScanId?: string
    projectId?: string | null
    skipUnchangedPages?: boolean
    getScanControl?: () => Promise<DomainScanControlState>
  },
): Promise<AsyncGenerator<DomainScanStreamUpdate, unknown, unknown>> {
  const { runDomainScan } = await import('./spider')
  return runDomainScan(url, options)
}

export type PersistedScanBundle = {
  scan: ScanSummary
  issues: IssueSummary[]
  scores: ScoreCard[]
  overview: ScanOverview
}

export type PersistedDomainBundle = {
  domain: DomainScanLight
  issues: IssueSummary[]
  scores: ScoreCard[]
  overview: DomainOverview
  pageScans: PersistedScanBundle[]
}

export async function executeSingleLiveScan(input: {
  id: string
  projectId: string
  url: string
  mode?: 'single' | 'deep'
}): Promise<PersistedScanBundle> {
  const runner = singleRunner ?? defaultSingleRunner
  const result = await runner({
    url: input.url,
    device: 'desktop',
    standard: 'WCAG2AA',
    runners: ['axe', 'htmlcs'],
    id: input.id,
    groupId: input.id,
  })
  const normalized: ScanResult = { ...result, id: input.id, groupId: result.groupId ?? input.id }
  return adaptScanResultToContracts(normalized, {
    id: input.id,
    projectId: input.projectId,
    mode: input.mode ?? 'single',
  })
}

export async function executeDomainLiveScan(input: {
  id: string
  projectId: string
  url: string
  maxPages?: number
  useSitemap?: boolean
  skipUnchangedPages?: boolean
  onProgress?: (scanned: number, total: number, currentUrl: string) => void | Promise<void>
  getScanControl?: () => Promise<DomainScanControlState>
}): Promise<PersistedDomainBundle & { terminal: 'completed' | 'cancelled' }> {
  const runner =
    domainRunner ?? ((...args: Parameters<DomainScanRunner>) => defaultDomainRunner(...args))
  const maxPages = resolveDomainScanMaxPages(input.maxPages)
  let completed: DomainScanResultWithFullPages | null = null
  let terminal: 'completed' | 'cancelled' = 'completed'

  const stream = await Promise.resolve(
    runner(input.url, {
      useSitemap: input.useSitemap ?? true,
      maxPages,
      domainScanId: input.id,
      projectId: input.projectId,
      skipUnchangedPages: input.skipUnchangedPages,
      getScanControl: input.getScanControl,
    }),
  )

  for await (const update of stream) {
    if (update.type === 'progress') {
      await input.onProgress?.(update.scannedCount, update.total, update.url)
    } else if (update.type === 'complete') {
      completed = update.domainResult
      terminal = 'completed'
    } else if (update.type === 'cancelled') {
      completed = update.domainResult
      terminal = 'cancelled'
    }
  }

  if (!completed) {
    throw new Error('domain_scan_incomplete')
  }

  const contractStatus: ScanStatus = terminal === 'cancelled' ? 'cancelled' : 'completed'
  const adapted = adaptDomainResultToContracts(completed, {
    id: input.id,
    projectId: input.projectId,
    rootUrl: input.url,
    startedAt: completed.timestamp,
    status: contractStatus,
  })

  return {
    domain: adapted.domain,
    issues: adapted.issues,
    scores: adapted.scores,
    overview: adapted.overview,
    pageScans: adapted.pageScans,
    terminal,
  }
}
