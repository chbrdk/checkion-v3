'use client'

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
import { useT } from '../lib/user-prefs'
import type { Translator } from '../lib/i18n'

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

function capabilityLabel(status: ProjectSummary['capabilityStatus'], t: Translator): string {
  if (status === 'in_sync') return t('common.capabilityInSync')
  if (status === 'error') return t('common.capabilityError')
  return t('common.capabilityPending')
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
  const t = useT()
  const domain = project.domain?.trim() || null
  const cap = capabilityLabel(project.capabilityStatus, t)
  return (
    <article className="checkion-collection-card checkion-home-project-card">
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
      <div className="checkion-collection-card-stats" aria-label={t('projects.metricsAria')}>
        <div className="checkion-collection-metric" data-linked="true">
          <span className="checkion-collection-metric-value">{project.scanCount}</span>
          <span className="checkion-collection-metric-label">{t('common.scans')}</span>
        </div>
        <div
          className="checkion-collection-metric"
          data-linked={project.lastScanAt != null ? 'true' : 'false'}
        >
          <span className="checkion-collection-metric-value">
            {formatScanShort(project.lastScanAt)}
          </span>
          <span className="checkion-collection-metric-label">{t('common.lastScan')}</span>
        </div>
      </div>
      <div className="checkion-collection-card-actions">
        <Link href={paths.routes.projectDetail(project.id)} className="checkion-collection-card-link">
          <Button variant="ghost">{t('common.open')}</Button>
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
  const t = useT()
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
        <p className="checkion-cover__kicker">{t('home.kicker')}</p>
        <h1 className="checkion-home-cover__title">{t('home.title')}</h1>
        <p className="checkion-home-cover__lede">{t('home.lede')}</p>
        <div className="checkion-home-cover__actions">
          <Link href={paths.routes.scan}>
            <Button>{t('projects.newScan')}</Button>
          </Link>
          <Link href={paths.routes.projects}>
            <Button variant="ghost">{t('nav.projects')}</Button>
          </Link>
        </div>
      </header>

      <HomeChapter
        eyebrow={t('home.launchEyebrow')}
        title={t('home.launchTitle')}
        deck={t('home.launchDeck')}
      >
        <div className="checkion-home-cta-row" role="group" aria-label={t('home.launchAria')}>
          <Link
            href={paths.routes.scanLaunch({ mode: 'single' })}
            className="checkion-capability-tile checkion-home-cta"
          >
            <span className="checkion-capability-tile__kicker">{t('home.singleKicker')}</span>
            <span className="checkion-capability-tile__label">{t('home.singleLabel')}</span>
            <span className="checkion-capability-tile__deck">{t('home.singleDeck')}</span>
          </Link>
          <Link
            href={paths.routes.scanLaunch({ mode: 'deep' })}
            className="checkion-capability-tile checkion-home-cta"
          >
            <span className="checkion-capability-tile__kicker">{t('home.deepKicker')}</span>
            <span className="checkion-capability-tile__label">{t('home.deepLabel')}</span>
            <span className="checkion-capability-tile__deck">{t('home.deepDeck')}</span>
          </Link>
          <Link
            href={paths.routes.scanLaunch({ mode: 'geo' })}
            className="checkion-capability-tile checkion-home-cta"
          >
            <span className="checkion-capability-tile__kicker">{t('home.geoKicker')}</span>
            <span className="checkion-capability-tile__label">{t('home.geoLabel')}</span>
            <span className="checkion-capability-tile__deck">{t('home.geoDeck')}</span>
          </Link>
        </div>
      </HomeChapter>

      <HomeChapter
        eyebrow={t('home.runsEyebrow')}
        title={t('home.runsTitle')}
        deck={t('home.runsDeck')}
      >
        <div className="checkion-home-run-columns" aria-label={t('home.runsAria')}>
          <RunColumn
            title={t('home.singles')}
            ariaLabel={t('home.singlesAria')}
            empty={
              singleList.length === 0 ? (
                <EmptyState className="checkion-project-chapter__empty">
                  {t('home.emptySingles')}{' '}
                  <Link href={paths.routes.scanLaunch({ mode: 'single' })}>
                    {t('home.emptySinglesCta')}
                  </Link>
                  .
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
            title={t('home.deepScans')}
            ariaLabel={t('home.deepScansAria')}
            empty={
              deepList.length === 0 ? (
                <EmptyState className="checkion-project-chapter__empty">
                  {t('home.emptyDeep')}{' '}
                  <Link href={paths.routes.scanLaunch({ mode: 'deep' })}>
                    {t('home.emptyDeepCta')}
                  </Link>
                  .
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
                    {t('home.pagesIssues', {
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
          </RunColumn>

          <RunColumn
            title={t('home.geoRuns')}
            ariaLabel={t('home.geoRunsAria')}
            empty={
              geoList.length === 0 ? (
                <EmptyState className="checkion-project-chapter__empty">
                  {t('home.emptyGeo')}{' '}
                  <Link href={paths.routes.scanLaunch({ mode: 'geo' })}>
                    {t('home.emptyGeoCta')}
                  </Link>
                  .
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
        eyebrow={t('home.projectsEyebrow')}
        title={t('home.projectsTitle')}
        deck={t('home.projectsDeck')}
        meta={recentProjects.length > 0 ? `${recentProjects.length}` : undefined}
      >
        {recentProjects.length === 0 ? (
          <EmptyState className="checkion-project-chapter__empty">
            {t('home.emptyProjects')}{' '}
            <Link href={paths.routes.projects}>{t('home.emptyProjectsCta')}</Link>.
          </EmptyState>
        ) : (
          <div
            className="checkion-collection-grid checkion-home-projects"
            aria-label={t('home.projectsAria')}
          >
            {recentProjects.map((project) => (
              <HomeProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </HomeChapter>
    </article>
  )
}
