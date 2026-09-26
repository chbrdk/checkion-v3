import type {
  SeoBacklinkReferringPage,
  SeoBacklinkSnapshot,
  SeoChapterRow,
  SeoChapterViewModel,
} from '@checkion-v3/contracts'
import type { Translator } from '../i18n'
import { emptySeoChapter } from './chapter-fixtures'
import { localizeSeoChapter } from './seo-market-i18n'

function fmtInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return Math.round(n).toLocaleString('de-DE')
}

function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function weekLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return iso.slice(0, 10)
  }
}

function hostPath(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname === '/' ? '' : u.pathname
    return `${u.host}${path}`
  } catch {
    return url
  }
}

function avgPageRank(items: SeoBacklinkReferringPage[]): number | null {
  const ranks = items
    .map((i) => i.pageFromRank)
    .filter((n): n is number => n != null && Number.isFinite(n))
  if (!ranks.length) return null
  return ranks.reduce((a, b) => a + b, 0) / ranks.length
}

export function mapBacklinkPagesToRows(
  items: SeoBacklinkReferringPage[],
): SeoChapterRow[] {
  return items.map((item) => {
    const tags: string[] = []
    if (item.dofollow) tags.push('dofollow')
    else tags.push('nofollow')
    const domain = item.domainFrom.toLowerCase()
    if (/\.gov(\.|$)/i.test(domain) || domain.includes('.gov')) tags.push('gov')
    if (/\.edu(\.|$)/i.test(domain) || domain.includes('.edu')) tags.push('edu')
    return {
      id: item.id,
      tags,
      tone: item.isLost || item.isBroken ? 'neg' : item.isNew ? 'pos' : undefined,
      cells: {
        page: {
          primary: item.title || hostPath(item.urlFrom),
          secondary: hostPath(item.urlFrom),
        },
        dr: fmtInt(item.domainFromRank),
        ur: fmtInt(item.pageFromRank),
        domains: '—',
        links: fmtInt(item.linksCount),
        anchor: {
          primary: item.anchor || '—',
          secondary: item.urlTo ? hostPath(item.urlTo) : item.domainFrom,
        },
        type: item.itemType
          ? item.itemType.charAt(0).toUpperCase() + item.itemType.slice(1)
          : '—',
        status: item.isBroken
          ? 'Broken'
          : item.dofollow
            ? 'Dofollow'
            : 'Nofollow',
        seen: {
          primary: fmtWhen(item.firstSeen),
          secondary: fmtWhen(item.lastSeen),
        },
      },
    }
  })
}

/** @deprecated Prefer mapBacklinkPagesToRows — history is no longer the ledger. */
export function mapBacklinkSnapshotsToRows(
  history: SeoBacklinkSnapshot[],
): SeoChapterRow[] {
  const latest = history[0]
  return latest?.items?.length ? mapBacklinkPagesToRows(latest.items) : []
}

/** Merge DataForSEO backlink summary + referring pages into the chapter shell. */
export function buildBacklinksChapterModel(input: {
  projectId: string
  projectName: string
  domain: string
  seed?: string
  locale?: string
  location?: string
  recent?: string[]
  snapshot?: SeoBacklinkSnapshot | null
  history?: SeoBacklinkSnapshot[]
  t?: Translator
}): SeoChapterViewModel {
  const host = (input.seed || input.domain).replace(/^https?:\/\//, '').replace(/\/$/, '')
  const base = emptySeoChapter('backlinks', {
    projectId: input.projectId,
    projectName: input.projectName,
    domain: host,
  })
  const history =
    input.history?.length
      ? input.history
      : input.snapshot
        ? [input.snapshot]
        : []
  const snap = history[0] ?? input.snapshot ?? null
  const items = snap?.items ?? []
  const rows = mapBacklinkPagesToRows(items)
  const hasLive = Boolean(snap)
  const ur = avgPageRank(items)
  const series = snap?.timeseries ?? []

  const newLostChart =
    series.length >= 2
      ? {
          kind: 'series' as const,
          title: 'New & lost backlinks',
          height: 180,
          series: [
            {
              id: 'backlinks',
              label: 'Backlinks',
              points: series.map((p) => ({
                label: weekLabel(p.date),
                value: p.backlinks ?? 0,
              })),
            },
          ],
        }
      : null

  const refDomainChart =
    series.length >= 2
      ? {
          kind: 'series' as const,
          title: 'Referring domains',
          height: 180,
          series: [
            {
              id: 'ref',
              label: 'Ref. domains',
              points: series.map((p) => ({
                label: weekLabel(p.date),
                value: p.referringDomains ?? 0,
              })),
            },
          ],
        }
      : null

  const tldChart =
    snap?.referringLinksTld?.length
      ? {
          kind: 'plot' as const,
          title: 'Ref. domains by TLD',
          variant: 'bar_horizontal' as const,
          height: 180,
          points: snap.referringLinksTld.slice(0, 6).map((b) => ({
            label: b.tld,
            value: b.count,
          })),
        }
      : null

  const charts = [newLostChart, refDomainChart, tldChart].filter(
    (c): c is NonNullable<typeof c> => Boolean(c),
  )

  const model: SeoChapterViewModel = {
    ...base,
    lede: undefined,
    domain: host,
    emptyMessage:
      hasLive && rows.length === 0
        ? 'Summary loaded — no referring pages in this capture.'
        : hasLive
          ? undefined
          : base.emptyMessage,
    facets: base.facets.map((f) => {
      if (f.kind === 'mode' && snap) return { ...f, value: 'Live snapshot' }
      if (f.kind === 'scope' && snap) {
        return {
          ...f,
          value: snap.stubbed
            ? 'Fixture · summary + pages'
            : `DataForSEO · ${items.length} pages`,
        }
      }
      if (f.kind === 'time' && snap?.capturedAt) {
        return {
          ...f,
          value: new Date(snap.capturedAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          }),
        }
      }
      if (f.kind === 'source' && snap) {
        return { ...f, value: snap.stubbed ? 'Fixture' : 'DataForSEO' }
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
      locales: base.searchBand?.locales ?? [
        { value: 'de', label: 'DE' },
        { value: 'en', label: 'EN' },
      ],
    },
    stats: snap
      ? [
          {
            label: 'DR',
            value: fmtInt(snap.rank),
            tone: snap.rank != null && snap.rank > 0 ? 'pos' : undefined,
          },
          {
            label: 'UR',
            value: fmtInt(ur != null ? Math.round(ur) : null),
          },
          {
            label: 'Backlinks',
            value: fmtInt(snap.backlinks),
            tone: snap.backlinks != null && snap.backlinks > 0 ? 'pos' : undefined,
            delta:
              snap.newBacklinks != null && snap.newBacklinks > 0
                ? `▲ ${snap.newBacklinks}`
                : snap.lostBacklinks != null && snap.lostBacklinks > 0
                  ? `▼ ${snap.lostBacklinks}`
                  : undefined,
          },
          {
            label: 'Ref. domains',
            value: fmtInt(snap.referringDomains),
            tone:
              snap.referringDomains != null && snap.referringDomains > 0
                ? 'pos'
                : undefined,
            delta:
              snap.newReferringDomains != null && snap.newReferringDomains > 0
                ? `▲ ${snap.newReferringDomains}`
                : undefined,
          },
        ]
      : base.stats,
    ledgerMeta: `Backlinks · ${fmtInt(snap?.backlinks ?? rows.length)}`,
    pageSize: 8,
    rows,
    charts: charts.length ? charts : undefined,
    aside: undefined,
  }
  return input.t ? localizeSeoChapter(model, input.t) : model
}
