'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Button, CardActions, Chip, EmptyState, FilterRow, Input, StatusDot, Text } from '@msqdx/ui'
import type {
  CapabilitySyncStatus,
  DomainScanLight,
  GeoJobSummary,
  ProjectDetail,
  ProjectSummary,
  ScanSummary,
} from '@checkion-v3/contracts'
import { ProjectDeleteConfirm, ProjectFormDialog } from './project-form-dialog'
import { MetricIconLastScan, MetricIconScans } from './nav-icons'
import { paths } from '../lib/paths'
import { formatScanInstant, formatScanShort, scoreTone } from '../lib/scan-display'
import { hasAudionCorrelation } from '../lib/scan-correlation'
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

function compactUrl(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '')
    const full = `${u.hostname}${path}`
    return full.length > 52 ? `${full.slice(0, 49)}…` : full
  } catch {
    return url.length > 52 ? `${url.slice(0, 49)}…` : url
  }
}

type CapFilter = 'all' | CapabilitySyncStatus
type ProjectsView = 'tiles' | 'list'

function ProjectMetric({
  icon,
  value,
  label,
  linked = true,
}: {
  icon: ReactNode
  value: string
  label: string
  linked?: boolean
}) {
  return (
    <div className="checkion-collection-metric" data-linked={linked ? 'true' : 'false'}>
      <span className="checkion-collection-metric-icon" aria-hidden>
        {icon}
      </span>
      <span className="checkion-collection-metric-value">{value}</span>
      <span className="checkion-collection-metric-label">{label}</span>
    </div>
  )
}

function ProjectCollectionCard({
  project,
  onEdit,
  onDelete,
}: {
  project: ProjectSummary
  onEdit: (project: ProjectSummary) => void
  onDelete: (project: ProjectSummary) => void
}) {
  const t = useT()
  const hint = capabilityHint(project.capabilityStatus, t)
  const domain = project.domain?.trim() || null
  const cap = capabilityLabel(project.capabilityStatus, t)

  return (
    <article className="checkion-collection-card">
      <header className="checkion-collection-card-head">
        <Text role="meta" as="p" className="checkion-collection-card-kicker">
          {domain ?? '\u00a0'}
        </Text>
        <span
          className="checkion-collection-card-badge"
          data-status={project.capabilityStatus}
          title={t('projects.capabilityBadgeTitle', { status: cap.toLowerCase() })}
        >
          {cap}
        </span>
      </header>

      <Text role="headline" as="h3" className="checkion-collection-card-title">
        {project.name}
      </Text>

      {hint ? (
        <Text role="meta" as="p" className="checkion-collection-card-hint">
          {hint}
        </Text>
      ) : null}

      <div className="checkion-collection-card-stats" aria-label={t('projects.metricsAria')}>
        <ProjectMetric
          icon={<MetricIconScans />}
          value={String(project.scanCount)}
          label={t('common.scans')}
        />
        <ProjectMetric
          icon={<MetricIconLastScan />}
          value={formatScanShort(project.lastScanAt)}
          label={t('common.lastScan')}
          linked={project.lastScanAt != null}
        />
      </div>

      <CardActions className="checkion-collection-card-actions">
        <Link href={paths.routes.projectDetail(project.id)} className="checkion-collection-card-link">
          <Button variant="ghost">{t('common.open')}</Button>
        </Link>
        <span className="checkion-collection-card-link">
          <Button variant="ghost" type="button" onClick={() => onEdit(project)}>
            {t('common.edit')}
          </Button>
        </span>
        <span className="checkion-collection-card-link">
          <Button variant="ghost" type="button" onClick={() => onDelete(project)}>
            {t('projects.archiveConfirm')}
          </Button>
        </span>
      </CardActions>
    </article>
  )
}

function CreateProjectCard({ onClick }: { onClick: () => void }) {
  const t = useT()
  return (
    <button
      type="button"
      className="checkion-collection-card checkion-collection-card--create"
      onClick={onClick}
    >
      <span className="checkion-collection-card-kicker">{'\u00a0'}</span>
      <Text role="headline" as="span" className="checkion-collection-card-title">
        {t('projects.createTitle')}
      </Text>
      <Text role="meta" as="span" className="checkion-collection-card-hint">
        {t('projects.createDeck')}
      </Text>
    </button>
  )
}

