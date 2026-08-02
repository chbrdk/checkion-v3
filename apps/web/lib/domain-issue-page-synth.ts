import type { IssueAffectedPageItem } from '@checkion-v3/contracts'

const LOCALES = ['de', 'en', 'fr', 'es', 'it', 'jp'] as const
const PATH_STEMS = [
  'media/news',
  'unternehmen',
  'products',
  'service',
  'presse/news',
  'unternehmen/events',
  'solutions',
  'career',
] as const

const PAGE_SCAN_PREFIX = 'dpage__'

function originFromRoot(rootUrl: string): string {
  try {
    return new URL(rootUrl).origin
  } catch {
    return rootUrl.replace(/\/$/, '')
  }
}

/** Deterministic URL for index `i` in a synthetic affected-pages corpus. */
export function synthesizeAffectedPageUrl(
  rootUrl: string,
  issueId: string,
  i: number,
  seeds: string[] = [],
): string {
  if (i < seeds.length) return seeds[i]!
  const origin = originFromRoot(rootUrl)
  const locale = LOCALES[i % LOCALES.length]
  const stem = PATH_STEMS[Math.floor(i / LOCALES.length) % PATH_STEMS.length]
  const slug = issueId.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 24) || 'issue'
  return `${origin}/${locale}/${stem}/${slug}-${i + 1}`
}

/** Stable synthetic issue load for ranking (hot pages first when sorted desc). */
export function synthesizePageIssueLoad(
  i: number,
  issueId: string,
): Pick<IssueAffectedPageItem, 'issueCount' | 'criticalCount'> {
  const mix = (i * 31 + issueId.length * 17) % 23
  const issueCount =
    i < 8 ? 22 - i : i < 40 ? 14 - Math.floor((i - 8) / 4) : 1 + (mix % 8)
  const criticalCount = Math.max(
    1,
    Math.min(issueCount, Math.ceil(issueCount * (0.35 + (mix % 5) / 20))),
  )
  return { issueCount, criticalCount }
}

/** Single-page result id for a domain crawl page (fixture / demo wiring). */
export function synthesizeDomainPageScanId(
  domainId: string,
  issueId: string,
  pageIndex: number,
): string {
  return `${PAGE_SCAN_PREFIX}${domainId}__${issueId}__${pageIndex}`
}

export function parseDomainPageScanId(
  id: string,
): { domainId: string; issueId: string; pageIndex: number } | null {
  if (!id.startsWith(PAGE_SCAN_PREFIX)) return null
  const rest = id.slice(PAGE_SCAN_PREFIX.length)
  const parts = rest.split('__')
  if (parts.length < 3) return null
  const pageIndex = Number(parts[parts.length - 1])
  if (!Number.isFinite(pageIndex) || pageIndex < 0) return null
  const issueId = parts[parts.length - 2]!
  const domainId = parts.slice(0, -2).join('__')
  if (!domainId || !issueId) return null
  return { domainId, issueId, pageIndex }
}

export function isDomainPageScanId(id: string): boolean {
  return parseDomainPageScanId(id) != null
}
