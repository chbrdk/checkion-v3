import Link from 'next/link'
import type { ReactNode } from 'react'
import { Chip, Text } from '@msqdx/ui'
import type { DomainOverview } from '@checkion-v3/contracts'
import { paths } from '../lib/paths'
import { scoreTone } from '../lib/scan-display'
import { getProject } from '../lib/fixtures/project-store'
import { ResultSectionNav } from './result-section-nav'

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Domain-corpus magazine chrome — cover is host + page count, not a page screenshot. */
export async function DomainMagazineShell({
  overview,
  actions,
  children,
  variant = 'cover',
  activeSection = 'overview',
}: {
  overview: DomainOverview
  actions?: ReactNode
  children: ReactNode
  variant?: 'cover' | 'folio'
  activeSection?: 'overview' | 'issues' | 'detail'
}) {
  const project = await getProject(overview.scan.projectId)
  const { scan } = overview
  const host = hostFromUrl(scan.rootUrl)
  const deck = overview.classification?.shortSummary ?? overview.lede
  const tone = scoreTone(scan.overallScore)
  const stats = scan.issueStats

  return (
    <article
      className="checkion-magazine checkion-magazine--domain checkion-magazine--editorial"
      data-variant={variant}
    >
      <div className="checkion-magazine-topbar">
        <nav className="briefing-nav signal-nav" aria-label="Breadcrumb">
          <Link href={paths.routes.domain}>Deep scans</Link>
          <span className="briefing-nav-sep" aria-hidden>
            /
          </span>
          <Link href={paths.routes.projectDetail(scan.projectId)}>
            {project?.name ?? scan.projectId}
          </Link>
          <span className="briefing-nav-sep" aria-hidden>
            /
          </span>
          <span>{scan.id}</span>
        </nav>
        {actions ? <div className="checkion-magazine-topbar-actions">{actions}</div> : null}
      </div>

      <header className="checkion-masthead" data-tone={tone} data-variant={variant}>
        <div className="checkion-masthead__hero">
          <div className="checkion-cover__score-col">
            <div
              className="checkion-cover__score"
              aria-label={`Domain score ${scan.overallScore ?? 'none'}`}
            >
              <span className="checkion-cover__score-num">{scan.overallScore ?? '—'}</span>
              <span className="checkion-cover__score-label">domain</span>
            </div>
            <dl className="checkion-cover__metrics" aria-label="Corpus metrics">
              <div>
                <dt>Pages</dt>
                <dd>{scan.pageCount.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Groups</dt>
                <dd>{scan.issueCount}</dd>
              </div>
              {stats ? (
                <div>
                  <dt>Errors</dt>
                  <dd>{stats.errors.toLocaleString()}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="checkion-cover__copy">
            <p className="checkion-cover__kicker">Deep scan · corpus</p>
            <p className="checkion-cover__host">{host}</p>
            <Text role="headline" as="h2" className="checkion-cover__title">
              {scan.pageCount.toLocaleString()} pages scanned
            </Text>
            {variant === 'cover' ? (
              <>
                <p className="checkion-cover__deck">{deck}</p>
                {overview.classification?.tags?.length ? (
                  <div className="checkion-chip-row checkion-cover__tags">
                    {overview.classification.tags.slice(0, 6).map((tag) => (
                      <Chip key={tag} static size="sm">
                        {tag}
                      </Chip>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </header>

      <ResultSectionNav scanId={scan.id} active={activeSection} base="domain" />

      {children}
    </article>
  )
}
