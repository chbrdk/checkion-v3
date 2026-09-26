import type {
  SeoChapterRow,
  SeoChapterViewModel,
  SeoDomainSnapshot,
  SeoKeywordIdea,
} from '@checkion-v3/contracts'
import type { Translator } from '../i18n'
import { emptySeoChapter } from './chapter-fixtures'
import { localizeSeoChapter } from './seo-market-i18n'

function fmtInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return Math.round(n).toLocaleString('de-DE')
}

function fmtTraffic(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n >= 1000) {
    const k = n / 1000
    return `${k.toFixed(k >= 10 ? 0 : 1).replace('.', ',')}k`
  }
  return String(Math.round(n))
}

function fmtCost(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n >= 1000) return `$${(n / 1000).toFixed(1).replace('.', ',')}k`
  return `$${Math.round(n)}`
}

function fmtVol(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n >= 1000) {
    return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',')}k`
  }
  return String(Math.round(n))
}

function positionBand(pos: number): 'top10' | 'mid' | 'deep' {
  if (pos <= 10) return 'top10'
  if (pos <= 20) return 'mid'
  return 'deep'
}

export function mapDomainKeywordsToRows(
  ideas: SeoKeywordIdea[],
  domain: string,
): SeoChapterRow[] {
  return ideas.map((idea, i) => {
    const pos =
      idea.difficulty != null && Number.isFinite(idea.difficulty)
        ? Math.max(1, Math.min(50, Math.round(idea.difficulty / 2)))
        : 3 + i * 4
    const band = positionBand(pos)
    const slug = idea.keyword
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    return {
      id: `live-dom-${i}-${idea.keyword}`,
      tags: [band],
      tone: pos <= 5 ? 'pos' : undefined,
      cells: {
        keyword: {
          primary: idea.keyword,
          secondary: `${domain}/${slug || 'page'}`,
        },
        volume: fmtVol(idea.searchVolume),
        position: String(pos),
        traffic: fmtTraffic(
          idea.searchVolume != null
            ? Math.round(idea.searchVolume / Math.max(2, pos))
            : null,
        ),
      },
    }
  })
}

/** Merge a live domain snapshot into an empty Domain chapter shell. */
export function buildDomainChapterModel(input: {
  projectId: string
  projectName: string
  domain: string
  seed?: string
  locale?: string
  location?: string
  recent?: string[]
  snapshot?: SeoDomainSnapshot | null
  t?: Translator
}): SeoChapterViewModel {
  const host = (input.seed || input.domain).replace(/^https?:\/\//, '').replace(/\/$/, '')
  const base = emptySeoChapter('domain', {
    projectId: input.projectId,
    projectName: input.projectName,
    domain: host,
  })
  const snap = input.snapshot
  const ideas = snap?.topKeywords ?? []
  const rows = mapDomainKeywordsToRows(ideas, host)
  const hasLive = Boolean(snap)

  const model: SeoChapterViewModel = {
    ...base,
    lede: undefined,
    domain: host,
    emptyMessage: hasLive && rows.length === 0
      ? 'No organic keywords in this snapshot.'
      : hasLive
        ? undefined
        : base.emptyMessage,
    facets: base.facets.map((f) => {
      if (f.kind === 'mode' && snap) return { ...f, value: 'Live snapshot' }
      if (f.kind === 'scope' && input.locale) {
        return {
          ...f,
          value: `${input.location ?? 'Germany'} · ${input.locale.toUpperCase()}`,
        }
      }
      return f
    }),
    searchBand: {
      seed: host,
      seedLabel: 'Domain',
      actionLabel: 'Refresh',
      locale: input.locale ?? base.searchBand?.locale ?? 'de',
      location: input.location ?? base.searchBand?.location ?? 'Germany',
      recent: input.recent ?? [],
      locales: base.searchBand?.locales,
    },
    stats: snap
      ? [
          { label: 'Organic KW', value: fmtInt(snap.organicKeywords) },
          { label: 'Traffic', value: fmtTraffic(snap.organicTraffic) },
          { label: 'Cost', value: fmtCost(snap.organicCost) },
          {
            label: 'Pages',
            value: String(rows.length),
          },
        ]
      : base.stats,
    ledgerMeta: `Top keywords · ${rows.length}`,
    pageSize: 5,
    rows,
    aside: {
      charts: base.aside?.charts,
      ledger: base.aside?.ledger
        ? {
            ...base.aside.ledger,
            meta: hasLive
              ? `${base.aside.ledger.rows.length} ranking URLs · ${host}`
              : 'No data yet',
            rows: [],
          }
        : undefined,
    },
  }
  return input.t ? localizeSeoChapter(model, input.t) : model
}
