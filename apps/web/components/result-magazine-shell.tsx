import type { ReactNode } from 'react'
import type { ScanOverview } from '@checkion-v3/contracts'
import { getProject } from '../lib/fixtures/project-store'
import { hasAudionCorrelation } from '../lib/scan-correlation'
import { scoreTone } from '../lib/scan-display'
import { FromAudionHint } from './from-audion-hint'
import { ResultMagazineChrome } from './magazine-shell-chrome'
import { ResultSectionNav } from './result-section-nav'

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function pathFromUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname === '/' ? '/' : u.pathname
  } catch {
    return url
  }
}

export async function ResultMagazineShell({
  overview,
  actions,
  children,
  variant = 'cover',
  activeSection = 'overview',
  sectionBase = 'results',
}: {
  overview: ScanOverview
  actions?: ReactNode
  children: ReactNode
  /** Full cover for overview; compact folio masthead for issues/detail */
  variant?: 'cover' | 'folio'
  activeSection?: 'overview' | 'issues' | 'detail'
  sectionBase?: 'results' | 'domain'
}) {
  const project = await getProject(overview.scan.projectId)
  const { scan } = overview
  const host = hostFromUrl(scan.url)
  const path = pathFromUrl(scan.url)
  const deck = overview.classification?.shortSummary ?? overview.lede
  const tone = scoreTone(scan.overallScore)

  return (
    <article
      className="checkion-magazine checkion-magazine--scan checkion-magazine--editorial"
      data-variant={variant}
    >
      <ResultMagazineChrome
        tone={tone}
        projectId={overview.scan.projectId}
        projectName={project?.name ?? overview.scan.projectId}
        scanId={overview.scan.id}
        overallScore={scan.overallScore}
        issueCount={scan.issueCount}
        issueStats={scan.issueStats ?? null}
        scoreFallback={overview.scores}
        host={host}
        title={overview.seo?.h1 ?? path}
        titleIsHome={!overview.seo?.h1 && path === '/'}
        deck={deck}
        tags={overview.classification?.tags}
        variant={variant}
        actions={actions}
        fromAudionHint={
          hasAudionCorrelation(scan) ? <FromAudionHint scan={scan} /> : null
        }
      />

      <ResultSectionNav scanId={scan.id} active={activeSection} base={sectionBase} />

      {children}
    </article>
  )
}
