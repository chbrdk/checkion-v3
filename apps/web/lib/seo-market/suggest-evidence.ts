/**
 * Market Suggest Evidence — fail-soft corpus for Phase 6 recommendations.
 * Spec: specs/domain/seo-market-suggest-agent.md § Phase 6
 */
import type {
  SeoCompetitorSnapshot,
  SeoDomainSnapshot,
  SeoGscPerformanceRow,
  SeoRankConfig,
} from '@checkion-v3/contracts'
import { listDomainScans, getDomainOverview } from '../fixtures/scan-store'
import { displayBrandFromHost, isJunkKeywordToken, isTrackWorthyKeyword } from './host-utils'
import {
  latestCompetitorSnapshot,
  latestDomainSnapshot,
  latestGscSnapshot,
  listRankConfigs,
  listSavedKeywords,
} from './project-store'

export type SuggestEvidence = {
  brand: string
  savedKeywords: string[]
  domainTops: string[]
  trackedKeywords: string[]
  fieldKeywords: string[]
  fieldRivals: string[]
  gscQueries: string[]
  qualityGaps: string[]
  usedField: boolean
  usedGsc: boolean
  usedQuality: boolean
}

function uniq(items: string[], max: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of items) {
    const t = raw.trim()
    if (!t) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
    if (out.length >= max) break
  }
  return out
}

/** Map domain-scan SEO coverage + issues into short gap themes (no ranking claims). */
export function qualityGapsFromOverview(input: {
  seoCoverage?: {
    totalPages?: number
    withTitle?: number
    withH1?: number
    withMetaDescription?: number
    withCanonical?: number
    duplicateTitleGroupCount?: number
    canonicalMismatchCount?: number
  } | null
  topIssues?: Array<{ section?: string; title?: string; label?: string }>
}): string[] {
  const gaps: string[] = []
  const cov = input.seoCoverage
  if (cov && typeof cov.totalPages === 'number' && cov.totalPages > 0) {
    const total = cov.totalPages
    const missingTitle = total - (cov.withTitle ?? total)
    const missingH1 = total - (cov.withH1 ?? total)
    const missingMeta = total - (cov.withMetaDescription ?? total)
    const missingCanon = total - (cov.withCanonical ?? total)
    if (missingTitle > 0) gaps.push(`missing title tags (${missingTitle} pages)`)
    if (missingH1 > 0) gaps.push(`missing H1 (${missingH1} pages)`)
    if (missingMeta > 0) gaps.push(`missing meta description (${missingMeta} pages)`)
    if (missingCanon > 0) gaps.push(`missing canonical (${missingCanon} pages)`)
    if ((cov.duplicateTitleGroupCount ?? 0) > 0) {
      gaps.push(`duplicate titles (${cov.duplicateTitleGroupCount} groups)`)
    }
    if ((cov.canonicalMismatchCount ?? 0) > 0) {
      gaps.push(`canonical mismatches (${cov.canonicalMismatchCount})`)
    }
  }
  for (const issue of input.topIssues ?? []) {
    const label = (issue.title || issue.label || '').trim()
    if (label) gaps.push(label.slice(0, 120))
    if (gaps.length >= 6) break
  }
  return uniq(gaps, 6)
}

export async function resolveQualityGaps(projectId: string): Promise<string[]> {
  try {
    const scans = await listDomainScans(projectId, { limit: 20 })
    const completed = scans
      .filter((s) => s.status === 'completed')
      .sort((a, b) =>
        String(b.completedAt ?? b.startedAt ?? '').localeCompare(
          String(a.completedAt ?? a.startedAt ?? ''),
        ),
      )
    const latest = completed[0]
    if (!latest) return []
    const overview = await getDomainOverview(latest.id)
    if (!overview) return []
    return qualityGapsFromOverview({
      seoCoverage: overview.seoCoverage,
      topIssues: (overview.systemicIssues ?? []).map((i) => ({
        title: i.title,
      })),
    })
  } catch {
    return []
  }
}

