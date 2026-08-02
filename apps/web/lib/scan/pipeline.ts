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
import { adaptDomainResultToContracts, adaptScanResultToContracts } from './adapt-scan-result'
import type { DomainScanResultWithFullPages, ScanOptions, ScanResult } from './types'
import { resolveDomainScanMaxPages } from './domain-scan-max-pages'

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
  },
) => AsyncGenerator<
  | { type: 'progress'; scannedCount: number; total: number; url: string }
  | { type: 'complete'; domainResult: DomainScanResultWithFullPages }
  | { type: 'cancelled'; domainResult: DomainScanResultWithFullPages }
  | { type: 'error'; url: string; message: string }
  | { type: 'init'; message: string }
  | { type: 'page_complete'; pageIndex: number; url: string; normalizedUrl: string; ok: boolean },
  void,
  unknown
>

let singleRunner: SingleScanRunner | null = null
let domainRunner: DomainScanRunner | null = null

/** Test hook — inject a stub instead of Puppeteer. */
export function setSingleScanRunnerForTests(runner: SingleScanRunner | null): void {
  singleRunner = runner
}

export function setDomainScanRunnerForTests(runner: DomainScanRunner | null): void {
  domainRunner = runner
}

async function defaultSingleRunner(options: ScanOptions): Promise<ScanResult> {
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
  },
) {
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
    groupId: input.id,
  })
  // Ensure result id matches our row id for screenshot paths / issues.
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
  onProgress?: (scanned: number, total: number, currentUrl: string) => void | Promise<void>
}): Promise<PersistedDomainBundle> {
  const runner = domainRunner ?? defaultDomainRunner
  const maxPages = resolveDomainScanMaxPages(input.maxPages)
  let completed: DomainScanResultWithFullPages | null = null

  for await (const update of runner(input.url, {
    useSitemap: input.useSitemap ?? true,
    maxPages,
    domainScanId: input.id,
    projectId: input.projectId,
  })) {
    if (update.type === 'progress') {
      await input.onProgress?.(update.scannedCount, update.total, update.url)
    } else if (update.type === 'complete' || update.type === 'cancelled') {
      completed = update.domainResult
    }
  }

  if (!completed) {
    throw new Error('domain_scan_incomplete')
  }

  const adapted = adaptDomainResultToContracts(completed, {
    id: input.id,
    projectId: input.projectId,
    rootUrl: input.url,
    startedAt: completed.timestamp,
  })

  return {
    domain: adapted.domain,
    issues: adapted.issues,
    scores: adapted.scores,
    overview: adapted.overview,
  }
}
