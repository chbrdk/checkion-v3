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
import { brandSeedFromHost, displayBrandFromHost } from './host-utils'
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
  const tops = overview.domainSnapshot?.topKeywords ?? []
  for (const idea of tops) {
    const kw = idea.keyword?.trim()
    if (!kw) continue
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
    return step
  })

  const nextStepId = setupSteps.find((s) => s.status === 'todo')?.id ?? null
  const seedHints = buildSeedHintsFromOverview(overview)

  const cards: SeoDashboardCard[] = base.cards.map((card) => {
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
