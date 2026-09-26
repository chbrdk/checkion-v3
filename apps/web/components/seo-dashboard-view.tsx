'use client'

import Link from 'next/link'
import { useMemo, useState, type ReactNode } from 'react'
import {
  Button,
  KpiMetric,
  Panel,
  SectionChrome,
  StatusDot,
  Text,
  WidgetGrid,
  layoutJoinedBoardEdges,
} from '@msqdx/ui'
import type {
  SeoDashboardCard,
  SeoDashboardSetupStep,
  SeoDashboardViewModel,
} from '@checkion-v3/contracts'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'

function NavLink({
  href,
  previewMode,
  onPreviewNavigate,
  children,
}: {
  href: string
  previewMode: boolean
  onPreviewNavigate?: (href: string) => void
  children: ReactNode
}) {
  if (previewMode) {
    return (
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault()
          onPreviewNavigate?.(href)
        }}
      >
        {children}
      </a>
    )
  }
  return <Link href={href}>{children}</Link>
}

function setupHref(projectId: string, stepId: string): string {
  switch (stepId) {
    case 'quality':
      return paths.routes.scanLaunch({
        projectId,
        mode: 'seo',
        seoLayer: 'quality',
      })
    case 'keywords':
      return paths.routes.projectSeo(projectId, 'keywords')
    case 'rank':
      return paths.routes.projectSeo(projectId, 'rank-tracking')
    case 'gsc':
      return paths.routes.projectSeo(projectId, 'gsc')
    case 'mcp':
      return paths.routes.settings
    default:
      return paths.routes.projectDetail(projectId)
  }
}

function cardHref(projectId: string, card: SeoDashboardCard): string | null {
  if (!card.href) return null
  if (card.href === 'quality') {
    return paths.routes.scanLaunch({
      projectId,
      mode: 'seo',
      seoLayer: 'quality',
    })
  }
  if (
    card.href === 'gsc' ||
    card.href === 'backlinks' ||
    card.href === 'rank-tracking' ||
    card.href === 'domain' ||
    card.href === 'competitors' ||
    card.href === 'keywords'
  ) {
    return paths.routes.projectSeo(projectId, card.href)
  }
  return null
}

