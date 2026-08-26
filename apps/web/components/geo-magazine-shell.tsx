import type { ReactNode } from 'react'
import type { GeoOverview } from '@checkion-v3/contracts'
import { getProject } from '../lib/fixtures/project-store'
import { scoreTone } from '../lib/scan-display'
import { GeoSectionNav, type GeoSectionId } from './geo-section-nav'
import { GeoMagazineChrome } from './magazine-shell-chrome'

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Cover chrome stays magazine-local; body panels use DS. */
export async function GeoMagazineShell({
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
  const project = await getProject(job.projectId)
  const host = overview.targetHost || hostFromUrl(job.url)
  const tone = scoreTone(job.overallScore)

  return (
    <article
      className="checkion-magazine checkion-magazine--geo checkion-magazine--editorial"
      data-variant={variant}
    >
      <GeoMagazineChrome
        tone={tone}
        projectId={job.projectId}
        projectName={project?.name ?? job.projectId}
        jobId={job.id}
        overallScore={job.overallScore}
        host={host}
        title={job.title}
        lede={overview.lede}
        models={overview.models}
        variant={variant}
        actions={actions}
      />

      <GeoSectionNav jobId={job.id} active={activeSection} />
      {children}
    </article>
  )
}
