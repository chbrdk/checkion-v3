import Link from 'next/link'
import { Chip } from '@msqdx/ui'
import type { GeoOverview } from '@checkion-v3/contracts'
import { paths } from '../lib/paths'
import { scoreTone } from '../lib/scan-display'
import { getProject } from '../lib/fixtures/project-store'
import { GeoSectionNav, type GeoSectionId } from './geo-section-nav'
import type { ReactNode } from 'react'

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Cover chrome stays magazine-local; body panels use DS. */
export function GeoMagazineShell({
  overview,
  actions,
  children,
  variant = 'cover',
  activeSection = 'overview',
}: {
  overview: GeoOverview
  actions?: ReactNode
  children: ReactNode
  variant?: 'cover' | 'folio'
  activeSection?: GeoSectionId
}) {
  const { job } = overview
  const project = getProject(job.projectId)
  const host = overview.targetHost || hostFromUrl(job.url)
  const tone = scoreTone(job.overallScore)

  return (
    <article
      className="checkion-magazine checkion-magazine--geo checkion-magazine--editorial"
      data-variant={variant}
    >
      <div className="checkion-magazine-topbar">
        <nav className="briefing-nav signal-nav" aria-label="Breadcrumb">
          <Link href={paths.routes.geo}>GEO</Link>
          <span className="briefing-nav-sep" aria-hidden>
            /
          </span>
          <Link href={paths.routes.projectDetail(job.projectId)}>
            {project?.name ?? job.projectId}
          </Link>
          <span className="briefing-nav-sep" aria-hidden>
            /
          </span>
          <span>{job.id}</span>
        </nav>
        {actions ? <div className="checkion-magazine-topbar-actions">{actions}</div> : null}
      </div>

      <header className="checkion-masthead" data-tone={tone} data-variant={variant}>
        <div className="checkion-masthead__hero">
          <div className="checkion-cover__score-col">
            <div
              className="checkion-cover__score"
              aria-label={`GEO score ${job.overallScore ?? 'none'}`}
            >
              <span className="checkion-cover__score-num">{job.overallScore ?? '—'}</span>
              <span className="checkion-cover__score-label">geo</span>
            </div>
          </div>
          <div className="checkion-cover__copy">
            <p className="checkion-cover__kicker">GEO briefing</p>
            <p className="checkion-cover__host">{host}</p>
            <h2 className="checkion-cover__title">
              {variant === 'cover' ? 'Where answer engines place you' : job.title}
            </h2>
            {variant === 'cover' ? (
              <>
                <p className="checkion-cover__deck">{overview.lede}</p>
                <div className="checkion-chip-row checkion-cover__tags">
                  {overview.models.map((m) => (
                    <Chip key={m} static size="sm">
                      {m}
                    </Chip>
                  ))}
                </div>
              </>
            ) : (
              <p className="checkion-cover__deck checkion-cover__deck--folio">{job.title}</p>
            )}
          </div>
        </div>
      </header>

      <GeoSectionNav jobId={job.id} active={activeSection} />
      {children}
    </article>
  )
}
