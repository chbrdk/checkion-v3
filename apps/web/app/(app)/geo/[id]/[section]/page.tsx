import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Button } from '@msqdx/ui'
import { GeoJobStatusPoller } from '../../../../../components/geo-job-status-poller'
import { GeoMagazineShell } from '../../../../../components/geo-magazine-shell'
import { GeoOverviewPanel } from '../../../../../components/geo-overview-panel'
import { GeoQueriesPanel } from '../../../../../components/geo-queries-panel'
import { GeoResultActions } from '../../../../../components/geo-result-actions'
import type { GeoSectionId } from '../../../../../components/geo-section-nav'
import { isGeoJobInProgress } from '../../../../../lib/geo-job-display'
import { geoJobMeasurement } from '../../../../../lib/geo/measurement'
import {
  buildGeoPositionHistory,
  geoHistoryTeaserSeries,
} from '../../../../../lib/geo/position-history'
import {
  getGeoOverview,
  listGeoOverviewsForProject,
} from '../../../../../lib/fixtures/geo-store'
import { getProject } from '../../../../../lib/fixtures/project-store'
import { paths } from '../../../../../lib/paths'
import { viewerCanAccessGeoJob } from '../../../../../lib/resource-access'
import { auth } from '../../../../../auth'

/** Avoid SSG hitting Postgres when Coolify injects DATABASE_URL at build time. */
export const dynamic = 'force-dynamic'

export default async function GeoSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; section: string }>
  searchParams: Promise<{ q?: string; model?: string }>
}) {
  const { id, section: rawSection } = await params
  const { q, model } = await searchParams
  const session = await auth()
  if (!(await viewerCanAccessGeoJob(id, session?.user?.id ?? null))) notFound()
  const overview = await getGeoOverview(id)
  if (!overview) notFound()

  const project = await getProject(overview.job.projectId)
  const canPublishKnowledge = Boolean(
    project?.platformProjectId &&
      !project.platformProjectId.startsWith('plx-local-'),
  )

  // Placement nav deferred — keep old links alive via Queries redirect.
  if (rawSection === 'placement') {
    redirect(
      q
        ? paths.routes.geoQueriesPrompt(id, q, model)
        : paths.routes.geoSection(id, 'queries'),
    )
  }

  if (rawSection !== 'overview' && rawSection !== 'queries') {
    notFound()
  }
  const section = rawSection as GeoSectionId
  const jobStatus = overview.job.status
  const inProgress = isGeoJobInProgress(jobStatus)

  // History teaser only on overview — skip full project GEO reload on queries tab.
  let historyTeaser: { seriesCount: number; sampleQuery?: string } | null = null
  if (section === 'overview') {
    const measurement = geoJobMeasurement(overview.job)
    const projectOverviews = await listGeoOverviewsForProject(overview.job.projectId)
    const history = buildGeoPositionHistory({
      projectId: overview.job.projectId,
      measurement,
      overviews: projectOverviews,
    })
    const teaserSeries = geoHistoryTeaserSeries(
      history,
      overview.queryRuns.map((r) => r.query).length
        ? Array.from(new Set(overview.queryRuns.map((r) => r.query)))
        : overview.positionMatrix.map((r) => r.queryText),
    )
    historyTeaser =
      teaserSeries.length > 0
        ? {
            seriesCount: teaserSeries.length,
            sampleQuery: teaserSeries[0]?.queryText,
          }
        : null
  }

  const actions = (
    <>
      <GeoResultActions overview={overview} />
      <Link href={paths.routes.projectDetail(overview.job.projectId)}>
        <Button size="sm" variant="ghost">
          Project
        </Button>
      </Link>
    </>
  )

  return (
    <>
      {inProgress ? <GeoJobStatusPoller jobId={id} status={jobStatus} /> : null}
      <GeoMagazineShell
        overview={overview}
        actions={actions}
        variant={section === 'overview' ? 'cover' : 'folio'}
        activeSection={section}
      >
        {section === 'overview' ? (
          <GeoOverviewPanel
            overview={overview}
            canPublishKnowledge={canPublishKnowledge}
            historyTeaser={historyTeaser}
          />
        ) : null}
        {section === 'queries' ? (
          <GeoQueriesPanel overview={overview} initialQuery={q} initialModel={model} />
        ) : null}
      </GeoMagazineShell>
    </>
  )
}
