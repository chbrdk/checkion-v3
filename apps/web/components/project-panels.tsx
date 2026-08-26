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

function capabilityLevel(status: CapabilitySyncStatus) {
  if (status === 'in_sync') return 'ok' as const
  if (status === 'error') return 'critical' as const
  return 'warn' as const
}

function capabilityLabel(status: CapabilitySyncStatus): string {
  if (status === 'in_sync') return 'In sync'
  if (status === 'error') return 'Error'
  return 'Pending'
}

function capabilityHint(status: CapabilitySyncStatus): string | null {
  if (status === 'pending') return 'Waiting on Plexon capability sync.'
  if (status === 'error') return 'Capability sync reported an error.'
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
  const hint = capabilityHint(project.capabilityStatus)
  const domain = project.domain?.trim() || null

  return (
    <article className="checkion-collection-card">
      <header className="checkion-collection-card-head">
        <Text role="meta" as="p" className="checkion-collection-card-kicker">
          {domain ?? '\u00a0'}
        </Text>
        <span
          className="checkion-collection-card-badge"
          data-status={project.capabilityStatus}
          title={`Capability ${capabilityLabel(project.capabilityStatus).toLowerCase()}`}
        >
          {capabilityLabel(project.capabilityStatus)}
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

      <div className="checkion-collection-card-stats" aria-label="Project metrics">
        <ProjectMetric
          icon={<MetricIconScans />}
          value={String(project.scanCount)}
          label="Scans"
        />
        <ProjectMetric
          icon={<MetricIconLastScan />}
          value={formatScanShort(project.lastScanAt)}
          label="Last scan"
          linked={project.lastScanAt != null}
        />
      </div>

      <CardActions className="checkion-collection-card-actions">
        <Link href={paths.routes.projectDetail(project.id)} className="checkion-collection-card-link">
          <Button variant="ghost">Open</Button>
        </Link>
        <span className="checkion-collection-card-link">
          <Button variant="ghost" type="button" onClick={() => onEdit(project)}>
            Edit
          </Button>
        </span>
        <span className="checkion-collection-card-link">
          <Button variant="ghost" type="button" onClick={() => onDelete(project)}>
            Delete
          </Button>
        </span>
      </CardActions>
    </article>
  )
}

function CreateProjectCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="checkion-collection-card checkion-collection-card--create"
      onClick={onClick}
    >
      <span className="checkion-collection-card-kicker">{'\u00a0'}</span>
      <Text role="headline" as="span" className="checkion-collection-card-title">
        New project
      </Text>
      <Text role="meta" as="span" className="checkion-collection-card-hint">
        Local CHECKION record for a Plexon collection.
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
        <Text role="meta" as="p" className="checkion-projects-list-row__meta">
          {domain ?? 'No domain'}
          {' · '}
          {project.scanCount.toLocaleString()} scans
          {' · '}
          {formatScanShort(project.lastScanAt)}
        </Text>
      </div>
      <span
        className="checkion-collection-card-badge checkion-projects-list-row__badge"
        data-status={project.capabilityStatus}
      >
        {capabilityLabel(project.capabilityStatus)}
      </span>
      <div className="checkion-projects-list-row__actions">
        <Link href={paths.routes.projectDetail(project.id)}>
          <Button variant="ghost" size="sm">
            Open
          </Button>
        </Link>
        <Button variant="ghost" size="sm" type="button" onClick={() => onEdit(project)}>
          Edit
        </Button>
        <Button variant="ghost" size="sm" type="button" onClick={() => onDelete(project)}>
          Delete
        </Button>
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
          placeholder="Search name or domain"
          aria-label="Search projects"
        />
        <FilterRow role="group" aria-label="Filter by capability">
          {(
            [
              ['all', 'All'],
              ['in_sync', 'In sync'],
              ['pending', 'Pending'],
              ['error', 'Error'],
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
        <FilterRow role="group" aria-label="Project layout">
          <Chip size="sm" selected={view === 'tiles'} onClick={() => setView('tiles')}>
            Tiles
          </Chip>
          <Chip size="sm" selected={view === 'list'} onClick={() => setView('list')}>
            List
          </Chip>
        </FilterRow>
      </div>

      <div className="checkion-collection-list">
        {view === 'tiles' ? (
          <div className="checkion-collection-grid" aria-label="Projects">
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
              <span className="checkion-projects-list-create__label">New project</span>
              <span className="checkion-projects-list-create__deck">
                Local CHECKION record for a Plexon collection.
              </span>
            </button>
            {filtered.length > 0 ? (
              <ol className="checkion-magazine-list checkion-projects-list" aria-label="Projects">
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
            {projects.length === 0
              ? 'No projects yet. Create one locally or open a collection deep-link from Plexon.'
              : 'No projects match this filter.'}
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
  const syncLabel = capabilityLabel(project.capabilityStatus)
  const syncHint = capabilityHint(project.capabilityStatus)

  return (
    <article
      className="checkion-magazine checkion-magazine--editorial checkion-project-workspace"
      data-section="project-workspace"
    >
      <div className="checkion-magazine-topbar">
        <nav className="briefing-nav signal-nav" aria-label="Breadcrumb">
          <Link href={paths.routes.projects}>Projects</Link>
          <span className="briefing-nav-sep" aria-hidden>
            /
          </span>
          <span>{project.name}</span>
        </nav>
        <div className="checkion-magazine-topbar-actions">
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setDeleteOpen(true)}>
            Delete
          </Button>
        </div>
      </div>

      <header className="checkion-project-cover">
        <div className="checkion-project-cover__copy">
          <p className="checkion-cover__kicker">CHECKION capability</p>
          <h1 className="checkion-project-cover__title">{project.name}</h1>
          <p className="checkion-project-cover__host">{project.domain}</p>
          <p className="checkion-project-cover__lede">
            {project.description || `Capability mirror for ${project.domain}.`}
          </p>
          <ul className="checkion-magazine-facets geo-places" aria-label="Project attributes">
            <li data-kind={project.capabilityStatus}>
              <span className="meta">Capability</span>
              <span className="checkion-status-line">
                <StatusDot level={capabilityLevel(project.capabilityStatus)} />
                {syncLabel}
              </span>
            </li>
            <li data-kind="collection">
              <span className="meta">Collection</span>
              <span title="Plexon collection id">{project.platformProjectId}</span>
            </li>
            <li data-kind="time">
              <span className="meta">Last activity</span>
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
          <Link href={paths.routes.scanLaunch({ projectId: project.id, mode: 'single' })}>
            <Button variant="primary" size="lg">
              New scan
            </Button>
          </Link>
          <Link href={geoHref}>
            <Button variant="ghost" size="lg">
              {latestGeo ? 'Open GEO' : 'Start GEO'}
            </Button>
          </Link>
        </div>
      </header>

      <WorkspaceChapter
        eyebrow="01 · Pulse"
        title="Corpus pulse"
        deck="How this capability has been reading the site — singles, deep scans, and answer-engine presence."
      >
        <div className="checkion-project-pulse" aria-label="Corpus pulse">
          <div className="checkion-project-pulse__meter">
            <p className="checkion-project-pulse__value">{singleScans.length}</p>
            <p className="checkion-project-pulse__label">Single scans</p>
          </div>
          <div className="checkion-project-pulse__meter">
            <p className="checkion-project-pulse__value">{domainCount}</p>
            <p className="checkion-project-pulse__label">Deep scans</p>
          </div>
          <div className="checkion-project-pulse__meter">
            <p className="checkion-project-pulse__value">{geoJobs.length}</p>
            <p className="checkion-project-pulse__label">GEO runs</p>
          </div>
          <div className="checkion-project-pulse__meter" data-tone={scoreTone(latestScore)}>
            <p className="checkion-project-pulse__value">
              {latestScore != null ? latestScore : '—'}
            </p>
            <p className="checkion-project-pulse__label">Latest score</p>
          </div>
        </div>
      </WorkspaceChapter>

      <WorkspaceChapter
        eyebrow="02 · Pages"
        title="Single scans"
        deck="One URL, one magazine — WCAG and page signals."
        meta={`${singleScans.length}`}
      >
        {singleScans.length === 0 ? (
          <EmptyState className="checkion-project-chapter__empty">
            No single-page scans yet.{' '}
            <Link href={paths.routes.scanLaunch({ projectId: project.id, mode: 'single' })}>
              Start one
            </Link>
            .
          </EmptyState>
        ) : (
          <ol className="checkion-magazine-list checkion-project-run-list" aria-label="Recent single scans">
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
                    {hasAudionCorrelation(scan) ? ' · From Audion' : null}
                    {' · '}
                    {formatScanInstant(scan.completedAt)}
                  </Text>
                </div>
                <span className="checkion-project-run-list__score" data-tone={scoreTone(scan.overallScore)}>
                  {scan.overallScore != null ? scan.overallScore : '—'}
                </span>
              </li>
            ))}
          </ol>
        )}
      </WorkspaceChapter>

      <WorkspaceChapter
        eyebrow="03 · Corpus"
        title="Deep scans"
        deck="Spider the host into a light corpus magazine."
        meta={`${domains.length}`}
      >
        {domains.length === 0 ? (
          <EmptyState className="checkion-project-chapter__empty">
            No deep scans yet.{' '}
            <Link href={paths.routes.scanLaunch({ projectId: project.id, mode: 'deep' })}>
              Launch a deep scan
            </Link>
            .
          </EmptyState>
        ) : (
          <ol className="checkion-magazine-list checkion-project-run-list" aria-label="Deep scans">
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
                    {d.pageCount.toLocaleString()} pages · {d.issueCount.toLocaleString()} issues
                    {' · '}
                    {formatScanInstant(d.completedAt)}
                  </Text>
                </div>
                <span className="checkion-project-run-list__score" data-tone={scoreTone(d.overallScore)}>
                  {d.overallScore != null ? d.overallScore : '—'}
                </span>
              </li>
            ))}
          </ol>
        )}
      </WorkspaceChapter>

      <WorkspaceChapter
        eyebrow="04 · Presence"
        title="GEO runs"
        deck="Where answer engines place this domain."
        meta={`${geoJobs.length}`}
      >
        {geoJobs.length === 0 ? (
          <EmptyState className="checkion-project-chapter__empty">
            No GEO magazines yet.{' '}
            <Link
              href={paths.routes.scanLaunch({
                projectId: project.id,
                mode: 'geo',
                url: project.domain.startsWith('http') ? project.domain : `https://${project.domain}`,
              })}
            >
              Start GEO
            </Link>
            .
          </EmptyState>
        ) : (
          <ol className="checkion-magazine-list checkion-project-run-list" aria-label="GEO runs">
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
                    {job.status} · {job.queryCount} queries · {job.citedShare}% cited
                    {' · '}
                    {formatScanInstant(job.completedAt)}
                  </Text>
                </div>
                <span className="checkion-project-run-list__score" data-tone={scoreTone(job.overallScore)}>
                  {job.overallScore != null ? job.overallScore : '—'}
                </span>
              </li>
            ))}
          </ol>
        )}
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
