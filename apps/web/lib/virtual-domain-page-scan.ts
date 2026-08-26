import type { IssueSummary, ScanOverview, ScanSummary, ScoreCard } from '@checkion-v3/contracts'
import {
  LIVE_ISSUES,
  LIVE_SCAN_SUMMARY,
  LIVE_SCORE_CARDS,
} from './fixtures/live-scan-single-1'
import { buildRichScanOverview, enrichIssueInspect } from './fixtures/scan-overview-rich'
import { normalizeUxReadability } from './readability-cefr'

/** Prefixed lede so magazine chrome can localize without baking English into the payload. */
export const VIRTUAL_CORPUS_LEDE_PREFIX = 'checkion:virtual-corpus-lede|'

export function encodeVirtualCorpusLede(url: string): string {
  return `${VIRTUAL_CORPUS_LEDE_PREFIX}${url}`
}

export function decodeVirtualCorpusLede(lede: string | null | undefined): string | null {
  if (!lede?.startsWith(VIRTUAL_CORPUS_LEDE_PREFIX)) return null
  return lede.slice(VIRTUAL_CORPUS_LEDE_PREFIX.length)
}

/** Build a virtual single-page summary from a domain corpus page (no DB template row). */
export function buildVirtualPageScanSummary(input: {
  id: string
  projectId: string
  url: string
  domainScanId: string
  overallScore: number | null
  issueCount: number
  startedAt: string
  completedAt: string | null
}): ScanSummary {
  return {
    id: input.id,
    projectId: input.projectId,
    mode: 'single',
    url: input.url,
    domainScanId: input.domainScanId,
    status: 'completed',
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    overallScore: input.overallScore,
    issueCount: input.issueCount,
    device: 'desktop',
    standard: 'WCAG2AA',
  }
}

/**
 * Magazine payload for virtual domain→page links.
 * Uses bundled score/issue chrome when no seeded `scan-single-1` row exists,
 * but strips Dürr capture + page-identity fields so Provinzial (etc.) URLs
 * are not shown with a mismatched screenshot or SEO title.
 */
export function buildVirtualPageScanOverview(
  virtualScan: ScanSummary,
  scores?: ScoreCard[] | null,
  issues?: IssueSummary[] | null,
): ScanOverview | null {
  const rich = buildRichScanOverview(
    'scan-single-1',
    LIVE_SCAN_SUMMARY,
    scores?.length ? scores : LIVE_SCORE_CARDS,
    issues?.length ? issues : LIVE_ISSUES,
  )
  if (!rich) return null
  return {
    ...rich,
    scan: virtualScan,
    lede: encodeVirtualCorpusLede(virtualScan.url),
    screenshotUrl: undefined,
    visualLayers: undefined,
    classification: undefined,
    seo: undefined,
    performance: undefined,
    eco: undefined,
    links: undefined,
    securityPrivacy: undefined,
    generative: undefined,
    infra: undefined,
    freshness: undefined,
    passedChecks: undefined,
    topIssues: enrichIssueInspect(rich.topIssues).map((issue) => ({
      ...issue,
      scanId: virtualScan.id,
    })),
    deviceSiblings: [
      {
        id: virtualScan.id,
        device: 'desktop',
        overallScore: virtualScan.overallScore,
      },
    ],
    ux: rich.ux ? normalizeUxReadability(rich.ux) : rich.ux,
  }
}

export function virtualPageTemplateIssues(issues?: IssueSummary[] | null): IssueSummary[] {
  return enrichIssueInspect(issues?.length ? issues : LIVE_ISSUES)
}

export function virtualPageTemplateScores(scores?: ScoreCard[] | null): ScoreCard[] {
  return scores?.length ? scores : LIVE_SCORE_CARDS
}
