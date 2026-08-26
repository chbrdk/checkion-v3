import Link from 'next/link'
import type { ReactNode } from 'react'
import type {
  DomainScanLight,
  GeoJobSummary,
  ProjectSummary,
  ScanSummary,
} from '@checkion-v3/contracts'
import { Button, EmptyState, Text } from '@msqdx/ui'
import { formatScanInstant, formatScanShort, scoreTone } from '../lib/scan-display'
import { paths } from '../lib/paths'

export type HomeSingleRun = {
  id: string
  href: string
  label: string
  score: number | null
  completedAt: string | null
  status: string
}

function compactUrl(raw: string): string {
  try {
    const u = new URL(raw)
    const path = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '')
    return `${u.host}${path}`
  } catch {
    return raw
  }
}

function byCompletedAtDesc<T extends { completedAt: string | null }>(a: T, b: T): number {
  const ta = a.completedAt ? Date.parse(a.completedAt) : 0
  const tb = b.completedAt ? Date.parse(b.completedAt) : 0
  return tb - ta
}

/** Recent completed/failed single-page scans, newest first. */
export function buildHomeSingleRuns(scans: ScanSummary[], limit = 8): HomeSingleRun[] {
  return scans
    .filter((s) => s.status === 'completed' || s.status === 'failed')
    .map((s) => ({
      id: s.id,
      href: paths.routes.resultSection(s.id, 'overview'),
      label: compactUrl(s.url),
      score: s.overallScore,
      completedAt: s.completedAt,
      status: s.status,
    }))
    .sort(byCompletedAtDesc)
    .slice(0, limit)
}

export function buildHomeRecentProjects(projects: ProjectSummary[], limit = 5): ProjectSummary[] {
  return [...projects]
    .sort((a, b) => {
      const ta = a.lastScanAt ? Date.parse(a.lastScanAt) : 0
      const tb = b.lastScanAt ? Date.parse(b.lastScanAt) : 0
      if (tb !== ta) return tb - ta
      return a.name.localeCompare(b.name)
    })
    .slice(0, limit)
}

function capabilityLabel(status: ProjectSummary['capabilityStatus']): string {
  if (status === 'in_sync') return 'In sync'
  if (status === 'error') return 'Error'
  return 'Pending'
}

function HomeChapter({
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
    <section className="checkion-project-chapter checkion-home-chapter">
      <header className="checkion-project-chapter__head">
        <div>
          <p className="checkion-spread__eyebrow">{eyebrow}</p>
          <h2 className="checkion-spread__headline">{title}</h2>
          {deck ? <p className="checkion-project-chapter__deck">{deck}</p> : null}
        </div>
        {meta ? (
          <Text role="meta" as="p">
            {meta}
          </Text>
        ) : null}
      </header>
      {children}
    </section>
  )
}

function RunColumn({
  title,
  ariaLabel,
  empty,
  children,
}: {
  title: string
  ariaLabel: string
  empty?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="checkion-home-run-col" aria-label={ariaLabel}>
      <h3 className="checkion-home-run-col__title">{title}</h3>
      {empty != null ? (
        empty
      ) : (
        <ol className="checkion-magazine-list checkion-project-run-list">{children}</ol>
      )}
    </div>
  )
}

function HomeProjectCard({ project }: { project: ProjectSummary }) {
  const domain = project.domain?.trim() || null
  return (
    <article className="checkion-collection-card checkion-home-project-card">
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
      <div className="checkion-collection-card-stats" aria-label="Project metrics">
        <div className="checkion-collection-metric" data-linked="true">
          <span className="checkion-collection-metric-value">{project.scanCount}</span>
          <span className="checkion-collection-metric-label">Scans</span>
        </div>
        <div
          className="checkion-collection-metric"
          data-linked={project.lastScanAt != null ? 'true' : 'false'}
        >
          <span className="checkion-collection-metric-value">
            {formatScanShort(project.lastScanAt)}
          </span>
          <span className="checkion-collection-metric-label">Last scan</span>
        </div>
      </div>
      <div className="checkion-collection-card-actions">
        <Link href={paths.routes.projectDetail(project.id)} className="checkion-collection-card-link">
          <Button variant="ghost">Open</Button>
        </Link>
      </div>
    </article>
  )
}