function SetupChecklist({
  projectId,
  steps,
  previewMode,
  onPreviewNavigate,
}: {
  projectId: string
  steps: SeoDashboardSetupStep[]
  previewMode: boolean
  onPreviewNavigate?: (href: string) => void
}) {
  const t = useT()
  const remaining = steps.filter((s) => s.status === 'todo')
  const [selected, setSelected] = useState<string | null>(
    remaining[0]?.id ?? null,
  )
  if (remaining.length === 0) return null

  return (
    <Panel
      variant="editorial"
      className="checkion-seo-dash__setup"
      aria-label={t('seoMarket.dashboard.setupAria')}
    >
      <SectionChrome
        title={t('seoMarket.dashboard.setupTitle')}
        meta={t('seoMarket.dashboard.setupMeta')}
        as="h2"
      />
      <Text role="body" as="p" className="checkion-seo-dash__copy checkion-seo-dash__setup-lede">
        {t('seoMarket.dashboard.setupLede')}
      </Text>
      <ul className="checkion-seo-dash__setup-list">
        {remaining.map((step) => {
          const open = selected === step.id
          return (
            <li key={step.id} data-open={open ? 'true' : undefined}>
              <button
                type="button"
                className="checkion-seo-dash__setup-row"
                aria-expanded={open}
                onClick={() => setSelected(open ? null : step.id)}
              >
                <StatusDot level="warn" />
                <span className="checkion-seo-dash__setup-copy">
                  <Text role="label" as="span">
                    {step.label}
                  </Text>
                  <Text role="body" as="span" className="checkion-seo-dash__copy">
                    {step.detail}
                  </Text>
                </span>
                <Text role="body" as="span" className="checkion-seo-dash__copy checkion-seo-dash__setup-toggle">
                  {open ? t('seoMarket.actions.hide') : t('seoMarket.actions.next')}
                </Text>
              </button>
              {open ? (
                <div className="checkion-seo-dash__setup-action">
                  <NavLink
                    href={setupHref(projectId, step.id)}
                    previewMode={previewMode}
                    onPreviewNavigate={onPreviewNavigate}
                  >
                    <Button variant="primary" size="sm">
                      {t('seoMarket.actions.continue')}
                    </Button>
                  </NavLink>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
      <div className="checkion-seo-dash__setup-done">
        {steps
          .filter((s) => s.status === 'done')
          .map((s) => (
            <Text key={s.id} role="body" as="span" className="checkion-seo-dash__copy checkion-seo-dash__done-tag">
              {s.label}
            </Text>
          ))}
      </div>
    </Panel>
  )
}

function CardFacets({
  facets,
}: {
  facets: NonNullable<SeoDashboardCard['facets']>
}) {
  const t = useT()
  if (facets.length === 0) return null
  return (
    <ul className="checkion-seo-dash__facets" aria-label={t('seoMarket.search.cardProvenanceAria')}>
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

function DashboardCardView({
  projectId,
  card,
  previewMode,
  onPreviewNavigate,
  rowStart,
  rowEnd,
  firstRow,
  lastRow,
}: {
  projectId: string
  card: SeoDashboardCard
  previewMode: boolean
  onPreviewNavigate?: (href: string) => void
  rowStart: boolean
  rowEnd: boolean
  firstRow: boolean
  lastRow: boolean
}) {
  const t = useT()
  const href = cardHref(projectId, card)
  return (
    <Panel
      variant="card"
      className="checkion-seo-dash__card"
      data-row-start={rowStart ? 'true' : undefined}
      data-row-end={rowEnd ? 'true' : undefined}
      data-first-row={firstRow ? 'true' : undefined}
      data-last-row={lastRow ? 'true' : undefined}
      data-has-above={!firstRow ? 'true' : undefined}
      data-has-below={!lastRow ? 'true' : undefined}
    >
      <SectionChrome
        title={card.title}
        as="h3"
        quiet
        action={
          href ? (
            <NavLink
              href={href}
              previewMode={previewMode}
              onPreviewNavigate={onPreviewNavigate}
            >
              <Button variant="ghost" size="sm">
                {t('seoMarket.actions.moreDetails')}
              </Button>
            </NavLink>
          ) : null
        }
      />
      {card.facets?.length ? <CardFacets facets={card.facets} /> : null}
      {card.hasData && card.stats?.length ? (
        <WidgetGrid
          columns={2}
          gap="none"
          joined
          className="checkion-seo-dash__kpi-grid"
        >
          {(() => {
            const stats = card.stats
            const edges = layoutJoinedBoardEdges(
              stats.map(() => ({ colSpan: 1 })),
              2,
            )
            return stats.map((stat, i) => {
              const edge = edges[i]!
              const firstRow = Math.floor(i / 2) === 0
              return (
                <WidgetGrid.Item key={stat.label} colSpan={1}>
                  <Panel
                    variant="card"
                    className="checkion-seo-dash__kpi-cell"
                    data-row-end={edge.rowEnd ? 'true' : undefined}
                    data-last-row={edge.lastRow ? 'true' : undefined}
                    data-row-start={edge.rowStart ? 'true' : undefined}
                    data-first-row={firstRow ? 'true' : undefined}
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
            })
          })()}
        </WidgetGrid>
      ) : null}
      {card.hasData && card.issues?.length ? (
        <ul className="checkion-seo-dash__issues">
          {card.issues.map((issue) => (
            <li key={issue.label}>
              <StatusDot
                level={
                  issue.severity === 'critical'
                    ? 'critical'
                    : issue.severity === 'warning'
                      ? 'warn'
                      : 'ok'
                }
              />
              <Text role="body" as="span" className="checkion-seo-dash__copy checkion-seo-dash__issue-label">
                {issue.label}
              </Text>
              <Text role="body" as="span" className="checkion-seo-dash__copy">
                {issue.count}{' '}
                {issue.count === 1
                  ? t('seoMarket.dashboard.page')
                  : t('seoMarket.dashboard.pages')}
              </Text>
            </li>
          ))}
        </ul>
      ) : null}
      {!card.hasData ? (
        <div className="checkion-seo-dash__empty">
          <Text role="body" as="p" className="checkion-seo-dash__copy checkion-seo-dash__empty-copy">
            {card.emptyMessage ?? t('seoMarket.dashboard.noDataYet')}
          </Text>
          {href && card.emptyCtaLabel ? (
            <NavLink
              href={href}
              previewMode={previewMode}
              onPreviewNavigate={onPreviewNavigate}
            >
              <Button variant="primary" size="sm">
                {card.emptyCtaLabel}
              </Button>
            </NavLink>
          ) : null}
        </div>
      ) : null}
    </Panel>
  )
}

/**
 * OpenSEO-shaped SEO project dashboard — magazine DS language.
 * Spec: specs/domain/seo-project-workspace.md § Dashboard
 * Metrics: KpiMetric inside Panel card (not LabTile — soft/radius language).
 */
export function SeoDashboardView({
  model,
  previewMode = false,
  onPreviewNavigate,
}: {
  model: SeoDashboardViewModel
  previewMode?: boolean
  onPreviewNavigate?: (href: string) => void
}) {
  const t = useT()
  const sortedCards = useMemo(
    () =>
      [...model.cards].sort((a, b) => Number(b.hasData) - Number(a.hasData)),
    [model.cards],
  )

  return (
    <div
      className="checkion-seo-dash"
      data-section="seo-dashboard"
      data-preview={previewMode ? 'true' : undefined}
    >
      <header className="checkion-seo-dash__mast">
        <Text role="title" as="h1">
          {t('seoMarket.dashboard.title')}
        </Text>
        <Text role="body" as="p" className="checkion-seo-dash__copy">
          {model.projectName} · {model.domain}
        </Text>
      </header>

      <SetupChecklist
        projectId={model.projectId}
        steps={model.setupSteps}
        previewMode={previewMode}
        onPreviewNavigate={onPreviewNavigate}
      />

      <WidgetGrid columns={12} gap="none" className="checkion-seo-dash__grid">
        {(() => {
          const colSpan = 6
          const columns = 12
          const edges = layoutJoinedBoardEdges(
            sortedCards.map(() => ({ colSpan })),
            columns,
          )
          let cursor = 0
          let row = 0
          const rows: number[] = []
          for (let i = 0; i < sortedCards.length; i++) {
            if (cursor > 0 && cursor + colSpan > columns) {
              cursor = 0
              row += 1
            }
            rows.push(row)
            cursor += colSpan
            if (cursor >= columns) {
              cursor = 0
              row += 1
            }
          }
          return sortedCards.map((card, i) => {
            const edge = edges[i]!
            const firstRow = rows[i] === 0
            return (
              <WidgetGrid.Item key={card.key} colSpan={colSpan}>
                <DashboardCardView
                  projectId={model.projectId}
                  card={card}
                  previewMode={previewMode}
                  onPreviewNavigate={onPreviewNavigate}
                  rowStart={edge.rowStart}
                  rowEnd={edge.rowEnd}
                  firstRow={firstRow}
                  lastRow={edge.lastRow}
                />
              </WidgetGrid.Item>
            )
          })
        })()}
      </WidgetGrid>
    </div>
  )
}
