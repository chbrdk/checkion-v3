'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Button, Input, Panel, SectionChrome, StatusDot, Text } from '@msqdx/ui'
import type {
  CapabilitySyncStatus,
  DomainScanLight,
  ProjectDetail,
  ProjectSummary,
  ScanSummary,
} from '@checkion-v3/contracts'
import { ProjectDeleteConfirm, ProjectFormDialog } from './project-form-dialog'
import { paths } from '../lib/paths'
import { formatScanInstant, scoreTone } from '../lib/scan-display'

function capabilityLevel(status: CapabilitySyncStatus) {
  if (status === 'in_sync') return 'ok' as const
  if (status === 'error') return 'critical' as const
  return 'warn' as const
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
    <div className="checkion-projects">
      <div className="checkion-projects__toolbar">
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
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          New project
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="checkion-projects__empty">
          <Text role="meta">
            {projects.length === 0
              ? 'No projects yet. Create one locally or open a collection deep-link from Plexon.'
              : 'No projects match this filter.'}
          </Text>
          {projects.length === 0 ? (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              New project
            </Button>
          ) : null}
        </div>
      ) : (
        <table className="checkion-report__table checkion-projects__table" aria-label="Projects">
          <thead>
            <tr>
              <th scope="col">Project</th>
              <th scope="col">Domain</th>
              <th scope="col">Capability</th>
              <th scope="col">Scans</th>
              <th scope="col">Last scan</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((project) => (
              <tr key={project.id}>
                <th scope="row">
                  <Link href={paths.routes.projectDetail(project.id)}>{project.name}</Link>
                </th>
                <td>{project.domain}</td>
                <td>
                  <span className="checkion-status-line">
                    <StatusDot level={capabilityLevel(project.capabilityStatus)} />
                    <span>{project.capabilityStatus}</span>
                  </span>
                </td>
                <td className="checkion-projects__num">{project.scanCount}</td>
                <td>{formatScanInstant(project.lastScanAt)}</td>
                <td className="checkion-projects__actions">
                  <Link
                    href={paths.routes.projectDetail(project.id)}
                    className="checkion-domain-filter"
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    className="checkion-domain-filter"
                    onClick={() => void openEdit(project)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="checkion-domain-filter"
                    onClick={() => setDeleteTarget(project)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

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
            href={`${paths.routes.scan}?projectId=${encodeURIComponent(project.id)}`}
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
                <th scope="col">Status</th>
                <th scope="col">Score</th>
                <th scope="col">Completed</th>
              </tr>
            </thead>
            <tbody>
              {singleScans.map((scan) => (
                <tr key={scan.id} data-tone={scoreTone(scan.overallScore)}>
                  <th scope="row">
                    <Link href={paths.routes.resultDetail(scan.id)} title={scan.url}>
                      {compactUrl(scan.url)}
                    </Link>
                  </th>
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
