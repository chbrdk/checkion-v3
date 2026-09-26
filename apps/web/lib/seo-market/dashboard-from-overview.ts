/**
 * Compose live SEO Overview dashboard from GET /overview.
 * Spec: specs/domain/seo-project-workspace.md § Dashboard · Phase 4
 */
import type {
  SeoDashboardCard,
  SeoDashboardViewModel,
  SeoProjectOverview,
} from '@checkion-v3/contracts'
import type { Translator } from '../i18n'
import { brandSeedFromHost, displayBrandFromHost, isJunkKeywordToken, isTrackWorthyKeyword } from './host-utils'
import { localizeSeoDashboard } from './seo-market-i18n'
import { emptySeoDashboard } from './dashboard-fixtures'

function fmtCount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(
    n,
  )
}

function hasRealDomain(domain: string): boolean {
  const d = domain.trim().toLowerCase()
  return Boolean(d) && d !== 'example.com' && d !== 'acme.example'
}

export function buildSeedHintsFromOverview(overview: SeoProjectOverview): string[] {
  const hints: string[] = []
  const brand = displayBrandFromHost(overview.domain || brandSeedFromHost(overview.domain))
  if (brand && brand !== 'brand') hints.push(brand)
  const gsc = [...(overview.gscSnapshot?.items ?? [])]
    .sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0))
    .map((r) => r.query?.trim())
    .filter(Boolean) as string[]
  for (const q of gsc) {
    if (isJunkKeywordToken(q) || !isTrackWorthyKeyword(q, overview.domain)) continue
    if (hints.some((h) => h.toLowerCase() === q.toLowerCase())) continue
    hints.push(q)
    if (hints.length >= 5) break
  }
  const fieldKws = overview.competitorSnapshot?.keywords ?? []
  for (const kw of fieldKws) {
    const t = kw.trim()
    if (!t || isJunkKeywordToken(t) || !isTrackWorthyKeyword(t, overview.domain)) continue
    if (hints.some((h) => h.toLowerCase() === t.toLowerCase())) continue
    hints.push(t)
    if (hints.length >= 5) break
  }
  const tops = overview.domainSnapshot?.topKeywords ?? []
  for (const idea of tops) {
    const kw = idea.keyword?.trim()
    if (!kw || isJunkKeywordToken(kw) || !isTrackWorthyKeyword(kw, overview.domain)) continue
    if (hints.some((h) => h.toLowerCase() === kw.toLowerCase())) continue
    hints.push(kw)
    if (hints.length >= 5) break
  }
  return hints
}

