import type {
  SeoBacklinkReferringPage,
  SeoBacklinkSnapshot,
  SeoChapterAsideLedger,
  SeoChapterChart,
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
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
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
    if (item.isNew) tags.push('new')
    if (item.isLost) tags.push('lost')
    const domain = item.domainFrom.toLowerCase()
    if (domain.includes('.gov')) tags.push('gov')
    if (domain.includes('.edu')) tags.push('edu')
    return {
      id: item.id,
      tags,
      tone: item.isLost || item.isBroken ? 'neg' : item.isNew ? 'pos' : undefined,
      cells: {
        page: {
          primary: item.title || hostPath(item.urlFrom),
          secondary: [
            hostPath(item.urlFrom),
            item.country ? item.country : null,
            item.spamScore != null ? `spam ${item.spamScore}` : null,
          ]
            .filter(Boolean)
            .join(' · '),
        },
        dr: fmtInt(item.domainFromRank),
        ur: fmtInt(item.pageFromRank),
        domains: item.country ?? '—',
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
          : item.isLost
            ? 'Lost'
            : item.isNew
              ? 'New'
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

/** @deprecated Prefer mapBacklinkPagesToRows */
export function mapBacklinkSnapshotsToRows(
  history: SeoBacklinkSnapshot[],
): SeoChapterRow[] {
  const latest = history[0]
  return latest?.items?.length ? mapBacklinkPagesToRows(latest.items) : []
}

function buildAside(snap: SeoBacklinkSnapshot): {
  ledger?: SeoChapterAsideLedger
  ledgers?: SeoChapterAsideLedger[]
} {
  const ledgers: SeoChapterAsideLedger[] = []

  if (snap.anchors?.length) {
    ledgers.push({
      title: 'Top anchors',
      meta: `${snap.anchors.length} anchors`,
      columns: [
        { key: 'keyword', label: 'Anchor', dual: true },
        { key: 'volume', label: 'Links', align: 'end' },
        { key: 'score', label: 'DR', align: 'end' },
      ],
      rows: snap.anchors.slice(0, 12).map((a) => ({
        id: a.id,
        cells: {
          keyword: {
            primary: a.anchor,
            secondary: a.firstSeen ? fmtWhen(a.firstSeen) : '—',
          },
          volume: fmtInt(a.backlinks),
          score: fmtInt(a.rank),
        },
      })),
    })
  }

  if (snap.referringDomainsList?.length) {
    ledgers.push({
      title: 'Referring domains',
      meta: `${snap.referringDomainsList.length} domains`,
      columns: [
        { key: 'domain', label: 'Domain', dual: true },
        { key: 'score', label: 'DR', align: 'end' },
        { key: 'links', label: 'Links', align: 'end' },
      ],
      rows: snap.referringDomainsList.slice(0, 12).map((d) => ({
        id: d.id,
        tags: d.dofollow === false ? ['nofollow'] : ['dofollow'],
        cells: {
          domain: {
            primary: d.domain,
            secondary: [d.country, d.firstSeen ? fmtWhen(d.firstSeen) : null]
              .filter(Boolean)
              .join(' · ') || '—',
          },
          score: fmtInt(d.rank),
          links: fmtInt(d.backlinks),
        },
      })),
    })
  }

  if (snap.domainPages?.length) {
    ledgers.push({
      title: 'Linked pages',
      meta: `${snap.domainPages.length} pages`,
      columns: [
        { key: 'page', label: 'Page', dual: true },
        { key: 'links', label: 'Links', align: 'end' },
        { key: 'domains', label: 'Domains', align: 'end' },
      ],
      rows: snap.domainPages.slice(0, 12).map((p) => ({
        id: p.id,
        cells: {
          page: {
            primary: hostPath(p.page),
            secondary: fmtInt(p.rank) !== '—' ? `DR ${fmtInt(p.rank)}` : '—',
          },
          links: fmtInt(p.backlinks),
          domains: fmtInt(p.referringDomains),
        },
      })),
    })
  }

  if (snap.competitors?.length) {
    ledgers.push({
      title: 'Link competitors',
      meta: `${snap.competitors.length} rivals`,
      columns: [
        { key: 'domain', label: 'Rival', dual: true },
        { key: 'overlap', label: 'Intersect', align: 'end' },
        { key: 'score', label: 'DR', align: 'end' },
      ],
      rows: snap.competitors.slice(0, 10).map((c) => ({
        id: c.id,
        cells: {
          domain: {
            primary: c.domain,
            secondary: fmtInt(c.backlinks) !== '—' ? `${fmtInt(c.backlinks)} links` : '—',
          },
          overlap: fmtInt(c.intersections),
          score: fmtInt(c.rank),
        },
      })),
    })
  }

  const [ledger, ...rest] = ledgers
  return { ledger, ledgers: rest.length ? rest : undefined }
}

function buildCharts(snap: SeoBacklinkSnapshot): SeoChapterChart[] {
  const charts: SeoChapterChart[] = []
  const series = snap.timeseries ?? []
  const nl = snap.timeseriesNewLost ?? []
  const hist = snap.history ?? []

  if (nl.length >= 2) {
    charts.push({
      kind: 'series',
      title: 'New & lost backlinks',
      height: 180,
      series: [
        {
          id: 'new',
          label: 'New',
          points: nl.map((p) => ({
            label: weekLabel(p.date),
            value: p.newBacklinks ?? 0,
          })),
        },
        {
          id: 'lost',
          label: 'Lost',
          points: nl.map((p) => ({
            label: weekLabel(p.date),
            value: p.lostBacklinks ?? 0,
          })),
        },
      ],
    })
  } else if (series.length >= 2) {
    charts.push({
      kind: 'series',
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
    })
  }

  if (series.length >= 2) {
    charts.push({
      kind: 'series',
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
    })
  }

  if (hist.length >= 3) {
    charts.push({
      kind: 'series',
      title: 'Backlink history',
      height: 180,
      series: [
        {
          id: 'hist-bl',
          label: 'Backlinks',
          points: hist.slice(-12).map((p) => ({
            label: weekLabel(p.date),
            value: p.backlinks ?? 0,
          })),
        },
      ],
    })
  }

  if (snap.referringLinksTld?.length) {
    charts.push({
      kind: 'plot',
      title: 'Ref. domains by TLD',
      variant: 'bar_horizontal',
      height: 180,
      points: snap.referringLinksTld.slice(0, 6).map((b) => ({
        label: b.tld,
        value: b.count,
      })),
    })
  }

  if (snap.referringLinksPlatforms?.length) {
    charts.push({
      kind: 'plot',
      title: 'Referring platforms',
      variant: 'bar',
      height: 160,
      points: snap.referringLinksPlatforms.slice(0, 6).map((b) => ({
        label: b.key,
        value: b.count,
      })),
    })
  }

  if (snap.referringLinksCountries?.length) {
    charts.push({
      kind: 'plot',
      title: 'Referring countries',
      variant: 'bar_horizontal',
      height: 160,
      points: snap.referringLinksCountries
        .filter((b) => b.key && b.key !== '(empty)')
        .slice(0, 6)
        .map((b) => ({ label: b.key, value: b.count })),
    })
  }

  if (snap.networks?.length) {
    charts.push({
      kind: 'plot',
      title: 'Referring networks',
      variant: 'bar_horizontal',
      height: 160,
      points: snap.networks.slice(0, 6).map((n) => ({
        label: n.network,
        value: n.backlinks ?? n.referringDomains ?? 0,
      })),
    })
  }

  return charts
}

/** Merge DataForSEO backlink pack into the chapter shell. */
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
  const aside = snap ? buildAside(snap) : {}
  const charts = snap ? buildCharts(snap) : []

  const infoBits = [
    snap?.targetInfo?.cms,
    snap?.targetInfo?.server,
    snap?.targetInfo?.country,
    snap?.brokenBacklinks != null ? `${fmtInt(snap.brokenBacklinks)} broken` : null,
    snap?.referringIps != null ? `${fmtInt(snap.referringIps)} IPs` : null,
  ].filter(Boolean)

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
            ? 'Fixture pack'
            : `DataForSEO · ${items.length} pages · ${snap.anchors?.length ?? 0} anchors`,
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
        return {
          ...f,
          value: infoBits.length
            ? `${snap.stubbed ? 'Fixture' : 'DataForSEO'} · ${infoBits.join(' · ')}`
            : snap.stubbed
              ? 'Fixture'
              : 'DataForSEO',
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
      locales: base.searchBand?.locales ?? [
        { value: 'de', label: 'DE' },
        { value: 'en', label: 'EN' },
      ],
    },
    filters: [
      { id: 'all', label: 'All', tag: null },
      { id: 'dofollow', label: 'Dofollow', tag: 'dofollow' },
      { id: 'nofollow', label: 'Nofollow', tag: 'nofollow' },
      { id: 'new', label: 'New', tag: 'new' },
      { id: 'lost', label: 'Lost', tag: 'lost' },
      { id: 'gov', label: 'Government', tag: 'gov' },
      { id: 'edu', label: 'Educational', tag: 'edu' },
    ],
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
    pageSize: 10,
    rows,
    charts: charts.length ? charts : undefined,
    aside:
      aside.ledger || aside.ledgers
        ? { ledger: aside.ledger, ledgers: aside.ledgers }
        : undefined,
  }
  return input.t ? localizeSeoChapter(model, input.t) : model
}
