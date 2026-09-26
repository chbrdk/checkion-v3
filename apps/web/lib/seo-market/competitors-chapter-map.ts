import type {
  SeoBacklinkCompetitorRow,
  SeoChapterRow,
  SeoChapterViewModel,
  SeoCompetitorRow,
  SeoCompetitorsResult,
} from '@checkion-v3/contracts'
import type { Translator } from '../i18n'
import { emptySeoChapter } from './chapter-fixtures'
import { localizeSeoChapter } from './seo-market-i18n'

function fmtInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return Math.round(n).toLocaleString('de-DE')
}

function fmtAvgRank(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toFixed(1).replace('.', ',')
}

function fmtOverlap(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return String(Math.round(n))
}

function threatBand(
  overlap: number,
  avgRank: number | null,
): { tag: 'high' | 'mid' | 'low'; label: string } {
  if (overlap >= 6 || (avgRank != null && avgRank <= 10 && overlap >= 4)) {
    return { tag: 'high', label: 'High' }
  }
  if (overlap >= 3) return { tag: 'mid', label: 'Mid' }
  return { tag: 'low', label: 'Low' }
}

function shortHost(host: string): string {
  return host.replace(/^www\./, '').split('.')[0] || host
}

export function mapCompetitorRows(
  items: SeoCompetitorRow[],
  keywords: string[],
): SeoChapterRow[] {
  const sample = keywords.slice(0, 3).join(' · ') || 'shared SERP terms'
  return items
    .slice()
    .sort((a, b) => b.overlapCount - a.overlapCount)
    .map((item, i) => {
      const band = threatBand(item.overlapCount, item.avgRank)
      return {
        id: `live-comp-${i}-${item.domain}`,
        tags: [band.tag],
        tone: band.tag === 'high' ? 'neg' : undefined,
        cells: {
          domain: {
            primary: item.domain,
            secondary: `${item.overlapCount} KW · ${sample}`,
          },
          overlap: fmtOverlap(item.overlapCount),
          avgRank: fmtAvgRank(item.avgRank),
          threat: band.label,
        },
      }
    })
}

function battlesFromRows(rows: SeoChapterRow[]): SeoChapterRow[] {
  return rows
    .filter((r) => r.tags?.includes('high') || r.tags?.includes('mid'))
    .slice(0, 6)
    .map((r) => {
      const primary =
        typeof r.cells.domain === 'object' && r.cells.domain
          ? r.cells.domain.primary
          : String(r.cells.domain ?? '')
      return {
        id: `battle-${r.id}`,
        tone: r.tone,
        cells: {
          keyword: {
            primary,
            secondary: `overlap ${r.cells.overlap ?? '—'} · avg ${r.cells.avgRank ?? '—'}`,
          },
          gap: r.cells.threat === 'High' ? '▼ high' : '▼ mid',
        },
      }
    })
}

function overlapPoints(rows: SeoChapterRow[]) {
  return rows.slice(0, 5).map((r) => {
    const label =
      typeof r.cells.domain === 'object' && r.cells.domain
        ? shortHost(r.cells.domain.primary)
        : shortHost(String(r.cells.domain ?? ''))
    const value = Number.parseInt(String(r.cells.overlap ?? '0'), 10)
    return { label, value: Number.isFinite(value) ? value : 0 }
  })
}