export function buildSeoDashboardFromOverview(input: {
  overview: SeoProjectOverview
  projectName: string
  t?: Translator
}): SeoDashboardViewModel {
  const { overview, projectName } = input
  const domain = overview.domain || ''
  const base = emptySeoDashboard({
    projectId: overview.projectId,
    projectName,
    domain: domain || 'example.com',
  })

  const saved = overview.savedKeywordCount > 0
  const ranks = overview.rankConfigs.length > 0
  const domainDone = hasRealDomain(domain)
  const domainSnap = overview.domainSnapshot
  const backlinks = overview.backlinkSnapshot
  const gscDone = Boolean(overview.gscConnected || overview.gscSnapshot)

  const setupSteps = base.setupSteps.map((step) => {
    if (step.id === 'domain') {
      return { ...step, status: domainDone ? ('done' as const) : ('todo' as const) }
    }
    if (step.id === 'keywords') {
      return {
        ...step,
        status: saved ? ('done' as const) : ('todo' as const),
        detail: saved
          ? `${overview.savedKeywordCount} saved · ready for Ranks / Field`
          : step.detail,
      }
    }
    if (step.id === 'rank') {
      const kwCount = overview.rankConfigs.reduce((n, c) => n + c.keywordCount, 0)
      return {
        ...step,
        status: ranks ? ('done' as const) : ('todo' as const),
        detail: ranks
          ? `${overview.rankConfigs.length} config(s) · ${kwCount} tracked`
          : step.detail,
      }
    }
    if (step.id === 'gsc') {
      return {
        ...step,
        status: gscDone ? ('done' as const) : ('todo' as const),
      }
    }
    return step
  })

  const nextStepId = setupSteps.find((s) => s.status === 'todo')?.id ?? null
  const seedHints = buildSeedHintsFromOverview(overview)

  const cards: SeoDashboardCard[] = base.cards.map((card) => {
    if (card.key === 'gsc' && overview.gscSnapshot) {
      const snap = overview.gscSnapshot
      const clicks = snap.items.reduce((s, i) => s + (i.clicks ?? 0), 0)
      const impressions = snap.items.reduce((s, i) => s + (i.impressions ?? 0), 0)
      const avgPos =
        snap.items.length > 0
          ? snap.items.reduce((s, i) => s + (i.position ?? 0), 0) / snap.items.length
          : null
      return {
        ...card,
        hasData: true,
        emptyMessage: undefined,
        emptyCtaLabel: undefined,
        facets: [
          { kind: 'source', label: 'Source', value: 'Google Search Console' },
          { kind: 'scope', label: 'Range', value: `${snap.startDate} → ${snap.endDate}` },
          { kind: 'mode', label: 'Mode', value: snap.stubbed ? 'Stub' : 'Live' },
        ],
        stats: [
          { label: 'Clicks', value: fmtCount(clicks) },
          { label: 'Impressions', value: fmtCount(impressions) },
          { label: 'Queries', value: String(snap.items.length) },
          {
            label: 'Avg position',
            value: avgPos != null ? avgPos.toFixed(1) : '—',
          },
        ],
      }
    }
    if (card.key === 'backlinks' && backlinks) {
      return {
        ...card,
        hasData: true,
        emptyMessage: undefined,
        emptyCtaLabel: undefined,
        facets: [
          { kind: 'source', label: 'Source', value: 'Backlinks' },
          {
            kind: 'time',
            label: 'Snapshot',
            value: new Date(backlinks.capturedAt).toLocaleDateString(),
          },
          { kind: 'mode', label: 'Mode', value: backlinks.stubbed ? 'Stub' : 'Live' },
        ],
        stats: [
          { label: 'DR', value: fmtCount(backlinks.rank) },
          { label: 'Backlinks', value: fmtCount(backlinks.backlinks) },
          { label: 'Ref. domains', value: fmtCount(backlinks.referringDomains) },
          {
            label: 'Lost links',
            value: fmtCount(backlinks.lostBacklinks ?? 0),
            tone: (backlinks.lostBacklinks ?? 0) > 0 ? 'neg' : 'neutral',
          },
        ],
      }
    }
    if (card.key === 'rank' && ranks) {
      const kwCount = overview.rankConfigs.reduce((n, c) => n + c.keywordCount, 0)
      const last = overview.rankConfigs
        .map((c) => c.lastCheckedAt)
        .filter(Boolean)
        .sort()
        .at(-1)
      return {
        ...card,
        hasData: true,
        emptyMessage: undefined,
        emptyCtaLabel: undefined,
        facets: [
          { kind: 'source', label: 'Source', value: 'Rank configs' },
          {
            kind: 'time',
            label: 'Last check',
            value: last ? new Date(last).toLocaleDateString() : '—',
          },
          { kind: 'mode', label: 'Mode', value: 'Live' },
        ],
        stats: [
          { label: 'Configs', value: String(overview.rankConfigs.length) },
          { label: 'Tracked', value: String(kwCount) },
          { label: 'Saved KW', value: String(overview.savedKeywordCount) },
          { label: 'Domain', value: domain || '—' },
        ],
      }
    }
    if (card.key === 'domain' && domainSnap) {
      return {
        ...card,
        hasData: true,
        emptyMessage: undefined,
        emptyCtaLabel: undefined,
        facets: [
          { kind: 'source', label: 'Source', value: 'DataForSEO organic' },
          {
            kind: 'time',
            label: 'Snapshot',
            value: new Date(domainSnap.capturedAt).toLocaleDateString(),
          },
          { kind: 'mode', label: 'Mode', value: domainSnap.stubbed ? 'Stub' : 'Live' },
        ],
        stats: [
          { label: 'Organic KW', value: fmtCount(domainSnap.organicKeywords) },
          { label: 'Traffic', value: fmtCount(domainSnap.organicTraffic) },
          { label: 'Cost', value: fmtCount(domainSnap.organicCost) },
          { label: 'Saved KW', value: String(overview.savedKeywordCount) },
        ],
      }
    }
    if (card.key === 'competitors' && overview.competitorSnapshot) {
      const snap = overview.competitorSnapshot
      const items = snap.items ?? []
      const avgOverlap =
        items.length > 0
          ? items.reduce((s, i) => s + i.overlapCount, 0) / items.length
          : 0
      const bestAvg = items
        .map((i) => i.avgRank)
        .filter((n): n is number => n != null && Number.isFinite(n))
        .sort((a, b) => a - b)[0]
      const highThreats = items.filter((i) => {
        const o = i.overlapCount
        const r = i.avgRank
        return o >= 6 || (r != null && r <= 10 && o >= 4)
      }).length
      return {
        ...card,
        hasData: true,
        emptyMessage: undefined,
        emptyCtaLabel: undefined,
        facets: [
          { kind: 'source', label: 'Job', value: 'SERP overlap' },
          {
            kind: 'scope',
            label: 'Set',
            value: `${snap.keywords.length} terms`,
          },
          {
            kind: 'time',
            label: 'Snapshot',
            value: new Date(snap.capturedAt).toLocaleDateString(),
          },
          { kind: 'mode', label: 'Mode', value: snap.stubbed ? 'Stub' : 'Live' },
        ],
        stats: [
          { label: 'Rivals', value: String(items.length) },
          { label: 'Avg overlap', value: avgOverlap ? avgOverlap.toFixed(1) : '—' },
          {
            label: 'Best avg rank',
            value: bestAvg != null ? bestAvg.toFixed(1) : '—',
            tone: bestAvg != null && bestAvg <= 10 ? 'neg' : 'neutral',
          },
          {
            label: 'High threats',
            value: String(highThreats),
            tone: highThreats > 0 ? 'neg' : 'neutral',
          },
        ],
      }
    }
    if (card.key === 'competitors' && saved) {
      return {
        ...card,
        emptyMessage: 'Analyze a keyword set from saved Research or a manual set.',
      }
    }
    return card
  })

  const model: SeoDashboardViewModel = {
    ...base,
    setupSteps,
    cards,
    nextStepId,
    seedHints,
  }
  // Localize labels; keep status/hasData from live overview.
  return input.t ? localizeSeoDashboard(model, input.t) : model
}