function ProjectListRow({
  project,
  index,
  onEdit,
  onDelete,
}: {
  project: ProjectSummary
  index: number
  onEdit: (project: ProjectSummary) => void
  onDelete: (project: ProjectSummary) => void
}) {
  const t = useT()
  const domain = project.domain?.trim() || null
  return (
    <li className="checkion-projects-list-row">
      <span className="checkion-magazine-list-num" aria-hidden>
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="checkion-projects-list-row__main">
        <Link
          href={paths.routes.projectDetail(project.id)}
          className="checkion-projects-list-row__title"
        >
          {project.name}
        </Link>
        <Text role="meta" as="p" className="checkion-projects-list-row__domain">
          {domain ?? t('projects.noDomain')}
        </Text>
        <p className="checkion-projects-list-row__metrics" aria-label={t('projects.metricsAria')}>
          <span>{t('projects.scanCount', { count: project.scanCount.toLocaleString() })}</span>
          <span aria-hidden>·</span>
          <span>{formatScanShort(project.lastScanAt)}</span>
        </p>
      </div>
      <div className="checkion-projects-list-row__trail">
        <span
          className="checkion-collection-card-badge checkion-projects-list-row__badge"
          data-status={project.capabilityStatus}
        >
          {capabilityLabel(project.capabilityStatus, t)}
        </span>
        <div className="checkion-projects-list-row__actions">
          <Link href={paths.routes.projectDetail(project.id)}>
            <Button variant="ghost" size="sm">
              {t('common.open')}
            </Button>
          </Link>
          <Button variant="ghost" size="sm" type="button" onClick={() => onEdit(project)}>
            {t('common.edit')}
          </Button>
          <Button variant="ghost" size="sm" type="button" onClick={() => onDelete(project)}>
            {t('projects.archiveConfirm')}
          </Button>
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
  const [view, setView] = useState<ProjectsView>('tiles')
  const [createOpen, setCreateOpen] = useState(Boolean(bindPlatformProjectId))
  const [editTarget, setEditTarget] = useState<ProjectDetail | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(null)
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

  async function openEdit(project: ProjectSummary) {
    try {
      const res = await fetch(paths.routes.apiProjectDetail(project.id), { cache: 'no-store' })
      if (!res.ok) throw new Error('load_failed')
      const detail = (await res.json()) as ProjectDetail
      setEditTarget(detail)
    } catch {
      setEditTarget({
        ...project,
        description: '',
        recentScanIds: [],
      })
    }
  }

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
        <FilterRow role="group" aria-label={t('projects.layoutAria')}>
          <Chip size="sm" selected={view === 'tiles'} onClick={() => setView('tiles')}>
            {t('projects.tiles')}
          </Chip>
          <Chip size="sm" selected={view === 'list'} onClick={() => setView('list')}>
            {t('projects.list')}
          </Chip>
        </FilterRow>
      </div>

      <div className="checkion-collection-list">
        {view === 'tiles' ? (
          <div className="checkion-collection-grid" aria-label={t('projects.listAria')}>
            <CreateProjectCard onClick={() => setCreateOpen(true)} />
            {filtered.map((project) => (
              <ProjectCollectionCard
                key={project.id}
                project={project}
                onEdit={(p) => void openEdit(p)}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        ) : (
          <div className="checkion-projects-list-wrap">
            <button
              type="button"
              className="checkion-projects-list-create"
              onClick={() => setCreateOpen(true)}
            >
              <span className="checkion-projects-list-create__label">{t('projects.createTitle')}</span>
              <span className="checkion-projects-list-create__deck">
                {t('projects.createDeck')}
              </span>
            </button>
            {filtered.length > 0 ? (
              <ol className="checkion-magazine-list checkion-projects-list" aria-label={t('projects.listAria')}>
                {filtered.map((project, index) => (
                  <ProjectListRow
                    key={project.id}
                    project={project}
                    index={index}
                    onEdit={(p) => void openEdit(p)}
                    onDelete={setDeleteTarget}
                  />
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
      <ProjectFormDialog
        open={editTarget != null}
        mode="edit"
        initial={editTarget ?? undefined}
        onClose={() => setEditTarget(null)}
      />
      <ProjectDeleteConfirm
        open={deleteTarget != null}
        project={deleteTarget}
        onClose={() => setDeleteTarget(null)}
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
}: {
  project: ProjectDetail
  recentScans: ScanSummary[]
  domains: DomainScanLight[]
  geoJobs?: GeoJobSummary[]
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const t = useT()

  const singleScans = recentScans.filter((s) => s.mode === 'single')
  const deepScans = recentScans.filter((s) => s.mode === 'deep')
  const domainCount = domains.length || deepScans.length
  const latestGeo = geoJobs[0] ?? null
  const latestScore =
    recentScans.find((s) => s.overallScore != null)?.overallScore ??
    domains.find((d) => d.overallScore != null)?.overallScore ??
    latestGeo?.overallScore ??
    null
  const geoHref = latestGeo
    ? paths.routes.geoSection(latestGeo.id, 'overview')
    : paths.routes.scanLaunch({
        projectId: project.id,
        mode: 'geo',
        url: project.domain.startsWith('http') ? project.domain : `https://${project.domain}`,
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
        <div className="checkion-magazine-topbar-actions">
          <Link href={paths.routes.scanLaunch({ projectId: project.id, mode: 'single' })}>
            <Button variant="primary" size="sm">
              {t('projects.newScan')}
            </Button>
          </Link>
          <Link href={geoHref}>
            <Button variant="ghost" size="sm">
              {latestGeo ? t('projects.openGeo') : t('projects.startGeo')}
            </Button>
          </Link>
        </div>
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
        <div className="checkion-project-cover__actions">
          <Button type="button" size="lg" variant="ghost" onClick={() => setEditOpen(true)}>
            {t('common.edit')}
          </Button>
          <Button type="button" size="lg" variant="ghost" onClick={() => setDeleteOpen(true)}>
            {t('projects.archiveConfirm')}
          </Button>
        </div>
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
            {singleScans.length === 0 ? (
              <EmptyState className="checkion-project-chapter__empty">
                {t('projects.emptySingles')}{' '}
                <Link href={paths.routes.scanLaunch({ projectId: project.id, mode: 'single' })}>
                  {t('projects.emptySinglesCta')}
                </Link>
                .
              </EmptyState>
            ) : (
              <ol className="checkion-magazine-list checkion-project-run-list">
                {singleScans.map((scan, index) => (
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
                        {compactUrl(scan.url)}
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
            )}
          </div>

          <div className="checkion-home-run-col" aria-label={t('projects.pulseDeep')}>
            <h3 className="checkion-home-run-col__title">{t('projects.runsDeep')}</h3>
            {domains.length === 0 ? (
              <EmptyState className="checkion-project-chapter__empty">
                {t('projects.emptyDeep')}{' '}
                <Link href={paths.routes.scanLaunch({ projectId: project.id, mode: 'deep' })}>
                  {t('projects.emptyDeepCta')}
                </Link>
                .
              </EmptyState>
            ) : (
              <ol className="checkion-magazine-list checkion-project-run-list">
                {domains.map((d, index) => (
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
                        {compactUrl(d.rootUrl)}
                      </Link>
                      <Text role="meta" as="p" className="checkion-project-run-list__meta">
                        {t('projects.pagesIssues', {
                          pages: d.pageCount.toLocaleString(),
                          issues: d.issueCount.toLocaleString(),
                        })}
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
                ))}
              </ol>
            )}
          </div>

          <div className="checkion-home-run-col" aria-label={t('projects.pulseGeo')}>
            <h3 className="checkion-home-run-col__title">{t('projects.runsGeo')}</h3>
            {geoJobs.length === 0 ? (
              <EmptyState className="checkion-project-chapter__empty">
                {t('projects.emptyGeo')}{' '}
                <Link
                  href={paths.routes.scanLaunch({
                    projectId: project.id,
                    mode: 'geo',
                    url: project.domain.startsWith('http')
                      ? project.domain
                      : `https://${project.domain}`,
                  })}
                >
                  {t('projects.emptyGeoCta')}
                </Link>
                .
              </EmptyState>
            ) : (
              <ol className="checkion-magazine-list checkion-project-run-list">
                {geoJobs.map((job, index) => (
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
            )}
          </div>
        </div>
      </WorkspaceChapter>

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
