import type {
  SeoChapterChart,
  SeoChapterId,
  SeoChapterViewModel,
  SeoDashboardViewModel,
} from '@checkion-v3/contracts'
import type { Translator } from '../i18n'

const COLUMN_I18N: Record<string, string> = {
  keyword: 'seoMarket.columns.keyword',
  volume: 'seoMarket.columns.volume',
  cpc: 'seoMarket.columns.cpc',
  comp: 'seoMarket.columns.comp',
  score: 'seoMarket.columns.score',
  intent: 'seoMarket.columns.intent',
  position: 'seoMarket.columns.position',
  previous: 'seoMarket.columns.previous',
  change: 'seoMarket.columns.change',
  device: 'seoMarket.columns.device',
  checked: 'seoMarket.columns.checked',
  traffic: 'seoMarket.columns.traffic',
  domain: 'seoMarket.columns.domain',
  overlap: 'seoMarket.columns.overlap',
  avgRank: 'seoMarket.columns.avgRank',
  threat: 'seoMarket.columns.threat',
  query: 'seoMarket.columns.query',
  page: 'seoMarket.columns.page',
  rank: 'seoMarket.columns.rank',
  gap: 'seoMarket.columns.gap',
}

const FILTER_I18N: Record<string, string> = {
  all: 'seoMarket.filters.all',
  up: 'seoMarket.filters.up',
  down: 'seoMarket.filters.down',
  top10: 'seoMarket.filters.top10',
  mid: 'seoMarket.filters.mid',
  deep: 'seoMarket.filters.deep',
  high: 'seoMarket.filters.high',
  low: 'seoMarket.filters.low',
  info: 'seoMarket.filters.info',
  trans: 'seoMarket.filters.trans',
  dofollow: 'seoMarket.filters.dofollow',
  nofollow: 'seoMarket.filters.nofollow',
}

const STAT_I18N: Record<string, string> = {
  Ideas: 'seoMarket.stats.ideas',
  'Avg volume': 'seoMarket.stats.avgVolume',
  'Avg CPC': 'seoMarket.stats.avgCpc',
  'Avg Comp': 'seoMarket.stats.avgComp',
  'Organic KW': 'seoMarket.stats.organicKw',
  Traffic: 'seoMarket.stats.traffic',
  Cost: 'seoMarket.stats.cost',
  Pages: 'seoMarket.stats.pages',
  Monitored: 'seoMarket.stats.monitored',
  'Top 10': 'seoMarket.stats.top10',
  Improved: 'seoMarket.stats.improved',
  Declined: 'seoMarket.stats.declined',
  Rivals: 'seoMarket.stats.rivals',
  'Avg overlap': 'seoMarket.stats.avgOverlap',
  'Best avg rank': 'seoMarket.stats.bestAvgRank',
  'High threats': 'seoMarket.stats.highThreats',
  Clicks: 'seoMarket.stats.clicks',
  Impressions: 'seoMarket.stats.impressions',
  CTR: 'seoMarket.stats.ctr',
  'Avg position': 'seoMarket.stats.avgPosition',
  DR: 'seoMarket.stats.dr',
  Backlinks: 'seoMarket.stats.backlinks',
  'Ref. domains': 'seoMarket.stats.refDomains',
  'Lost links': 'seoMarket.stats.lostLinks',
  Ideen: 'seoMarket.stats.ideas',
  Überwacht: 'seoMarket.stats.monitored',
  Rivalen: 'seoMarket.stats.rivals',
}

const CHART_I18N: Record<string, string> = {
  'Position distribution': 'seoMarket.charts.positionDistribution',
  'Overlap by rival': 'seoMarket.charts.overlapByRival',
  'New & lost backlinks': 'seoMarket.charts.newLostBacklinks',
  'Referring domains': 'seoMarket.charts.referringDomains',
  'Ref. domains by TLD': 'seoMarket.charts.tldDistribution',
  Positionsverteilung: 'seoMarket.charts.positionDistribution',
  'Overlap nach Rivale': 'seoMarket.charts.overlapByRival',
}