export function seedHintsFromEvidence(evidence: SuggestEvidence, max = 5): string[] {
  return uniq(
    [
      evidence.brand !== 'brand' ? evidence.brand : '',
      ...evidence.gscQueries,
      ...evidence.domainTops,
      ...evidence.fieldKeywords,
      ...evidence.savedKeywords,
    ].filter((k) => k && !isJunkKeywordToken(k)),
    max,
  )
}

export function evidenceKeywordPool(evidence: SuggestEvidence, domain?: string): string[] {
  const host = domain || evidence.brand
  return uniq(
    [
      ...evidence.gscQueries,
      ...evidence.domainTops,
      ...evidence.fieldKeywords,
      ...evidence.savedKeywords,
      ...evidence.trackedKeywords,
    ].filter((k) => {
      if (isJunkKeywordToken(k)) return false
      if (domain && !isTrackWorthyKeyword(k, domain) && k.toLowerCase() !== evidence.brand.toLowerCase()) {
        return false
      }
      return true
    }),
    24,
  )
}

export function formatEvidenceForPrompt(evidence: SuggestEvidence, surface: string): string {
  const lines = [
    `Evidence surface bias: ${surface}`,
    evidence.fieldRivals.length
      ? `Field rivals (SERP overlap): ${evidence.fieldRivals.join(', ')}`
      : null,
    evidence.fieldKeywords.length
      ? `Field analyzed keywords: ${evidence.fieldKeywords.join(', ')}`
      : null,
    evidence.gscQueries.length
      ? `GSC top queries (clicks): ${evidence.gscQueries.join(', ')}`
      : null,
    evidence.domainTops.length
      ? `Domain organic tops: ${evidence.domainTops.join(', ')}`
      : null,
    evidence.trackedKeywords.length
      ? `Already tracked: ${evidence.trackedKeywords.join(', ')}`
      : null,
    evidence.savedKeywords.length
      ? `Saved research: ${evidence.savedKeywords.join(', ')}`
      : null,
    evidence.qualityGaps.length
      ? `Quality SEO gaps: ${evidence.qualityGaps.join('; ')}`
      : null,
  ]
  return lines.filter(Boolean).join('\n')
}

export async function gatherSuggestEvidence(input: {
  projectId: string
  domain: string
}): Promise<SuggestEvidence> {
  const brand = displayBrandFromHost(input.domain)
  const [savedRows, domainSnap, fieldSnap, configs, gscSnap, qualityGaps] = await Promise.all([
    listSavedKeywords(input.projectId).catch(() => [] as Awaited<ReturnType<typeof listSavedKeywords>>),
    latestDomainSnapshot(input.projectId).catch(() => null as SeoDomainSnapshot | null),
    latestCompetitorSnapshot(input.projectId).catch(() => null as SeoCompetitorSnapshot | null),
    listRankConfigs(input.projectId).catch(() => [] as SeoRankConfig[]),
    latestGscSnapshot(input.projectId).catch(() => null),
    resolveQualityGaps(input.projectId),
  ])

  const savedKeywords = uniq(
    savedRows.map((r) => r.keyword),
    12,
  )
  const domainTops = uniq(
    (domainSnap?.topKeywords ?? []).map((k) => k.keyword).filter(Boolean),
    12,
  )
  const trackedKeywords = uniq(
    configs.flatMap((c) => c.keywords),
    12,
  )
  const fieldKeywords = uniq(fieldSnap?.keywords ?? [], 8)
  const fieldRivals = uniq(
    (fieldSnap?.items ?? []).map((i) => i.domain),
    8,
  )
  const gscQueries = uniq(
    ((gscSnap?.items ?? []) as SeoGscPerformanceRow[])
      .slice()
      .sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0))
      .map((r) => r.query),
    12,
  )

  return {
    brand,
    savedKeywords,
    domainTops,
    trackedKeywords,
    fieldKeywords,
    fieldRivals,
    gscQueries,
    qualityGaps,
    usedField: fieldKeywords.length > 0 || fieldRivals.length > 0,
    usedGsc: gscQueries.length > 0,
    usedQuality: qualityGaps.length > 0,
  }
}
