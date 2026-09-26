import type {
  SeoChapterRow,
  SeoChapterViewModel,
  SeoKeywordIdea,
  SeoSerpResult,
} from '@checkion-v3/contracts'
import type { Translator } from '../i18n'
import { emptySeoChapter } from './chapter-fixtures'
import { brandSeedFromHost } from './host-utils'
import { localizeSeoChapter } from './seo-market-i18n'

function fmtVol(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',')}k`
  return String(Math.round(n))
}

function fmtCpc(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toFixed(2).replace('.', ',')
}

function fmtComp(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toFixed(2).replace('.', ',')
}

function intentTag(intent?: string | null): 'info' | 'trans' {
  const v = (intent ?? '').toLowerCase()
  if (v.includes('trans') || v.includes('commercial') || v.includes('buy')) return 'trans'
  return 'info'
}

function scoreFromIdea(idea: SeoKeywordIdea): string {
  if (idea.difficulty != null && Number.isFinite(idea.difficulty)) {
    return String(Math.round(idea.difficulty))
  }
  if (idea.searchVolume != null) {
    return String(Math.min(99, Math.round(Math.log10(Math.max(10, idea.searchVolume)) * 8)))
  }
  return '0'
}

export function mapKeywordIdeasToRows(ideas: SeoKeywordIdea[]): SeoChapterRow[] {
  return ideas.map((idea, i) => {
    const tag = intentTag(idea.intent)
    return {
      id: `live-kw-${i}-${idea.keyword}`,
      tags: [tag],
      cells: {
        keyword: idea.keyword,
        volume: fmtVol(idea.searchVolume),
        cpc: fmtCpc(idea.cpc),
        comp: fmtComp(idea.competition),
        score: scoreFromIdea(idea),
        intent: tag === 'trans' ? 'Trans' : 'Info',
      },
    }
  })
}

export function mapSerpToAsideRows(serp: SeoSerpResult): SeoChapterRow[] {
  return serp.items.map((item) => ({
    id: `serp-${item.rank}-${item.url}`,
    cells: {
      rank: String(item.rank),
      page: {
        primary: item.title || item.domain,
        secondary: item.url || item.domain,
      },
    },
    tone: item.rank <= 3 ? 'pos' : undefined,
  }))
}

/** Merge live research/SERP into an empty Research chapter shell (no fixture rows). */
export function buildKeywordsChapterModel(input: {
  projectId: string
  projectName: string
  domain: string
  seed: string
  locale?: string
  location?: string
  recent?: string[]
  ideas?: SeoKeywordIdea[]
  serp?: SeoSerpResult | null
  t?: Translator
}): SeoChapterViewModel {
  const base = emptySeoChapter('keywords', {
    projectId: input.projectId,
    projectName: input.projectName,
    domain: input.domain,
  })
  const ideas = input.ideas ?? []
  const rows = mapKeywordIdeasToRows(ideas)
  const volumes = ideas
    .map((i) => i.searchVolume)
    .filter((n): n is number => n != null && Number.isFinite(n))
  const cpcs = ideas
    .map((i) => i.cpc)
    .filter((n): n is number => n != null && Number.isFinite(n))
  const comps = ideas
    .map((i) => i.competition)
    .filter((n): n is number => n != null && Number.isFinite(n))
  const avg = (xs: number[]) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null

  const serpRows = input.serp ? mapSerpToAsideRows(input.serp) : []
  const hasLive = ideas.length > 0 || serpRows.length > 0

  const model: SeoChapterViewModel = {
    ...base,
    lede: undefined,
    emptyMessage: hasLive ? undefined : base.emptyMessage,
    facets: base.facets.map((f) =>
      f.kind === 'mode' && hasLive
        ? { ...f, value: 'Live research' }
        : f,
    ),
    searchBand: {
      seed: input.seed || base.searchBand?.seed || brandSeedFromHost(input.domain),
      seedLabel: 'Seed',
      actionLabel: 'Research',
      locale: input.locale ?? base.searchBand?.locale ?? 'de',
      location: input.location ?? base.searchBand?.location ?? 'Germany',
      recent: input.recent ?? [],
      locales: base.searchBand?.locales,
    },
    stats: [
      { label: 'Ideas', value: String(rows.length) },
      { label: 'Avg volume', value: fmtVol(avg(volumes)) },
      { label: 'Avg CPC', value: fmtCpc(avg(cpcs)) },
      { label: 'Avg Comp', value: fmtComp(avg(comps)) },
    ],
    ledgerMeta: `Ideas · ${rows.length}`,
    pageSize: 25,
    rows,
    aside: {
      charts: base.aside?.charts,
      ledger: {
        title: 'SERP snapshot',
        meta: serpRows.length
          ? `${serpRows.length} organic results${input.seed ? ` · ${input.seed}` : ''}`
          : 'No SERP yet',
        columns: base.aside?.ledger?.columns ?? [
          { key: 'rank', label: '#', align: 'end' },
          { key: 'page', label: 'Page', dual: true },
        ],
        rows: serpRows,
      },
    },
  }
  return input.t ? localizeSeoChapter(model, input.t) : model
}