/** Localize chapter chrome (title, columns, filters, search band, empty copy). */
export function localizeSeoChapter(
  model: SeoChapterViewModel,
  t: Translator,
): SeoChapterViewModel {
  const id = model.chapter as SeoChapterId
  const trackedKeyword =
    id === 'rank-tracking' ? t('seoMarket.columns.tracked') : t('seoMarket.columns.keyword')

  const emptyMessage = (() => {
    if (!model.emptyMessage) return model.emptyMessage
    if (
      model.emptyMessage === 'No organic keywords in this snapshot.' ||
      model.emptyMessage.includes('organic keywords in this snapshot') ||
      model.emptyMessage.includes('organischen Keywords in diesem Snapshot')
    ) {
      return t('seoMarket.chapters.domain.emptySnapshot')
    }
    if (
      model.emptyMessage === 'Summary loaded — no referring pages in this capture.' ||
      model.emptyMessage.includes('no referring pages') ||
      model.emptyMessage.includes('keine Referring Pages')
    ) {
      return t('seoMarket.chapters.backlinks.emptySummary')
    }
    if (
      model.emptyMessage === 'No overlapping rivals for this keyword set.' ||
      model.emptyMessage.includes('overlapping rivals') ||
      model.emptyMessage.includes('überlappenden Rivalen')
    ) {
      return t('seoMarket.chapters.competitors.emptyOverlap')
    }
    return t(`seoMarket.chapters.${id}.empty`)
  })()

  return {
    ...model,
    title: t(`seoMarket.chapters.${id}.title`),
    emptyMessage,
    columns: model.columns.map((col) => ({
      ...col,
      label:
        col.key === 'keyword'
          ? trackedKeyword
          : COLUMN_I18N[col.key]
            ? t(COLUMN_I18N[col.key]!)
            : col.label,
    })),
    filters: model.filters?.map((f) => {
      const key =
        f.id === 'mid' && id === 'competitors'
          ? 'seoMarket.filters.midThreat'
          : FILTER_I18N[f.id]
      return key ? { ...f, label: t(key) } : f
    }),
    stats: model.stats?.map((s) => {
      const key = STAT_I18N[s.label]
      return key ? { ...s, label: t(key) } : s
    }),
    ledgerMeta: ledgerMetaFor(id, model.rows.length, t, model.ledgerMeta),
    facets: model.facets.map((f) => localizeFacet(f, t)),
    searchBand: model.searchBand
      ? {
          ...model.searchBand,
          seedLabel: seedLabelFor(id, t, model.searchBand.seedLabel),
          actionLabel: actionLabelFor(id, t, model.searchBand.actionLabel),
          location:
            !model.searchBand.location ||
            model.searchBand.location === 'Germany' ||
            model.searchBand.location === 'Deutschland'
              ? t('seoMarket.locations.germany')
              : model.searchBand.location,
        }
      : undefined,
    charts: model.charts?.map((c) => localizeChart(c, t)),
    aside: model.aside
      ? {
          charts: model.aside.charts?.map((c) => localizeChart(c, t)),
          ledger: model.aside.ledger
            ? {
                ...model.aside.ledger,
                title: asideTitleFor(id, model.aside.ledger.title, t),
                meta: asideMetaFor(id, model.aside.ledger, t),
                columns: model.aside.ledger.columns.map((col) => ({
                  ...col,
                  label:
                    col.key === 'keyword' && id === 'rank-tracking'
                      ? t('seoMarket.columns.tracked')
                      : COLUMN_I18N[col.key]
                        ? t(COLUMN_I18N[col.key]!)
                        : col.label,
                })),
              }
            : undefined,
        }
      : undefined,
  }
}

function localizeFacet(
  f: SeoChapterViewModel['facets'][number],
  t: Translator,
): SeoChapterViewModel['facets'][number] {
  const labelKey =
    f.kind === 'mode'
      ? 'seoMarket.facets.mode'
      : f.kind === 'source'
        ? 'seoMarket.facets.source'
        : f.kind === 'job'
          ? 'seoMarket.facets.job'
          : f.kind === 'scope'
            ? 'seoMarket.facets.scope'
            : f.kind === 'time'
              ? 'seoMarket.facets.time'
              : null
  if (f.kind === 'mode') {
    const modeValue =
      f.value === 'Empty' || f.value === 'Leer'
        ? t('seoMarket.facets.empty')
        : f.value === 'Live research' || f.value === 'Live-Research'
          ? t('seoMarket.facets.liveResearch')
          : f.value === 'Live snapshot' || f.value === 'Live-Snapshot'
            ? t('seoMarket.facets.liveSnapshot')
            : f.value === 'Live config' || f.value === 'Live-Config'
              ? t('seoMarket.facets.liveConfig')
              : f.value === 'Live overlap' || f.value === 'Live-Overlap'
                ? t('seoMarket.facets.liveOverlap')
                : f.value
    return {
      ...f,
      label: t('seoMarket.facets.mode'),
      value: modeValue,
    }
  }
  return labelKey ? { ...f, label: t(labelKey) } : f
}

function localizeChart(chart: SeoChapterChart, t: Translator): SeoChapterChart {
  if (!('title' in chart) || !chart.title) return chart
  const key = CHART_I18N[chart.title]
  return key ? { ...chart, title: t(key) } : chart
}

function ledgerMetaFor(
  id: SeoChapterId,
  count: number,
  t: Translator,
  fallback?: string,
): string | undefined {
  if (!fallback) return fallback
  switch (id) {
    case 'keywords':
      return t('seoMarket.ledger.ideas', { count })
    case 'domain':
      return t('seoMarket.ledger.topKeywords', { count })
    case 'rank-tracking':
      return t('seoMarket.ledger.monitoredSet', { count })
    case 'competitors':
      return t('seoMarket.ledger.rivalDomains', { count })
    case 'backlinks':
      return t('seoMarket.ledger.backlinks', { count })
    default:
      return fallback
  }
}