export function HomeMagazine({
  projects,
  scans,
  domains,
  geoJobs,
}: {
  projects: ProjectSummary[]
  scans: ScanSummary[]
  domains: DomainScanLight[]
  geoJobs: GeoJobSummary[]
}) {
  const singleList = buildHomeSingleRuns(scans, 8)
  const deepList = [...domains].sort(byCompletedAtDesc).slice(0, 8)
  const geoList = [...geoJobs].sort(byCompletedAtDesc).slice(0, 8)
  const recentProjects = buildHomeRecentProjects(projects, 5)

  return (
    <article
      className="checkion-magazine checkion-magazine--editorial checkion-magazine--home"
      data-section="home-magazine"
    >
      <header className="checkion-home-cover">
        <p className="checkion-cover__kicker">CHECKION</p>
        <h1 className="checkion-home-cover__title">Reading the site</h1>
        <p className="checkion-home-cover__lede">
          Latest accessibility, deep corpus, and GEO runs — scores at a glance, magazines one click
          away.
        </p>
        <div className="checkion-home-cover__actions">
          <Link href={paths.routes.scan}>
            <Button>New scan</Button>
          </Link>
          <Link href={paths.routes.projects}>
            <Button variant="ghost">Projects</Button>
          </Link>
        </div>
      </header>

      <HomeChapter
        eyebrow="01 · Launch"
        title="Start a run"
        deck="Pick a path — single page, host-wide deep, or answer-engine presence."
      >
        <div className="checkion-home-cta-row" role="group" aria-label="Launch actions">
          <Link
            href={paths.routes.scanLaunch({ mode: 'single' })}
            className="checkion-capability-tile checkion-home-cta"
          >
            <span className="checkion-capability-tile__kicker">01 · WCAG</span>
            <span className="checkion-capability-tile__label">Single</span>
            <span className="checkion-capability-tile__deck">
              One page, fast WCAG read — drop into the result magazine.
            </span>
          </Link>
          <Link
            href={paths.routes.scanLaunch({ mode: 'deep' })}
            className="checkion-capability-tile checkion-home-cta"
          >
            <span className="checkion-capability-tile__kicker">02 · Corpus</span>
            <span className="checkion-capability-tile__label">Deep</span>
            <span className="checkion-capability-tile__deck">
              Host-wide crawl with page counts and systemic issues.
            </span>
          </Link>
          <Link
            href={paths.routes.scanLaunch({ mode: 'geo' })}
            className="checkion-capability-tile checkion-home-cta"
          >
            <span className="checkion-capability-tile__kicker">03 · Presence</span>
            <span className="checkion-capability-tile__label">GEO</span>
            <span className="checkion-capability-tile__deck">
              Competitive presence across answer engines.
            </span>
          </Link>
        </div>
      </HomeChapter>

      <HomeChapter
        eyebrow="02 · Runs"
        title="Latest runs"
        deck="Singles, deep corpus, and GEO — numbered lists with score color bands."
      >
        <div className="checkion-home-run-columns" aria-label="Latest runs by mode">
          <RunColumn
            title="Singles"
            ariaLabel="Single scans"
            empty={
              singleList.length === 0 ? (
                <EmptyState className="checkion-project-chapter__empty">
                  No singles yet.{' '}
                  <Link href={paths.routes.scanLaunch({ mode: 'single' })}>Launch one</Link>.
                </EmptyState>
              ) : undefined
            }
          >
            {singleList.map((run, index) => (
              <li key={run.id} data-tone={scoreTone(run.score)}>
                <span className="checkion-magazine-list-num" aria-hidden>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="checkion-project-run-list__main">
                  <Link
                    href={run.href}
                    className="checkion-project-run-list__title"
                    title={run.label}
                  >
                    {run.label}
                  </Link>
                  <Text role="meta" as="p" className="checkion-project-run-list__meta">
                    {run.status}
                    {' · '}
                    {formatScanInstant(run.completedAt)}
                  </Text>
                </div>
                <span
                  className="checkion-project-run-list__score"
                  data-tone={scoreTone(run.score)}
                >
                  {run.score != null ? run.score : '—'}
                </span>
              </li>
            ))}
          </RunColumn>

          <RunColumn
            title="Deep scans"
            ariaLabel="Deep scans"
            empty={
              deepList.length === 0 ? (
                <EmptyState className="checkion-project-chapter__empty">
                  No deep scans yet.{' '}
                  <Link href={paths.routes.scanLaunch({ mode: 'deep' })}>Launch a deep scan</Link>.
                </EmptyState>
              ) : undefined
            }
          >
            {deepList.map((d, index) => (
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
                <span
                  className="checkion-project-run-list__score"
                  data-tone={scoreTone(d.overallScore)}
                >
                  {d.overallScore != null ? d.overallScore : '—'}
                </span>
              </li>
            ))}
          </RunColumn>

          <RunColumn
            title="GEO runs"
            ariaLabel="GEO runs"
            empty={
              geoList.length === 0 ? (
                <EmptyState className="checkion-project-chapter__empty">
                  No GEO runs yet.{' '}
                  <Link href={paths.routes.scanLaunch({ mode: 'geo' })}>Launch GEO</Link>.
                </EmptyState>
              ) : undefined
            }
          >
            {geoList.map((job, index) => (
              <li key={job.id} data-tone={scoreTone(job.overallScore)}>
                <span className="checkion-magazine-list-num" aria-hidden>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="checkion-project-run-list__main">
                  <Link
                    href={paths.routes.geoSection(job.id, 'overview')}
                    className="checkion-project-run-list__title"
                    title={job.title || job.url}
                  >
                    {job.title || compactUrl(job.url)}
                  </Link>
                  <Text role="meta" as="p" className="checkion-project-run-list__meta">
                    {job.status}
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
          </RunColumn>
        </div>
      </HomeChapter>

      <HomeChapter
        eyebrow="03 · Projects"
        title="Recent projects"
        deck="Collections this capability has been reading."
        meta={recentProjects.length > 0 ? `${recentProjects.length}` : undefined}
      >
        {recentProjects.length === 0 ? (
          <EmptyState className="checkion-project-chapter__empty">
            No projects yet.{' '}
            <Link href={paths.routes.projects}>Open projects</Link>.
          </EmptyState>
        ) : (
          <div className="checkion-collection-grid checkion-home-projects" aria-label="Recent projects">
            {recentProjects.map((project) => (
              <HomeProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </HomeChapter>
    </article>
  )
}
