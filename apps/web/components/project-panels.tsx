'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Button, buttonClassName, CardActions, Chip, CollectionHubCard, EmptyState, FilterRow, Input, StatusDot, Text } from '@msqdx/ui'
import type {
  CapabilitySyncStatus,
  DomainScanLight,
  GeoJobSummary,
  GeoPositionHistoryResult,
  ProjectDetail,
  ProjectSummary,
  ScanSummary,
} from '@checkion-v3/contracts'
import { ProjectTeamPanel } from './project-team-panel'
import { ProjectDeleteConfirm, ProjectFormDialog } from './project-form-dialog'
import { GeoHistoryChapter } from './geo-history-chapter'
import { SeoPulseChapter } from './seo-pulse-chapter'
import { formatActivityListMeta, ProjectActivityStats } from './project-activity-stats'
import type { ProjectSeoPulse } from '../lib/seo-market/project-seo-pulse'
import { HubIndexLayoutSwitch, useHubIndexLayout } from '../lib/hub-index-layout'
import { paths } from '../lib/paths'
import { formatScanInstant, formatScanShort, scoreTone, displayRunTitle } from '../lib/scan-display'
import { formatDomainScoresByKindMeta } from '../lib/domain-scores-by-kind-meta'
import { hasAudionCorrelation } from '../lib/scan-correlation'
import { RUN_COLUMN_WINDOW, usePagedItems } from '../lib/run-column-paging'
import { useT } from '../lib/user-prefs'
import type { Translator } from '../lib/i18n'

function capabilityLevel(status: CapabilitySyncStatus) {
  if (status === 'in_sync') return 'ok' as const
  if (status === 'error') return 'critical' as const
  return 'warn' as const
}

function capabilityLabel(status: CapabilitySyncStatus, t: Translator): string {
  if (status === 'in_sync') return t('common.capabilityInSync')
  if (status === 'error') return t('common.capabilityError')
  return t('common.capabilityPending')
}

function capabilityHint(status: CapabilitySyncStatus, t: Translator): string | null {
  if (status === 'pending') return t('projects.capabilityHintPending')
  if (status === 'error') return t('projects.capabilityHintError')
  return null
}

type CapFilter = 'all' | CapabilitySyncStatus

function ProjectCollectionCard({ project }: { project: ProjectSummary }) {
  const t = useT()
  const hint = capabilityHint(project.capabilityStatus, t)
  const domain = project.domain?.trim() || null
  const cap = capabilityLabel(project.capabilityStatus, t)

  return (
    <CollectionHubCard
      kicker={domain ?? '\u00a0'}
      badge={
        <span title={t('projects.capabilityBadgeTitle', { status: cap.toLowerCase() })}>
          {cap}
        </span>
      }
      badgeStatus={project.capabilityStatus}
      title={project.name}
      hint={hint}
      stats={<ProjectActivityStats project={project} />}
      actions={
        <CardActions>
          <Link
            href={paths.routes.projectDetail(project.id)}
            className={buttonClassName({ variant: 'ghost' })}
          >
            {t('common.open')}
          </Link>
        </CardActions>
      }
    />
  )
}

function CreateProjectCard({ onClick }: { onClick: () => void }) {
  const t = useT()
  return (
    <CollectionHubCard
      variant="create"
      title={t('projects.createTitle')}
      hint={t('projects.createDeck')}
      onClick={onClick}
    />
  )
}

function ProjectListRow({
  project,
  index,
}: {
  project: ProjectSummary
  index: number
}) {
  const t = useT()
  const domain = project.domain?.trim() || null
  return (
    <li className="ds-collection-hub-list-row">
      <span className="ds-collection-hub-list-num" aria-hidden>
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="ds-collection-hub-list-row__main">
        <Link
          href={paths.routes.projectDetail(project.id)}
          className="ds-collection-hub-list-row__title"
        >
          {project.name}
        </Link>
        <p className="ds-collection-hub-list-meta" aria-label={t('projects.metricsAria')}>
          <span>{domain ?? t('projects.noDomain')}</span>
          <span aria-hidden> · </span>
          <span>{formatActivityListMeta(project, t)}</span>
        </p>
      </div>
      <div className="ds-collection-hub-list-row__trail">
        <span
          className="ds-collection-hub-card__badge checkion-projects-list-row__badge"
          data-status={project.capabilityStatus}
        >
          {capabilityLabel(project.capabilityStatus, t)}
        </span>
        <div className="checkion-projects-list-row__actions">
          <Link
            href={paths.routes.projectDetail(project.id)}
            className={buttonClassName({ variant: 'ghost', size: 'sm' })}
          >
            {t('common.open')}
          </Link>
        </div>
      </div>
    </li>
  )
}

