'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Button, CardActions, EmptyState, Input, Panel, SectionChrome, StatusDot, Text } from '@msqdx/ui'
import type {
  CapabilitySyncStatus,
  DomainScanLight,
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
          <Button variant="ghost" size="md">
            Open
          </Button>
        </Link>
        <span className="checkion-collection-card-link">
          <Button variant="ghost" size="md" type="button" onClick={() => onEdit(project)}>
            Edit
          </Button>
        </span>
        <span className="checkion-collection-card-link">
          <Button variant="ghost" size="md" type="button" onClick={() => onDelete(project)}>
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
        <div className="checkion-chip-row" role="group" aria-label="Filter by capability">
          {(
            [
              ['all', 'All'],
              ['in_sync', 'In sync'],
              ['pending', 'Pending'],
              ['error', 'Error'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="checkion-domain-filter"
              data-active={capFilter === id ? 'true' : undefined}
              onClick={() => setCapFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="checkion-collection-list">
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

export function ProjectWorkspace({
  project,
  recentScans,
  domains,
}: {
  project: ProjectDetail
  recentScans: ScanSummary[]
  domains: DomainScanLight[]
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const singleScans = recentScans.filter((s) => s.mode === 'single')
  const deepScans = recentScans.filter((s) => s.mode === 'deep')
  const latestScore =
    recentScans.find((s) => s.overallScore != null)?.overallScore ??
    domains.find((d) => d.overallScore != null)?.overallScore ??
    null

  return (
    <div className="checkion-magazine checkion-project-workspace">
      <header className="checkion-project-cover">
        <p className="checkion-spread__eyebrow">Project</p>
        <h1 className="checkion-project-cover__title">{project.name}</h1>
        <p className="checkion-project-cover__lede">
          {project.description || `Capability mirror for ${project.domain}.`}
        </p>
        <div className="checkion-project-cover__meta">
          <span>{project.domain}</span>
          <span className="checkion-status-line">
            <StatusDot level={capabilityLevel(project.capabilityStatus)} />
            {project.capabilityStatus}
          </span>
          <span title="Plexon collection id">{project.platformProjectId}</span>
        </div>
        <div className="checkion-project-cover__actions">
          <Link
            href={paths.routes.scanLaunch({ projectId: project.id, mode: 'single' })}
            className="ds-btn ds-btn--primary ds-btn--sm"
          >
            <span className="ds-btn__label">New scan</span>
          </Link>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setDeleteOpen(true)}>
            Delete
          </Button>
        </div>
      </header>

      <Panel>
        <SectionChrome title="Activity" meta="Corpus pulse" />
        <div className="checkion-project-activity">
          <div>
            <p className="checkion-project-activity__label">Single scans</p>
            <p className="checkion-project-activity__value">{singleScans.length}</p>
          </div>
          <div>
            <p className="checkion-project-activity__label">Domain crawls</p>
            <p className="checkion-project-activity__value">{domains.length || deepScans.length}</p>
          </div>
          <div>
            <p className="checkion-project-activity__label">Last scan</p>
            <p className="checkion-project-activity__value checkion-project-activity__value--meta">
              {formatScanInstant(project.lastScanAt)}
            </p>
          </div>
          <div data-tone={scoreTone(latestScore)}>
            <p className="checkion-project-activity__label">Latest score</p>
            <p className="checkion-project-activity__value">
              {latestScore != null ? latestScore : '—'}
            </p>
          </div>
        </div>
      </Panel>

      <Panel>
        <SectionChrome title="Recent single scans" meta={`${singleScans.length}`} />
        {singleScans.length === 0 ? (
          <Text role="meta">No single-page scans yet.</Text>
        ) : (
          <table className="checkion-report__table checkion-projects__table" aria-label="Recent single scans">
            <thead>
              <tr>
                <th scope="col">Page</th>
                <th scope="col">Source</th>
                <th scope="col">Status</th>
                <th scope="col">Score</th>
                <th scope="col">Completed</th>
              </tr>
            </thead>
            <tbody>
              {singleScans.map((scan) => (
                <tr key={scan.id} data-tone={scoreTone(scan.overallScore)}>
                  <th scope="row">
                    <Link href={paths.routes.resultSection(scan.id, 'overview')} title={scan.url}>
                      {compactUrl(scan.url)}
                    </Link>
                  </th>
                  <td>
                    {hasAudionCorrelation(scan) ? (
                      <span title={scan.audionRunId ? `AUDION run ${scan.audionRunId}` : 'AUDION journey'}>
                        From Audion
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{scan.status}</td>
                  <td className="checkion-projects__num">
                    {scan.overallScore != null ? scan.overallScore : '—'}
                  </td>
                  <td>{formatScanInstant(scan.completedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel>
        <SectionChrome title="Domain crawls" meta={`${domains.length}`} />
        {domains.length === 0 ? (
          <Text role="meta">No domain fixtures for this project.</Text>
        ) : (
          <table className="checkion-report__table checkion-projects__table" aria-label="Domain crawls">
            <thead>
              <tr>
                <th scope="col">Root</th>
                <th scope="col">Pages</th>
                <th scope="col">Score</th>
                <th scope="col">Issues</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => (
                <tr key={d.id} data-tone={scoreTone(d.overallScore)}>
                  <th scope="row">
                    <Link href={paths.routes.domainDetail(d.id)} title={d.rootUrl}>
                      {compactUrl(d.rootUrl)}
                    </Link>
                  </th>
                  <td className="checkion-projects__num">{d.pageCount.toLocaleString()}</td>
                  <td className="checkion-projects__num">
                    {d.overallScore != null ? d.overallScore : '—'}
                  </td>
                  <td className="checkion-projects__num">{d.issueCount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

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
    </div>
  )
}
