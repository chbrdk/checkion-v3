import Link from 'next/link'
import type { ReactNode } from 'react'
import type {
  DomainScanLight,
  GeoJobSummary,
  ProjectSummary,
  ScanSummary,
} from '@checkion-v3/contracts'
import {
  Button,
  Chip,
  EmptyState,
  EntityCard,
  Grid,
  Lede,
  LedeStrip,
  Text,
} from '@msqdx/ui'
import { formatScanInstant, formatScanShort, scoreTone } from '../lib/scan-display'
import { paths } from '../lib/paths'

export type HomeLatestRun =
  | {
      kind: 'single'
      id: string
      href: string
      label: string
      modeLabel: string
      score: number | null
      completedAt: string | null
      status: string
    }
  | {
      kind: 'deep'
      id: string
      href: string
      label: string
      modeLabel: string
      score: number | null
      completedAt: string | null
      status: string
      pageCount: number
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

/** Merge completed singles + domain deep scans, newest first. */
export function buildHomeLatestRuns(
  scans: ScanSummary[],
  domains: DomainScanLight[],
  limit = 12,
): HomeLatestRun[] {
  const singles: HomeLatestRun[] = scans
    .filter((s) => s.status === 'completed' || s.status === 'failed')
    .map((s) => ({
      kind: 'single' as const,
      id: s.id,
      href: paths.routes.resultSection(s.id, 'overview'),
      label: compactUrl(s.url),
      modeLabel: s.mode === 'deep' ? 'Deep (page)' : 'Single',
      score: s.overallScore,
      completedAt: s.completedAt,
      status: s.status,
    }))

  const deep: HomeLatestRun[] = domains.map((d) => ({
    kind: 'deep' as const,
    id: d.id,
    href: paths.routes.domainSection(d.id, 'overview'),
    label: compactUrl(d.rootUrl),
    modeLabel: 'Deep scan',
    score: d.overallScore,
    completedAt: d.completedAt,
    status: d.status,
    pageCount: d.pageCount,
  }))

  return [...singles, ...deep]
    .sort((a, b) => {
      const ta = a.completedAt ? Date.parse(a.completedAt) : 0
      const tb = b.completedAt ? Date.parse(b.completedAt) : 0
      return tb - ta
    })
    .slice(0, limit)
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

export function HomeMagazine({
  projects,
  scans,
  domains,
  geoJobs,
  scanCount,
  domainCount,
}: {
  projects: ProjectSummary[]
  scans: ScanSummary[]
  domains: DomainScanLight[]
  geoJobs: GeoJobSummary[]
  scanCount: number
  domainCount: number
}) {
  const latestRuns = buildHomeLatestRuns(scans, domains, 12)
  const deepList = [...domains]
    .sort((a, b) => {
      const ta = a.completedAt ? Date.parse(a.completedAt) : 0
      const tb = b.completedAt ? Date.parse(b.completedAt) : 0
      return tb - ta
    })
    .slice(0, 8)
  const geoList = [...geoJobs]
    .sort((a, b) => {
      const ta = a.completedAt ? Date.parse(a.completedAt) : 0
      const tb = b.completedAt ? Date.parse(b.completedAt) : 0
      return tb - ta
    })
    .slice(0, 6)

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
          <Link href={paths.routes.results}>
            <Button variant="ghost">All results</Button>
          </Link>
        </div>
      </header>

      <HomeChapter
        eyebrow="01 · Pulse"
        title="Corpus pulse"
        deck="How much of the corpus this capability has already read."
      >
        <LedeStrip className="checkion-home-pulse">
          <Lede label="Projects" value={projects.length} />
          <Lede label="Scans" value={scanCount} />
          <Lede label="Deep" value={domainCount} />
          <Lede label="GEO" value={geoJobs.length} />
        </LedeStrip>
      </HomeChapter>

      <HomeChapter
        eyebrow="02 · Latest"
        title="Latest runs"
        deck="Recent singles and deep scans — color is the overall score band."
        meta={`${latestRuns.length}`}
      >
        {latestRuns.length === 0 ? (
          <EmptyState className="checkion-project-chapter__empty">
            No runs yet.{' '}
            <Link href={paths.routes.scan}>Launch a scan</Link>.
          </EmptyState>
        ) : (
          <Grid columns={3} gap="md" className="checkion-home-run-grid" aria-label="Latest runs">
            {latestRuns.map((run) => {
              const tone = scoreTone(run.score)
              return (
                <Link
                  key={`${run.kind}-${run.id}`}
                  href={run.href}
                  className="checkion-home-run-card-link"
                >
                  <EntityCard
                    className="checkion-home-run-card"
                    data-tone={tone}
                    meta={
                      <span className="checkion-home-run-card__meta">
                        <Chip static size="sm">
                          {run.modeLabel}
                        </Chip>
                        <span>{run.status}</span>
                      </span>
                    }
                    title={run.label}
                    badge={
                      <span className="checkion-home-run-card__score" data-tone={tone}>
                        {run.score != null ? run.score : '—'}
                      </span>
                    }
                    footer={
                      <span className="checkion-home-run-card__footer">
                        {run.kind === 'deep' ? `${run.pageCount.toLocaleString()} pages · ` : null}
                        {formatScanShort(run.completedAt)}
                      </span>
                    }
                  />
                </Link>
              )
            })}
          </Grid>
        )}
      </HomeChapter>

      <HomeChapter
        eyebrow="03 · Corpus"
        title="Deep scans"
        deck="Host-wide magazines with page counts and issue groups."
        meta={`${deepList.length}`}
      >
        {deepList.length === 0 ? (
          <EmptyState className="checkion-project-chapter__empty">
            No deep scans yet.{' '}
            <Link href={paths.routes.scanLaunch({ mode: 'deep' })}>Launch a deep scan</Link>.
          </EmptyState>
        ) : (
          <ol className="checkion-magazine-list checkion-project-run-list" aria-label="Deep scans">
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
          </ol>
        )}
      </HomeChapter>

      {geoList.length > 0 ? (
        <HomeChapter
          eyebrow="04 · Answer engines"
          title="GEO runs"
          deck="Competitive presence jobs for this capability."
          meta={`${geoList.length}`}
        >
          <ol className="checkion-magazine-list checkion-project-run-list" aria-label="GEO runs">
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
          </ol>
        </HomeChapter>
      ) : null}
    </article>
  )
}
