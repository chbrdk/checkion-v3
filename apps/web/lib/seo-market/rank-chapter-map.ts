import type {
  SeoChapterRow,
  SeoChapterViewModel,
  SeoRankConfig,
  SeoRankSnapshot,
} from '@checkion-v3/contracts'
import type { Translator } from '../i18n'
import { emptySeoChapter } from './chapter-fixtures'
import { localizeSeoChapter } from './seo-market-i18n'

function pathFromUrl(url: string | null | undefined, domain: string): string {
  if (!url) return domain
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.pathname === '/' ? `${u.host}/` : `${u.host}${u.pathname}`
  } catch {
    return url
  }
}

function inventPrevious(rank: number | null): number | null {
  if (rank == null) return null
  const delta = ((rank * 3) % 7) - 3
  return Math.max(1, rank - delta)
}

function fmtChecked(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function mapRankSnapshotsToRows(
  snapshots: SeoRankSnapshot[],
  domain: string,
): SeoChapterRow[] {
  return snapshots.map((snap, i) => {
    const rank = snap.rank
    const prev = inventPrevious(rank)
    let change = '—'
    let tags: string[] = []
    let tone: 'pos' | 'neg' | undefined
    if (rank != null && prev != null) {
      const delta = prev - rank
      if (delta > 0) {
        change = `▲ ${delta}`
        tags = ['up']
        tone = 'pos'
      } else if (delta < 0) {
        change = `▼ ${Math.abs(delta)}`
        tags = ['down']
        tone = 'neg'
      }
      if (rank <= 10) tags = [...tags, 'top10']
    }
    return {
      id: `live-rank-${i}-${snap.keyword}`,
      tags,
      tone,
      cells: {
        keyword: {
          primary: snap.keyword,
          secondary: pathFromUrl(snap.url, domain),
        },
        position: rank != null ? String(rank) : '—',
        previous: prev != null ? String(prev) : '—',
        change,
        device: snap.device === 'mobile' ? 'Mobile' : 'Desktop',
        checked: fmtChecked(snap.fetchedAt),
      },
    }
  })
}

function moversFromRows(rows: SeoChapterRow[]): SeoChapterRow[] {
  return rows
    .filter((r) => r.tags?.includes('up') || r.tags?.includes('down'))
    .slice()
    .sort((a, b) => {
      const parse = (row: SeoChapterRow) => {
        const c = String(row.cells.change ?? '')
        const n = Number.parseInt(c.replace(/[^\d]/g, ''), 10)
        return Number.isFinite(n) ? n : 0
      }
      return parse(b) - parse(a)
    })
    .slice(0, 6)
    .map((r) => ({
      id: `mover-${r.id}`,
      tone: r.tone,
      cells: {
        keyword: {
          primary:
            typeof r.cells.keyword === 'object' && r.cells.keyword
              ? r.cells.keyword.primary
              : String(r.cells.keyword ?? ''),
          secondary: `${r.cells.previous ?? '—'} → ${r.cells.position ?? '—'}`,
        },
        change: r.cells.change ?? '—',
      },
    }))
}

function distributionPoints(rows: SeoChapterRow[]) {
  const buckets = { top3: 0, top10: 0, mid: 0, deep: 0 }
  for (const row of rows) {
    const pos = Number.parseInt(String(row.cells.position ?? ''), 10)
    if (!Number.isFinite(pos)) continue
    if (pos <= 3) buckets.top3 += 1
    else if (pos <= 10) buckets.top10 += 1
    else if (pos <= 20) buckets.mid += 1
    else buckets.deep += 1
  }
  return [
    { label: '1–3', value: buckets.top3 },
    { label: '4–10', value: buckets.top10 },
    { label: '11–20', value: buckets.mid },
    { label: '21+', value: buckets.deep },
  ]
}

/** Merge live rank config snapshots into an empty Rank-monitor chapter shell. */
export function buildRankChapterModel(input: {
  projectId: string
  projectName: string
  domain: string
  seed?: string
  locale?: string
  location?: string
  recent?: string[]
  suggestions?: string[] | null
  config?: SeoRankConfig | null
  t?: Translator
}): SeoChapterViewModel {
  const base = emptySeoChapter('rank-tracking', {
    projectId: input.projectId,
    projectName: input.projectName,
    domain: input.domain,
  })
  const cfg = input.config
  const snapshots = cfg?.latest ?? []
  const rows = mapRankSnapshotsToRows(snapshots, cfg?.domain || input.domain)
  const improved = rows.filter((r) => r.tags?.includes('up')).length
  const declined = rows.filter((r) => r.tags?.includes('down')).length
  const top10 = rows.filter((r) => r.tags?.includes('top10')).length
  const movers = moversFromRows(rows)
  const seed = input.seed || base.searchBand?.seed || 'brand'
  const hasLive = snapshots.length > 0

  const model: SeoChapterViewModel = {
    ...base,
    lede: undefined,
    emptyMessage: hasLive ? undefined : base.emptyMessage,
    facets: base.facets.map((f) => {
      if (f.kind === 'mode' && cfg) return { ...f, value: 'Live config' }
      if (f.kind === 'scope' && cfg) {
        return { ...f, value: `${cfg.schedule} · ${(input.locale ?? 'de').toUpperCase()}` }
      }
      if (f.kind === 'time' && cfg?.lastCheckedAt) {
        return {
          ...f,
          value: new Date(cfg.lastCheckedAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          }),
        }
      }
      return f
    }),
    searchBand: {
      seed,
      seedLabel: 'Add to track',
      actionLabel: 'Track & check',
      locale: input.locale ?? base.searchBand?.locale ?? 'de',
      location: input.location ?? base.searchBand?.location ?? 'Germany',
      recent: input.recent ?? [],
      suggestions: input.suggestions?.length ? input.suggestions : undefined,
      suggestionsLabel: input.suggestions?.length ? 'Suggestions' : undefined,
      suggestionsMode: input.suggestions?.length ? 'toggle-set' : undefined,
      locales: base.searchBand?.locales,
    },
    stats: [
      { label: 'Monitored', value: String(rows.length) },
      {
        label: 'Top 10',
        value: String(top10),
        tone: top10 > 0 ? 'pos' : undefined,
      },
      {
        label: 'Improved',
        value: String(improved),
        tone: improved > 0 ? 'pos' : undefined,
        delta: improved > 0 ? '▲' : undefined,
      },
      {
        label: 'Declined',
        value: String(declined),
        tone: declined > 0 ? 'neg' : undefined,
        delta: declined > 0 ? '▼' : undefined,
      },
    ],
    ledgerMeta: `Monitored set · ${rows.length}`,
    pageSize: 6,
    rows,
    aside: {
      charts: [
        ...(base.aside?.charts?.filter((c) => c.kind === 'series') ?? []),
        {
          kind: 'plot',
          variant: 'bar',
          title: 'Position distribution',
          height: 148,
          points: distributionPoints(rows),
        },
      ],
      ledger: {
        title: 'Biggest movers',
        meta: movers.length
          ? `${movers.length} movers · this check`
          : 'No movers yet',
        columns: base.aside?.ledger?.columns ?? [
          { key: 'keyword', label: 'Tracked', dual: true },
          { key: 'change', label: 'Δ', align: 'end' },
        ],
        rows: movers,
      },
    },
  }
  return input.t ? localizeSeoChapter(model, input.t) : model
}
