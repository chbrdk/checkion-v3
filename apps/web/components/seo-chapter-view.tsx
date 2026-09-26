'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Button,
  Chip,
  Field,
  Input,
  KpiMetric,
  Panel,
  Text,
  ToggleGroup,
  WidgetGrid,
  layoutJoinedBoardEdges,
} from '@msqdx/ui'
import { Chart, Select, SeriesChart } from '../lib/msqdx-ui-client'
import type {
  SeoChapterCellValue,
  SeoChapterChart,
  SeoChapterColumn,
  SeoChapterFilter,
  SeoChapterRow,
  SeoChapterSearchBand,
  SeoChapterViewModel,
  SeoDashboardFacet,
  SeoDashboardStat,
} from '@checkion-v3/contracts'
import { useT } from '../lib/user-prefs'

export type SeoChapterSearchQuery = {
  seed: string
  locale: string
  location: string
}

function ChapterFacets({ facets }: { facets: SeoDashboardFacet[] }) {
  const t = useT()
  if (facets.length === 0) return null
  return (
    <ul className="checkion-seo-dash__facets" aria-label={t('seoMarket.search.provenanceAria')}>
      {facets.map((facet) => (
        <li key={`${facet.kind}-${facet.label}`} data-kind={facet.kind}>
          <Text role="label" as="span" className="checkion-seo-dash__facet-label">
            {facet.label}
          </Text>
          <Text role="meta" as="span" className="checkion-seo-dash__facet-value">
            {facet.value}
          </Text>
        </li>
      ))}
    </ul>
  )
}

/** One-row KPI strip on a 12-col board (equal spans). */
function ChapterKpiStrip({ stats }: { stats: SeoDashboardStat[] }) {
  const columns = 12
  const colSpan = Math.max(1, Math.floor(columns / Math.max(1, stats.length)))
  const edges = layoutJoinedBoardEdges(
    stats.map(() => ({ colSpan })),
    columns,
  )
  return (
    <WidgetGrid
      columns={12}
      gap="none"
      joined
      className="checkion-seo-dash__kpi-grid checkion-seo-chapter__kpi"
    >
      {stats.map((stat, i) => {
        const edge = edges[i]!
        return (
          <WidgetGrid.Item key={stat.label} colSpan={colSpan}>
            <Panel
              variant="card"
              className="checkion-seo-dash__kpi-cell"
              data-row-end={edge.rowEnd ? 'true' : undefined}
              data-last-row={edge.lastRow ? 'true' : undefined}
              data-row-start={edge.rowStart ? 'true' : undefined}
              data-first-row="true"
            >
              <KpiMetric
                label={stat.label}
                value={stat.value}
                meta={
                  stat.delta ? (
                    <span
                      data-tone={
                        stat.tone === 'pos'
                          ? 'pos'
                          : stat.tone === 'neg'
                            ? 'neg'
                            : undefined
                      }
                    >
                      {stat.delta}
                    </span>
                  ) : undefined
                }
              />
            </Panel>
          </WidgetGrid.Item>
        )
      })}
    </WidgetGrid>
  )
}

function ChapterCharts({ charts }: { charts: SeoChapterChart[] }) {
  const t = useT()
  if (charts.length === 0) return null
  return (
    <div className="checkion-seo-chapter__charts" role="region" aria-label={t('seoMarket.search.chartsAria')}>
      {charts.map((chart, i) => {
        if (chart.kind === 'series') {
          return (
            <Panel
              key={`${chart.title ?? 'series'}-${i}`}
              variant="card"
              className="checkion-seo-chapter__chart-card"
            >
              <SeriesChart
                title={chart.title}
                height={chart.height ?? 200}
                invertY={chart.invertY}
                series={chart.series}
              />
            </Panel>
          )
        }
        return (
          <Panel
            key={`${chart.title ?? 'plot'}-${i}`}
            variant="card"
            className="checkion-seo-chapter__chart-card"
          >
            <Chart
              title={chart.title}
              variant={chart.variant ?? 'bar'}
              height={chart.height ?? 180}
              data={chart.points}
            />
          </Panel>
        )
      })}
    </div>
  )
}

function cellPrimary(value: SeoChapterCellValue | undefined): string {
  if (value == null) return '—'
  if (typeof value === 'string') return value
  return value.primary || '—'
}

function cellSecondary(value: SeoChapterCellValue | undefined): string | null {
  if (value == null || typeof value === 'string') return null
  return value.secondary?.trim() || null
}

