import type { ReactNode } from 'react'
import type { DomainOverview } from '@checkion-v3/contracts'
import { scoreTone } from '../lib/scan-display'
import { getProject } from '../lib/fixtures/project-store'
import { ResultSectionNav } from './result-section-nav'
import { DomainMagazineChrome } from './magazine-shell-chrome'

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
      <DomainMagazineChrome
        tone={tone}
        projectId={scan.projectId}
        projectName={project?.name ?? scan.projectId}
        scanId={scan.id}
        overallScore={scan.overallScore}
        pageCount={scan.pageCount}
        issueCount={scan.issueCount}
        errors={stats?.errors ?? null}
        host={host}
        deck={deck}
        tags={overview.classification?.tags}
        variant={variant}
        actions={actions}
      />

      <ResultSectionNav scanId={scan.id} active={activeSection} base="domain" />

      {children}
    </article>
  )
}
