import type {
  DomainCorpusPageRow,
  DomainCorpusPagesResult,
  DomainCorpusPagesSort,
  DomainPageSample,
  ScanOverview,
  ScanSummary,
  ScoreKind,
} from '@checkion-v3/contracts'
import { paths } from './paths'
import {
  getDomainOverview,
  getDomainScan,
  getScanOverview,
  listDomainCorpusPageScans,
} from './fixtures/scan-store'

const SCORE_KINDS: ReadonlySet<ScoreKind> = new Set([
  'accessibility',
  'seo',
  'performance',
  'ux',
  'eco',
  'generative',
  'best_practices',
])

export type ListDomainCorpusPagesOptions = {
  page?: number
  pageSize?: number
  sort?: DomainCorpusPagesSort
  q?: string
}

export type ListDomainCorpusPagesMeta = {
  corpusMode: 'corpus' | 'samples-only'
}

function resultsPath(scanId: string): string {
  return paths.routes.resultSection(scanId, 'overview')
}

function scoresFromOverview(overview: ScanOverview | null): DomainCorpusPageRow['scores'] | undefined {
  if (!overview?.scores?.length) return undefined
  const out: NonNullable<DomainCorpusPageRow['scores']> = {}
  for (const card of overview.scores) {
    if (SCORE_KINDS.has(card.kind)) {
      out[card.kind as keyof typeof out] = card.value
    }
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function issueCounts(
  scan: Pick<ScanSummary, 'issueStats'>,
  overview: ScanOverview | null,
): { errors: number; warnings: number } {
  const stats = scan.issueStats ?? overview?.scan.issueStats
  return {
    errors: stats?.errors ?? 0,
    warnings: stats?.warnings ?? 0,
  }
}

async function rowFromScanSummary(scan: ScanSummary): Promise<DomainCorpusPageRow> {
  const overview = await getScanOverview(scan.id)
  const { errors, warnings } = issueCounts(scan, overview)
  return {
    url: scan.url,
    scanId: scan.id,
    overallScore: scan.overallScore,
    errors,
    warnings,
    scores: scoresFromOverview(overview),
    classification: overview?.classification ?? null,
    resultsPath: resultsPath(scan.id),
  }
}

async function rowFromPageSample(sample: DomainPageSample): Promise<DomainCorpusPageRow> {
  const scanId = sample.scanId ?? ''
  const overview = scanId ? await getScanOverview(scanId) : null
  const { errors, warnings } = overview
    ? issueCounts(overview.scan, overview)
    : { errors: sample.errors ?? 0, warnings: sample.warnings ?? 0 }
  return {
    url: sample.url,
    scanId: scanId || `sample:${sample.url}`,
    overallScore: sample.score ?? overview?.scan.overallScore ?? null,
    errors,
    warnings,
    scores: scoresFromOverview(overview),
    classification: overview?.classification ?? null,
    resultsPath: scanId ? resultsPath(scanId) : paths.routes.results,
  }
}

function compareNullableScore(a: number | null, b: number | null, dir: 'asc' | 'desc'): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return dir === 'asc' ? a - b : b - a
}

function sortRows(rows: DomainCorpusPageRow[], sort: DomainCorpusPagesSort): DomainCorpusPageRow[] {
  const copy = [...rows]
  switch (sort) {
    case 'score_desc':
      copy.sort((a, b) => compareNullableScore(a.overallScore, b.overallScore, 'desc'))
      break
    case 'url_asc':
      copy.sort((a, b) => a.url.localeCompare(b.url))
      break
    case 'issues_desc':
      copy.sort((a, b) => {
        const loadA = a.errors + a.warnings
        const loadB = b.errors + b.warnings
        if (loadB !== loadA) return loadB - loadA
        return a.url.localeCompare(b.url)
      })
      break
    case 'score_asc':
    default:
      copy.sort((a, b) => compareNullableScore(a.overallScore, b.overallScore, 'asc'))
      break
  }
  return copy
}

function filterRows(rows: DomainCorpusPageRow[], q?: string): DomainCorpusPageRow[] {
  const needle = (q ?? '').trim().toLowerCase()
  if (!needle) return rows
  return rows.filter((row) => row.url.toLowerCase().includes(needle))
}

function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}

export async function listDomainCorpusPages(
  domainScanId: string,
  opts: ListDomainCorpusPagesOptions = {},
): Promise<(DomainCorpusPagesResult & ListDomainCorpusPagesMeta) | null> {
  const domain = await getDomainScan(domainScanId)
  if (!domain) return null

  const page = Math.max(1, opts.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25))
  const sort: DomainCorpusPagesSort = opts.sort ?? 'score_asc'

  const corpusScans = await listDomainCorpusPageScans(domainScanId)
  let corpusMode: ListDomainCorpusPagesMeta['corpusMode'] = 'corpus'
  let rows: DomainCorpusPageRow[]

  if (corpusScans.length > 0) {
    rows = await Promise.all(corpusScans.map((scan) => rowFromScanSummary(scan)))
  } else {
    corpusMode = 'samples-only'
    const overview = await getDomainOverview(domainScanId)
    const samples = overview?.pageSamples ?? []
    rows = await Promise.all(samples.map((sample) => rowFromPageSample(sample)))
  }

  const filtered = filterRows(sortRows(rows, sort), opts.q)
  const pageCount = filtered.length
  const totalPages = pageCount === 0 ? 0 : Math.ceil(pageCount / pageSize)
  const items = paginate(filtered, page, pageSize)

  return {
    domainScanId,
    rootUrl: domain.rootUrl,
    status: domain.status,
    pageCount,
    items,
    page,
    pageSize,
    totalPages,
    sort,
    corpusMode,
  }
}