function ChapterCell({
  value,
  dual,
  columnKey,
}: {
  value: SeoChapterCellValue | undefined
  dual?: boolean
  columnKey?: string
}) {
  const primary = cellPrimary(value)
  const secondary = dual ? cellSecondary(value) : null

  if (columnKey === 'score') {
    const n = Number.parseInt(primary, 10)
    const elevated = Number.isFinite(n) && n >= 10
    return (
      <Chip
        static
        size="sm"
        selected={elevated}
        className="checkion-seo-chapter__score-chip"
      >
        {primary}
      </Chip>
    )
  }

  if (columnKey === 'position') {
    const n = Number.parseInt(primary, 10)
    const elevated = Number.isFinite(n) && n <= 10
    return (
      <Chip
        static
        size="sm"
        selected={elevated}
        className="checkion-seo-chapter__score-chip"
      >
        {primary}
      </Chip>
    )
  }

  if (columnKey === 'change') {
    const down = primary.includes('▼')
    const up = primary.includes('▲')
    if (up || down) {
      return (
        <Chip
          static
          size="sm"
          selected={up}
          className="checkion-seo-chapter__score-chip"
          data-intent={down ? 'trans' : 'info'}
        >
          {primary}
        </Chip>
      )
    }
  }

  if (columnKey === 'intent') {
    const intent = primary.toLowerCase()
    return (
      <Chip
        static
        size="sm"
        selected={intent.includes('trans')}
        className="checkion-seo-chapter__intent-chip"
        data-intent={intent.includes('trans') ? 'trans' : 'info'}
      >
        {primary}
      </Chip>
    )
  }

  if (columnKey === 'threat') {
    const t = primary.toLowerCase()
    return (
      <Chip
        static
        size="sm"
        selected={t === 'high'}
        className="checkion-seo-chapter__score-chip"
        data-intent={t === 'high' ? 'trans' : 'info'}
      >
        {primary}
      </Chip>
    )
  }

  if (!secondary) {
    return (
      <Text role="body" as="span" className="checkion-seo-dash__copy">
        {primary}
      </Text>
    )
  }
  return (
    <span className="checkion-seo-chapter__dual">
      <Text role="body" as="span" className="checkion-seo-dash__copy checkion-seo-chapter__dual-primary">
        {primary}
      </Text>
      <Text role="meta" as="span" className="checkion-seo-chapter__dual-secondary">
        {secondary}
      </Text>
    </span>
  )
}

