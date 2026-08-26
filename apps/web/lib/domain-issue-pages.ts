import type {
  IssueAffectedPageItem,
  IssueAffectedPagesResult,
  IssueSummary,
  ScanSummary,
} from '@checkion-v3/contracts'
import { getDomainOverview, getScanIssues, listDomainCorpusPageScans } from './fixtures/scan-store'
import {
  parseDomainPageScanId,
  synthesizeAffectedPageUrl,
  synthesizeDomainPageScanId,
  synthesizePageIssueLoad,
} from './domain-issue-page-synth'
import { normalizeScanUrl } from './scan/url-normalize'

export {
  synthesizeAffectedPageUrl,
  synthesizeDomainPageScanId,
  synthesizePageIssueLoad,
  parseDomainPageScanId,
  isDomainPageScanId,
} from './domain-issue-page-synth'

export type AffectedPagesSort = IssueAffectedPagesResult['sort']

function buildCorpus(
  domainId: string,
  rootUrl: string,
  issueId: string,
  total: number,
  seeds: string[],
  urlToScanId: Map<string, string>,
): IssueAffectedPageItem[] {
  const items: IssueAffectedPageItem[] = []
  for (let i = 0; i < total; i += 1) {
    const load = synthesizePageIssueLoad(i, issueId)
    const url = synthesizeAffectedPageUrl(rootUrl, issueId, i, seeds)
    const realId = urlToScanId.get(normalizeScanUrl(url))
    items.push({
      url,
      scanId: realId ?? synthesizeDomainPageScanId(domainId, issueId, i),
      ...load,
    })
  }
  return items
}

function urlMapFromCorpusPages(pages: ScanSummary[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const page of pages) {
    map.set(normalizeScanUrl(page.url), page.id)
  }
  return map
}

/** Reconstruct page URL for a virtual domain→single page scan id. */
export async function resolveDomainPageScanUrl(scanId: string): Promise<string | null> {
  const parsed = parseDomainPageScanId(scanId)
  if (!parsed) return null

  const issues = await getScanIssues(parsed.domainId)
  const issue: IssueSummary | undefined = issues.find((i) => i.id === parsed.issueId)
  if (!issue) return null

  const overview = await getDomainOverview(parsed.domainId)
  const rootUrl = overview?.scan.rootUrl ?? 'https://example.com'
  const seeds =
    issue.affectedPages?.length
      ? issue.affectedPages
      : (overview?.pageSamples ?? []).map((p) => p.url)

  return synthesizeAffectedPageUrl(rootUrl, parsed.issueId, parsed.pageIndex, seeds)
}

export async function listIssueAffectedPages(
  domainId: string,
  issueId: string,
  opts: {
    page?: number
    pageSize?: number
    sort?: AffectedPagesSort
    minIssues?: number
    maxIssues?: number | null
  } = {},
): Promise<IssueAffectedPagesResult | null> {
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25))
  const page = Math.max(1, opts.page ?? 1)
  const sort: AffectedPagesSort = opts.sort === 'issues-asc' ? 'issues-asc' : 'issues-desc'
  const minIssues = Math.max(0, opts.minIssues ?? 0)
  const maxIssues =
    opts.maxIssues == null || !Number.isFinite(opts.maxIssues)
      ? null
      : Math.max(0, opts.maxIssues)

  const issues = await getScanIssues(domainId)
  const issue: IssueSummary | undefined = issues.find((i) => i.id === issueId)
  if (!issue) return null

  const overview = await getDomainOverview(domainId)
  const rootUrl = overview?.scan.rootUrl ?? 'https://example.com'
  const seeds =
    issue.affectedPages?.length
      ? issue.affectedPages
      : (overview?.pageSamples ?? []).map((p) => p.url)

  const corpusPages = await listDomainCorpusPageScans(domainId)
  const urlToScanId = urlMapFromCorpusPages(corpusPages)

  const rawTotal = Math.max(issue.affectedCount, seeds.length)
  let items = buildCorpus(domainId, rootUrl, issueId, rawTotal, seeds, urlToScanId)

  if (minIssues > 0 || maxIssues != null) {
    items = items.filter((row) => {
      if (row.issueCount < minIssues) return false
      if (maxIssues != null && row.issueCount > maxIssues) return false
      return true
    })
  }

  items.sort((a, b) => {
    const byCount =
      sort === 'issues-asc' ? a.issueCount - b.issueCount : b.issueCount - a.issueCount
    if (byCount !== 0) return byCount
    return a.url.localeCompare(b.url)
  })

  const total = items.length
  const start = (page - 1) * pageSize
  const slice = items.slice(start, start + pageSize)

  return {
    issueId,
    total,
    page,
    pageSize,
    sort,
    minIssues,
    maxIssues,
    items: slice,
  }
}