export function ProjectListPanel({
  projects,
  bindPlatformProjectId,
}: {
  projects: ProjectSummary[]
  /** When deep-link collection is unbound, prefill create with this id. */
  bindPlatformProjectId?: string
}) {
  const [query, setQuery] = useState('')
  const [capFilter, setCapFilter] = useState<CapFilter>('all')
  const { layout, setLayout } = useHubIndexLayout()
  const [createOpen, setCreateOpen] = useState(Boolean(bindPlatformProjectId))
  const t = useT()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return projects.filter((p) => {
      if (capFilter !== 'all' && p.capabilityStatus !== capFilter) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.domain.toLowerCase().includes(q) ||
        p.platformProjectId.toLowerCase().includes(q)
      )
    })
  }, [projects, query, capFilter])

  return (
    <div className="checkion-magazine checkion-projects" data-section="projects-hub">
      <div className="checkion-projects-band">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('projects.searchPlaceholder')}
          aria-label={t('projects.searchAria')}
        />
        <FilterRow role="group" aria-label={t('projects.filterCapability')}>
          {(
            [
              ['all', t('projects.filterAll')],
              ['in_sync', t('common.capabilityInSync')],
              ['pending', t('common.capabilityPending')],
              ['error', t('common.capabilityError')],
            ] as const
          ).map(([id, label]) => (
            <Chip
              key={id}
              size="sm"
              selected={capFilter === id}
              onClick={() => setCapFilter(id)}
            >
              {label}
            </Chip>
          ))}
        </FilterRow>
        <HubIndexLayoutSwitch layout={layout} onChange={setLayout} />
      </div>

      <div className="checkion-collection-list">
        {layout === 'cards' ? (
          <div className="ds-collection-hub-grid" aria-label={t('projects.listAria')}>
            <CreateProjectCard onClick={() => setCreateOpen(true)} />
            {filtered.map((project) => (
              <ProjectCollectionCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="checkion-projects-list-wrap">
            <button
              type="button"
              className="ds-collection-hub-list-create"
              onClick={() => setCreateOpen(true)}
            >
              <span className="ds-collection-hub-list-create__label">{t('projects.createTitle')}</span>
              <span className="ds-collection-hub-list-create__deck">
                {t('projects.createDeck')}
              </span>
            </button>
            {filtered.length > 0 ? (
              <ol className="ds-collection-hub-list" aria-label={t('projects.listAria')}>
                {filtered.map((project, index) => (
                  <ProjectListRow key={project.id} project={project} index={index} />
                ))}
              </ol>
            ) : null}
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState className="checkion-collection-list-status">
            {projects.length === 0 ? t('projects.emptyNone') : t('projects.emptyFilter')}
          </EmptyState>
        ) : null}
      </div>

      <ProjectFormDialog
        open={createOpen}
        mode="create"
        platformProjectId={bindPlatformProjectId}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  )
}

function WorkspaceChapter({
  eyebrow,
  title,
  deck,
  meta,
  children,
}: {
  eyebrow: string
  title: string
  deck?: string
  meta?: string
  children: ReactNode
}) {
  return (
    <section className="checkion-project-chapter">
      <header className="checkion-project-chapter__head">
        <div>
          <p className="checkion-spread__eyebrow">{eyebrow}</p>
          <h2 className="checkion-spread__headline">{title}</h2>
          {deck ? <p className="checkion-project-chapter__deck">{deck}</p> : null}
        </div>
        {meta ? (
          <Text role="meta" as="p" className="checkion-project-chapter__meta">
            {meta}
          </Text>
        ) : null}
      </header>
      {children}
    </section>
  )
}

export function ProjectWorkspace({
  project,
  recentScans,
  domains,
  geoJobs = [],
  geoHistory = null,
  seoPulse = null,
}: {
  project: ProjectDetail
  recentScans: ScanSummary[]
  domains: DomainScanLight[]
  geoJobs?: GeoJobSummary[]
  geoHistory?: GeoPositionHistoryResult | null
  seoPulse?: ProjectSeoPulse | null
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const t = useT()

  const singleScans = recentScans.filter((s) => s.mode === 'single')
  const deepScans = recentScans.filter((s) => s.mode === 'deep')
  const singlesWindow = useMemo(
    () => recentScans.filter((s) => s.mode === 'single').slice(0, RUN_COLUMN_WINDOW),
    [recentScans],
  )
  const domainsWindow = useMemo(() => domains.slice(0, RUN_COLUMN_WINDOW), [domains])
  const geoWindow = useMemo(() => geoJobs.slice(0, RUN_COLUMN_WINDOW), [geoJobs])
  const singlesPage = usePagedItems(singlesWindow)
  const domainsPage = usePagedItems(domainsWindow)
  const geoPage = usePagedItems(geoWindow)
  const domainCount = domains.length || deepScans.length
  const latestGeo = geoJobs[0] ?? null
  const latestScore =
    recentScans.find((s) => s.overallScore != null)?.overallScore ??
    domains.find((d) => d.overallScore != null)?.overallScore ??
    latestGeo?.overallScore ??
    null
  const projectUrl = project.domain.startsWith('http')
    ? project.domain
    : `https://${project.domain}`
  const singleLaunchHref = paths.routes.scanLaunch({ projectId: project.id, mode: 'single' })
  const deepLaunchHref = paths.routes.scanLaunch({ projectId: project.id, mode: 'deep' })
  const geoLaunchHref = paths.routes.scanLaunch({
    projectId: project.id,
    mode: 'geo',
    url: projectUrl,
  })
  const syncLabel = capabilityLabel(project.capabilityStatus, t)
  const syncHint = capabilityHint(project.capabilityStatus, t)

  return (
    <article
      className="checkion-magazine checkion-magazine--editorial checkion-project-workspace"
      data-section="project-workspace"
    >
      <div className="checkion-magazine-topbar">
        <nav className="briefing-nav signal-nav" aria-label={t('common.breadcrumb')}>
          <Link href={paths.routes.projects}>{t('nav.projects')}</Link>
          <span className="briefing-nav-sep" aria-hidden>
            /
          </span>
          <span>{project.name}</span>
        </nav>
      </div>

      <header className="checkion-project-cover">
        <div className="checkion-project-cover__copy">
          <p className="checkion-cover__kicker">{t('projects.kicker')}</p>
          <h1 className="checkion-project-cover__title">{project.name}</h1>
          <p className="checkion-project-cover__host">{project.domain}</p>
          <p className="checkion-project-cover__lede">
            {project.description || t('projects.ledeFallback', { domain: project.domain })}
          </p>
          <ul className="checkion-magazine-facets geo-places" aria-label={t('projects.attrsAria')}>
            <li data-kind={project.capabilityStatus}>
              <span className="meta">{t('projects.attrCapability')}</span>
              <span className="checkion-status-line">
                <StatusDot level={capabilityLevel(project.capabilityStatus)} />
                {syncLabel}
              </span>
            </li>
            <li data-kind="collection">
              <span className="meta">{t('projects.attrCollection')}</span>
              <span title={t('projects.collectionIdTitle')}>{project.platformProjectId}</span>
            </li>
            <li data-kind="time">
              <span className="meta">{t('projects.attrLastActivity')}</span>
              <span>{formatScanInstant(project.lastScanAt)}</span>
            </li>
          </ul>
          {syncHint ? (
            <Text role="meta" as="p" className="checkion-project-cover__hint">
              {syncHint}
            </Text>
          ) : null}
        </div>
        <aside className="checkion-project-cover__aside">
          <div className="checkion-project-cover__actions">
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
              {t('common.edit')}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setDeleteOpen(true)}>
              {t('projects.archiveConfirm')}
            </Button>
          </div>
          <ProjectTeamPanel
            projectId={project.id}
            platformProjectId={project.platformProjectId}
          />
        </aside>
      </header>

      <WorkspaceChapter
        eyebrow={t('projects.pulseEyebrow')}
        title={t('projects.pulseTitle')}
        deck={t('projects.pulseDeck')}
      >
        <div className="checkion-project-pulse" aria-label={t('projects.pulseAria')}>
          <div className="checkion-project-pulse__meter">
            <p className="checkion-project-pulse__value">{singleScans.length}</p>
            <p className="checkion-project-pulse__label">{t('projects.pulseSingles')}</p>
          </div>
          <div className="checkion-project-pulse__meter">
            <p className="checkion-project-pulse__value">{domainCount}</p>
            <p className="checkion-project-pulse__label">{t('projects.pulseDeep')}</p>
          </div>
          <div className="checkion-project-pulse__meter">
            <p className="checkion-project-pulse__value">{geoJobs.length}</p>
            <p className="checkion-project-pulse__label">{t('projects.pulseGeo')}</p>
          </div>
          <div className="checkion-project-pulse__meter" data-tone={scoreTone(latestScore)}>
            <p className="checkion-project-pulse__value">
              {latestScore != null ? latestScore : '—'}
            </p>
            <p className="checkion-project-pulse__label">{t('projects.pulseLatestScore')}</p>
          </div>
        </div>
      </WorkspaceChapter>

      <WorkspaceChapter
        eyebrow={t('projects.runsEyebrow')}
        title={t('projects.runsTitle')}
        deck={t('projects.runsDeck')}
      >
        <div className="checkion-home-run-columns" aria-label={t('projects.runsAria')}>
          <div className="checkion-home-run-col" aria-label={t('projects.pulseSingles')}>
            <h3 className="checkion-home-run-col__title">{t('projects.runsSingles')}</h3>
            {singlesWindow.length === 0 ? (
              <EmptyState className="checkion-project-chapter__empty">
                {t('projects.emptySingles')}{' '}
                <Link href={singleLaunchHref}>{t('projects.emptySinglesCta')}</Link>.
              </EmptyState>
            ) : (
              <>
                <ol className="checkion-magazine-list checkion-project-run-list">
                  {singlesPage.shown.map((scan, index) => (
                    <li key={scan.id} data-tone={scoreTone(scan.overallScore)}>
                      <span className="checkion-magazine-list-num" aria-hidden>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="checkion-project-run-list__main">
                        <Link
                          href={paths.routes.resultSection(scan.id, 'overview')}
                          className="checkion-project-run-list__title"
                          title={scan.url}
                        >
                          {displayRunTitle(scan.title, scan.url)}
                        </Link>
                        <Text role="meta" as="p" className="checkion-project-run-list__meta">
                          {scan.status}
                          {hasAudionCorrelation(scan) ? ` · ${t('projects.fromAudion')}` : null}
                          {' · '}
                          {formatScanInstant(scan.completedAt)}
                        </Text>
                      </div>
                      <span
                        className="checkion-project-run-list__score"
                        data-tone={scoreTone(scan.overallScore)}
                      >
                        {scan.overallScore != null ? scan.overallScore : '—'}
                      </span>
                    </li>
                  ))}
                </ol>
                {singlesPage.hasMore ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="checkion-home-run-col__more"
                    onClick={singlesPage.showMore}
                  >
                    {t('projects.showMoreRuns', { n: singlesPage.remaining })}
                  </Button>
                ) : null}
              </>
            )}
          </div>

          <div className="checkion-home-run-col" aria-label={t('projects.pulseDeep')}>
            <h3 className="checkion-home-run-col__title">{t('projects.runsDeep')}</h3>
            {domainsWindow.length === 0 ? (
              <EmptyState className="checkion-project-chapter__empty">
                {t('projects.emptyDeep')}{' '}
                <Link href={deepLaunchHref}>{t('projects.emptyDeepCta')}</Link>.
              </EmptyState>
            ) : (
              <>
                <ol className="checkion-magazine-list checkion-project-run-list">
                  {domainsPage.shown.map((d, index) => {
                    const kindMeta = formatDomainScoresByKindMeta(d.scoresByKind)
                    return (
                      <li key={d.id} data-tone={scoreTone(d.overallScore)}>
                        <span className="checkion-magazine-list-num" aria-hidden>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div className="checkion-project-run-list__main">
                          <Link
                            href={paths.routes.domainSection(d.id, 'overview')}
                            className="checkion-project-run-list__title"
                            title={d.rootUrl}
                          >
                            {displayRunTitle(d.title, d.rootUrl)}
                          </Link>
                          <Text role="meta" as="p" className="checkion-project-run-list__meta">
                            {t('projects.pagesIssues', {
                              pages: d.pageCount.toLocaleString(),
                              issues: d.issueCount.toLocaleString(),
                            })}
                            {kindMeta ? ` · ${kindMeta}` : ''}
                            {' · '}
                            {formatScanInstant(d.completedAt)}
                          </Text>
                        </div>
                        <span
                          className="checkion-project-run-list__score"
                          data-tone={scoreTone(d.overallScore)}
                        >
                          {d.overallScore != null ? d.overallScore : '—'}
                        </span>
                      </li>
                    )
                  })}
                </ol>
                {domainsPage.hasMore ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="checkion-home-run-col__more"
                    onClick={domainsPage.showMore}
                  >
                    {t('projects.showMoreRuns', { n: domainsPage.remaining })}
                  </Button>
                ) : null}
              </>
            )}
          </div>

          <div className="checkion-home-run-col" aria-label={t('projects.pulseGeo')}>
            <h3 className="checkion-home-run-col__title">{t('projects.runsGeo')}</h3>
            {geoWindow.length === 0 ? (
              <EmptyState className="checkion-project-chapter__empty">
                {t('projects.emptyGeo')}{' '}
                <Link href={geoLaunchHref}>{t('projects.emptyGeoCta')}</Link>.
              </EmptyState>
            ) : (
              <>
                <ol className="checkion-magazine-list checkion-project-run-list">
                  {geoPage.shown.map((job, index) => (
                    <li key={job.id} data-tone={scoreTone(job.overallScore)}>
                      <span className="checkion-magazine-list-num" aria-hidden>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="checkion-project-run-list__main">
                        <Link
                          href={paths.routes.geoSection(job.id, 'overview')}
                          className="checkion-project-run-list__title"
                          title={job.url}
                        >
                          {job.title}
                        </Link>
                        <Text role="meta" as="p" className="checkion-project-run-list__meta">
                          {t('projects.geoMeta', {
                            status: job.status,
                            queries: job.queryCount,
                            cited: job.citedShare,
                          })}
                          {' · '}
                          {formatScanInstant(job.completedAt)}
                        </Text>
                      </div>
                      <span
                        className="checkion-project-run-list__score"
                        data-tone={scoreTone(job.overallScore)}
                      >
                        {job.overallScore != null ? job.overallScore : '—'}
                      </span>
                    </li>
                  ))}
                </ol>
                {geoPage.hasMore ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="checkion-home-run-col__more"
                    onClick={geoPage.showMore}
                  >
                    {t('projects.showMoreRuns', { n: geoPage.remaining })}
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </div>
        <div
          className="checkion-project-chapter__actions"
          role="group"
          aria-label={t('projects.runsActionsAria')}
        >
          <Link href={singleLaunchHref}>
            <Button variant="ghost" size="sm">
              {t('projects.runsNewSingle')}
            </Button>
          </Link>
          <Link href={deepLaunchHref}>
            <Button variant="ghost" size="sm">
              {t('projects.runsNewDeep')}
            </Button>
          </Link>
          <Link href={geoLaunchHref}>
            <Button variant="ghost" size="sm">
              {t('projects.runsNewGeo')}
            </Button>
          </Link>
        </div>
      </WorkspaceChapter>

      {seoPulse ? <SeoPulseChapter pulse={seoPulse} /> : null}

      {geoHistory ? (
        <GeoHistoryChapter
          projectId={project.id}
          history={geoHistory}
          measurement={geoHistory.measurement}
        />
      ) : null}

      <ProjectFormDialog
        open={editOpen}
        mode="edit"
        initial={project}
        onClose={() => setEditOpen(false)}
      />
      <ProjectDeleteConfirm
        open={deleteOpen}
        project={project}
        onClose={() => setDeleteOpen(false)}
      />
    </article>
  )
}