function asideMetaFor(
  id: SeoChapterId,
  ledger: NonNullable<NonNullable<SeoChapterViewModel['aside']>['ledger']>,
  t: Translator,
): string | undefined {
  const meta = ledger.meta
  if (!meta) return meta
  if (meta === 'No data yet' || meta === 'Noch keine Daten') {
    return t('seoMarket.ledger.noData')
  }
  if (meta === 'No SERP yet' || meta === 'Noch kein SERP') {
    return t('seoMarket.ledger.serpEmpty')
  }
  if (meta === 'No battles yet' || meta === 'Noch keine Battles') {
    return t('seoMarket.ledger.battlesEmpty')
  }
  if (meta === 'No movers yet' || meta === 'Noch keine Bewegungen') {
    return t('seoMarket.ledger.moversEmpty')
  }
  if (id === 'keywords' || /organic results|organische Treffer/i.test(meta)) {
    return t('seoMarket.ledger.serpMeta', { count: ledger.rows.length })
  }
  if (id === 'competitors' || /pressure|Druckpunkte/i.test(meta)) {
    return t('seoMarket.ledger.battlesMeta', { count: ledger.rows.length })
  }
  if (id === 'rank-tracking' || /movers|Movers|Bewegungen/i.test(meta)) {
    return t('seoMarket.ledger.moversMeta', { count: ledger.rows.length })
  }
  return meta
}

function seedLabelFor(id: SeoChapterId, t: Translator, fallback?: string): string {
  switch (id) {
    case 'domain':
    case 'backlinks':
      return t('seoMarket.seed.domain')
    case 'competitors':
      return t('seoMarket.seed.keywordSet')
    case 'rank-tracking':
      return t('seoMarket.seed.addToTrack')
    case 'keywords':
      return t('seoMarket.seed.seed')
    default:
      return fallback ?? t('seoMarket.seed.seed')
  }
}

function actionLabelFor(id: SeoChapterId, t: Translator, fallback?: string): string {
  switch (id) {
    case 'domain':
    case 'backlinks':
      return t('seoMarket.actions.refresh')
    case 'competitors':
      return t('seoMarket.actions.analyze')
    case 'rank-tracking':
      return t('seoMarket.actions.trackCheck')
    case 'keywords':
      return t('seoMarket.actions.research')
    default:
      return fallback ?? t('seoMarket.actions.search')
  }
}

function asideTitleFor(id: SeoChapterId, current: string, t: Translator): string {
  if (id === 'keywords' || /serp/i.test(current)) return t('seoMarket.ledger.serpSnapshot')
  if (id === 'competitors' || /battle/i.test(current)) return t('seoMarket.ledger.battles')
  if (id === 'rank-tracking' || /mover|Bewegung/i.test(current)) return t('seoMarket.ledger.movers')
  return current
}

export function localizeSeoDashboard(
  model: SeoDashboardViewModel,
  t: Translator,
): SeoDashboardViewModel {
  return {
    ...model,
    setupSteps: model.setupSteps.map((step) => {
      if (step.id === 'domain') {
        return {
          ...step,
          label: t('seoMarket.dashboard.steps.domain'),
          detail:
            model.domain && model.domain !== 'example.com'
              ? t('seoMarket.dashboard.steps.domainDetail', { domain: model.domain })
              : t('seoMarket.dashboard.steps.domainDetailMissing'),
        }
      }
      if (step.id === 'keywords') {
        return {
          ...step,
          label: t('seoMarket.dashboard.steps.keywords'),
          detail: t('seoMarket.dashboard.steps.keywordsDetail'),
        }
      }
      if (step.id === 'rank') {
        return {
          ...step,
          label: t('seoMarket.dashboard.steps.rank'),
          detail: t('seoMarket.dashboard.steps.rankDetail'),
        }
      }
      if (step.id === 'gsc') {
        return {
          ...step,
          label: t('seoMarket.dashboard.steps.gsc'),
          detail: t('seoMarket.dashboard.steps.gscDetail'),
        }
      }
      return step
    }),
    cards: model.cards.map((card) => {
      const titleKey = `seoMarket.dashboard.cards.${card.key}`
      const emptyKey = `seoMarket.dashboard.emptyMessage.${card.key}`
      const ctaKey = `seoMarket.dashboard.emptyCta.${card.key}`
      return {
        ...card,
        title: t(titleKey),
        emptyMessage: card.emptyMessage ? t(emptyKey) : card.emptyMessage,
        emptyCtaLabel: card.emptyCtaLabel ? t(ctaKey) : card.emptyCtaLabel,
        facets: (card.facets ?? []).map((f) =>
          f.kind === 'mode'
            ? {
                ...f,
                label: t('seoMarket.facets.mode'),
                value: t('seoMarket.facets.empty'),
              }
            : localizeFacet(f as SeoChapterViewModel['facets'][number], t),
        ),
      }
    }),
  }
}