function ChapterSearchBand({
  band,
  busy,
  onSearch,
}: {
  band: SeoChapterSearchBand
  busy?: boolean
  onSearch?: (query: SeoChapterSearchQuery) => void | Promise<void>
}) {
  const t = useT()
  const [seed, setSeed] = useState(band.seed)
  const [locale, setLocale] = useState(band.locale)
  const [location, setLocation] = useState(band.location)

  useEffect(() => {
    setSeed(band.seed)
    setLocale(band.locale)
    setLocation(band.location)
  }, [band.seed, band.locale, band.location])

  const locales = band.locales?.length
    ? band.locales
    : [
        { value: 'de', label: 'DE' },
        { value: 'en', label: 'EN' },
      ]
  const seedLabel = band.seedLabel ?? t('seoMarket.seed.seed')
  const actionLabel = band.actionLabel ?? t('seoMarket.actions.search')
  const allowEmpty = Boolean(band.allowEmptySeed)

  const run = (nextSeed?: string) => {
    const s = (nextSeed ?? seed).trim()
    if ((!s && !allowEmpty) || !onSearch) return
    if (nextSeed != null) setSeed(nextSeed)
    void onSearch({ seed: s, locale, location: location.trim() || t('seoMarket.locations.germany') })
  }

  return (
    <div className="checkion-seo-chapter__search" role="search" aria-label={seedLabel}>
      <div className="checkion-seo-chapter__search-row">
        <Field label={seedLabel} className="checkion-seo-chapter__search-seed">
          <Input
            size="md"
            block
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                run()
              }
            }}
            placeholder={allowEmpty ? t('seoMarket.search.savedIfEmpty', { label: seedLabel }) : seedLabel}
            disabled={busy}
          />
        </Field>
        <Field label={t('seoMarket.search.locale')} className="checkion-seo-chapter__search-locale">
          <Select
            aria-label={t('seoMarket.search.locale')}
            size="md"
            value={locale}
            onChange={setLocale}
            options={locales}
            disabled={busy}
          />
        </Field>
        <Field label={t('seoMarket.search.location')} className="checkion-seo-chapter__search-location">
          <Input
            size="md"
            block
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={busy}
          />
        </Field>
        <div className="checkion-seo-chapter__search-actions">
          <Button
            variant="primary"
            size="md"
            disabled={busy || (!seed.trim() && !allowEmpty) || !onSearch}
            onClick={() => run()}
          >
            {busy ? '…' : actionLabel}
          </Button>
        </div>
      </div>
      {band.recent?.length ? (
        <div className="checkion-seo-chapter__search-recent" aria-label={t('seoMarket.search.recentAria')}>
          <Text role="label" as="span" className="checkion-seo-chapter__search-recent-label">
            {t('seoMarket.search.recent')}
          </Text>
          <ul className="checkion-seo-chapter__search-recent-list">
            {band.recent.map((item) => (
              <li key={item}>
                <Chip
                  size="sm"
                  selected={item === seed}
                  disabled={busy || !onSearch}
                  onClick={() => run(item)}
                >
                  {item}
                </Chip>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {band.suggestions?.length ? (
        <div
          className="checkion-seo-chapter__search-recent"
          aria-label={band.suggestionsLabel ?? t('seoMarket.search.suggestionsAria')}
        >
          <Text role="label" as="span" className="checkion-seo-chapter__search-recent-label">
            {band.suggestionsLabel ?? t('seoMarket.search.suggestions')}
          </Text>
          <ul className="checkion-seo-chapter__search-recent-list">
            {band.suggestions.map((item) => {
              const pickOne = band.suggestionsMode === 'pick-one'
              const parts = seed
                .split(/[,;]+/)
                .map((p) => p.trim())
                .filter(Boolean)
              const selected = pickOne
                ? seed.trim().toLowerCase() === item.toLowerCase()
                : parts.some((p) => p.toLowerCase() === item.toLowerCase())
              return (
                <li key={item}>
                  <Chip
                    size="sm"
                    selected={selected}
                    disabled={busy}
                    onClick={() => {
                      if (pickOne) {
                        setSeed(item)
                        return
                      }
                      if (selected) {
                        setSeed(
                          parts
                            .filter((p) => p.toLowerCase() !== item.toLowerCase())
                            .join(', '),
                        )
                        return
                      }
                      setSeed([...parts, item].join(', '))
                    }}
                  >
                    {item}
                  </Chip>
                </li>
              )
            })}
            {band.suggestionsMode !== 'pick-one' ? (
              <li>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => setSeed((band.suggestions ?? []).join(', '))}
                >
                  {t('seoMarket.actions.useSuggestionSet')}
                </Button>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function ChapterLedger({
  columns,
  rows,
  filters,
  ledgerMeta,
  title,
  pageSize,
}: {
  columns: SeoChapterColumn[]
  rows: SeoChapterRow[]
  filters?: SeoChapterFilter[]
  ledgerMeta?: string
  title: string
  pageSize?: number
}) {
  const t = useT()
  const [filterId, setFilterId] = useState(filters?.[0]?.id ?? 'all')
  const [page, setPage] = useState(0)
  const active = filters?.find((f) => f.id === filterId)
  const visible = useMemo(() => {
    if (!active?.tag) return rows
    return rows.filter((row) => row.tags?.includes(active.tag!))
  }, [active, rows])

  const size = pageSize && pageSize > 0 ? pageSize : 0
  const pageCount = size > 0 ? Math.max(1, Math.ceil(visible.length / size)) : 1
  const safePage = Math.min(page, pageCount - 1)
  const paged =
    size > 0
      ? visible.slice(safePage * size, safePage * size + size)
      : visible
  const from = visible.length === 0 ? 0 : safePage * (size || visible.length) + 1
  const to = size > 0 ? Math.min(visible.length, (safePage + 1) * size) : visible.length

  useEffect(() => {
    setPage(0)
  }, [filterId, rows, pageSize])

  if (rows.length === 0) {
    return (
      <Text role="body" as="p" className="checkion-seo-dash__copy checkion-seo-dash__empty-copy">
        {t('seoMarket.search.noRows')}
      </Text>
    )
  }

  const showBar = Boolean(ledgerMeta || filters?.length)
  const showPager = size > 0 && visible.length > size

  return (
    <div className="checkion-seo-chapter__ledger" role="region" aria-label={t('seoMarket.search.ledgerAria', { title })}>
      {showBar ? (
        <div className="checkion-seo-chapter__ledger-bar">
          {ledgerMeta ? (
            <Text role="label" as="p" className="checkion-seo-chapter__ledger-meta">
              {ledgerMeta}
            </Text>
          ) : (
            <span />
          )}
          {filters?.length ? (
            <ToggleGroup
              aria-label={t('seoMarket.search.filtersAria')}
              size="sm"
              value={filterId}
              onChange={setFilterId}
              options={filters.map((f) => ({ value: f.id, label: f.label }))}
            />
          ) : null}
        </div>
      ) : null}
      <div className="checkion-seo-chapter__ledger-scroll">
        <table className="checkion-seo-table checkion-seo-chapter__table checkion-seo-chapter__table--dense">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  data-align={col.align === 'end' ? 'end' : undefined}
                >
                  <Text role="label" as="span">
                    {col.label}
                  </Text>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => (
              <tr key={row.id} data-tone={row.tone}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    data-align={col.align === 'end' ? 'end' : undefined}
                    data-key={col.key}
                  >
                    <ChapterCell
                      value={row.cells[col.key]}
                      dual={col.dual}
                      columnKey={col.key}
                    />
                  </td>
                ))}
              </tr>
            ))}
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <Text role="body" as="span" className="checkion-seo-dash__copy">
                    {t('seoMarket.search.noRowsFilter')}
                  </Text>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {showPager ? (
        <div className="checkion-seo-chapter__pager" role="navigation" aria-label={t('seoMarket.search.pagerAria')}>
          <Text role="meta" as="span" className="checkion-seo-chapter__pager-meta">
            {t('seoMarket.search.pagerOf', { from, to, total: visible.length })}
          </Text>
          <div className="checkion-seo-chapter__pager-actions">
            <Button
              variant="ghost"
              size="sm"
              disabled={safePage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              {t('seoMarket.actions.prevPage')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              {t('seoMarket.actions.nextPage')}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function SeoChapterView({
  model,
  workbench,
  onSearch,
  searchBusy,
}: {
  model: SeoChapterViewModel
  workbench?: ReactNode
  onSearch?: (query: SeoChapterSearchQuery) => void | Promise<void>
  searchBusy?: boolean
}) {
  const t = useT()
  const hasAside = Boolean(
    model.aside?.charts?.length ||
      model.aside?.ledger ||
      (model.aside?.ledgers?.length ?? 0) > 0,
  )
  const mainLedger =
    model.rows.length === 0 && !model.emptyMessage ? null : model.rows.length === 0 ? (
      <Text role="body" as="p" className="checkion-seo-dash__copy checkion-seo-dash__empty-copy">
        {model.emptyMessage ?? t('seoMarket.search.noRows')}
      </Text>
    ) : (
      <ChapterLedger
        title={model.title}
        columns={model.columns}
        rows={model.rows}
        filters={model.filters}
        ledgerMeta={model.ledgerMeta}
        pageSize={model.pageSize}
      />
    )

  const asideLedgers = [
    ...(model.aside?.ledger ? [model.aside.ledger] : []),
    ...(model.aside?.ledgers ?? []),
  ]

  const asideRail = hasAside ? (
    <aside className="checkion-seo-chapter__aside" aria-label={t('seoMarket.search.asideAria')}>
      {model.aside?.charts?.length ? (
        <ChapterCharts charts={model.aside.charts} />
      ) : null}
      {asideLedgers.map((ledger) => (
        <div key={ledger.title} className="checkion-seo-chapter__aside-ledger">
          <Text role="label" as="h2" className="checkion-seo-chapter__aside-title">
            {ledger.title}
          </Text>
          {ledger.meta ? (
            <Text role="meta" as="p" className="checkion-seo-chapter__aside-meta">
              {ledger.meta}
            </Text>
          ) : null}
          <ChapterLedger
            title={ledger.title}
            columns={ledger.columns}
            rows={ledger.rows}
          />
        </div>
      ))}
    </aside>
  ) : null

  return (
    <div
      className="checkion-seo-dash checkion-seo-chapter"
      data-section="seo-chapter"
      data-chapter={model.chapter}
      data-layout={hasAside ? 'research' : 'stack'}
    >
      <header className="checkion-seo-dash__mast">
        <Text role="title" as="h1">
          {model.title}
        </Text>
        {model.lede ? (
          <Text role="body" as="p" className="checkion-seo-dash__copy checkion-seo-chapter__lede">
            {model.lede}
          </Text>
        ) : null}
      </header>

      <ChapterFacets facets={model.facets} />

      {model.searchBand ? (
        <ChapterSearchBand
          band={model.searchBand}
          busy={searchBusy}
          onSearch={onSearch}
        />
      ) : null}

      {workbench ? (
        <Panel
          variant="editorial"
          className="checkion-seo-chapter__workbench checkion-seo-chapter__workbench--top"
          aria-label={t('seoMarket.search.workbenchAria')}
        >
          {workbench}
        </Panel>
      ) : null}

      {model.stats?.length ? <ChapterKpiStrip stats={model.stats} /> : null}

      {hasAside ? (
        <div className="checkion-seo-chapter__research">
          <div className="checkion-seo-chapter__research-main">
            {model.charts?.length ? <ChapterCharts charts={model.charts} /> : null}
            {mainLedger}
          </div>
          {asideRail}
        </div>
      ) : (
        <>
          {model.charts?.length ? <ChapterCharts charts={model.charts} /> : null}
          {mainLedger}
        </>
      )}
    </div>
  )
}