/** Merge live SERP-overlap result into the Competitors chapter shell. */
export function buildCompetitorsChapterModel(input: {
  projectId: string
  projectName: string
  domain: string
  seed?: string
  locale?: string
  location?: string
  recent?: string[]
  suggestions?: string[] | null
  result?: SeoCompetitorsResult | null
  /** Optional link competitors from latest backlink snapshot (secondary aside). */
  linkCompetitors?: SeoBacklinkCompetitorRow[] | null
  t?: Translator
}): SeoChapterViewModel {
  const base = emptySeoChapter('competitors', {
    projectId: input.projectId,
    projectName: input.projectName,
    domain: input.domain,
  })
  const result = input.result
  const keywords = result?.keywords?.length
    ? result.keywords
    : (input.seed ?? '')
        .split(/[,;]+/)
        .map((k) => k.trim())
        .filter(Boolean)
  const rows = result?.items?.length
    ? mapCompetitorRows(result.items, keywords)
    : []
  const overlaps = rows
    .map((r) => Number.parseInt(String(r.cells.overlap ?? ''), 10))
    .filter((n) => Number.isFinite(n))
  const ranks = rows
    .map((r) => Number.parseFloat(String(r.cells.avgRank ?? '').replace(',', '.')))
    .filter((n) => Number.isFinite(n))
  const high = rows.filter((r) => r.tags?.includes('high')).length
  const avg = (xs: number[]) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
  const best = ranks.length ? Math.min(...ranks) : null
  const seed =
    input.seed ||
    (keywords.length ? keywords.slice(0, 3).join(', ') : null) ||
    base.searchBand?.seed ||
    'brand'
  const battles = result?.items?.length ? battlesFromRows(rows) : []
  const livePoints = result?.items?.length ? overlapPoints(rows) : []
  const hasLive = Boolean(result)
  const linkCompetitors = (input.linkCompetitors ?? []).slice(0, 8)
  const linkLedger =
    linkCompetitors.length > 0
      ? {
          title: 'Link competitors',
          meta: `${linkCompetitors.length} rivals`,
          columns: [
            { key: 'domain', label: 'Rival', dual: true as const },
            { key: 'overlap', label: 'Intersect', align: 'end' as const },
            { key: 'score', label: 'DR', align: 'end' as const },
          ],
          rows: linkCompetitors.map((c) => ({
            id: c.id,
            cells: {
              domain: {
                primary: c.domain,
                secondary:
                  fmtInt(c.backlinks) !== '—'
                    ? `${fmtInt(c.backlinks)} links`
                    : '—',
              },
              overlap: fmtInt(c.intersections),
              score: fmtInt(c.rank),
            },
          })),
        }
      : undefined

  const model: SeoChapterViewModel = {
    ...base,
    lede: undefined,
    emptyMessage:
      hasLive && rows.length === 0
        ? 'No overlapping rivals for this keyword set.'
        : hasLive
          ? undefined
          : base.emptyMessage,
    facets: base.facets.map((f) => {
      if (f.kind === 'mode' && result) return { ...f, value: 'Live overlap' }
      if (f.kind === 'scope' && hasLive) {
        const n = keywords.length || rows.length
        const loc = (input.locale ?? 'de').toUpperCase()
        return { ...f, value: `${n} terms · ${loc}` }
      }
      if (f.kind === 'time' && result?.fetchedAt) {
        return {
          ...f,
          value: new Date(result.fetchedAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          }),
        }
      }
      return f
    }),
    searchBand: {
      seed,
      seedLabel: 'Keyword set',
      actionLabel: 'Analyze',
      allowEmptySeed: true,
      locale: input.locale ?? base.searchBand?.locale ?? 'de',
      location: input.location ?? base.searchBand?.location ?? 'Germany',
      recent: input.recent ?? [],
      suggestions: input.suggestions?.length ? input.suggestions : undefined,
      suggestionsLabel: input.suggestions?.length ? 'Suggestions' : undefined,
      locales: base.searchBand?.locales,
    },
    stats: hasLive
      ? [
          { label: 'Rivals', value: String(rows.length) },
          {
            label: 'Avg overlap',
            value:
              avg(overlaps) != null
                ? avg(overlaps)!.toFixed(1).replace('.', ',')
                : '—',
          },
          {
            label: 'Best avg rank',
            value: best != null ? best.toFixed(1).replace('.', ',') : '—',
            tone: best != null && best <= 10 ? 'neg' : undefined,
          },
          {
            label: 'High threats',
            value: String(high),
            tone: high > 0 ? 'neg' : undefined,
          },
        ]
      : base.stats,
    ledgerMeta: `Rival domains · ${rows.length}`,
    pageSize: 5,
    rows,
    aside: {
      charts: [
        {
          kind: 'plot',
          variant: 'bar',
          title: 'Overlap by rival',
          height: 168,
          points: livePoints,
        },
        ...(base.aside?.charts?.filter((c) => c.kind === 'series') ?? []),
      ],
      ledger: {
        title: 'Battles they win',
        meta: battles.length
          ? `${battles.length} pressure points`
          : 'No battles yet',
        columns: base.aside?.ledger?.columns ?? [
          { key: 'keyword', label: 'Keyword', dual: true },
          { key: 'gap', label: 'Gap', align: 'end' },
        ],
        rows: battles,
      },
      ledgers: linkLedger ? [linkLedger] : undefined,
    },
  }
  return input.t ? localizeSeoChapter(model, input.t) : model
}
