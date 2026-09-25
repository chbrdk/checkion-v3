import { notFound } from 'next/navigation'
import { ProjectWorkspace } from '../../../../components/project-panels'
import { auth } from '../../../../auth'
import { buildGeoPositionHistory } from '../../../../lib/geo/position-history'
import { listGeoOverviewsForProject } from '../../../../lib/fixtures/geo-store'
import { getProject } from '../../../../lib/fixtures/project-store'
import { viewerCanAccessProject } from '../../../../lib/project-access'
import {
  listDomainScansForViewer,
  listGeoJobsForViewer,
  listScansForViewer,
} from '../../../../lib/resource-access'

/** Avoid SSG hitting Postgres when Coolify injects DATABASE_URL at build time. */
export const dynamic = 'force-dynamic'

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ chapter?: string; measurement?: string }>
}) {
  const { id } = await params
  const sp = searchParams ? await searchParams : {}
  const session = await auth()
  const viewerId = session?.user?.id ?? null
  const project = await getProject(id)
  if (!project || !(await viewerCanAccessProject(project, viewerId))) notFound()

  const [recentScans, domains, geoJobs, overviews] = await Promise.all([
    listScansForViewer(viewerId, id),
    listDomainScansForViewer(viewerId, id),
    listGeoJobsForViewer(viewerId, id),
    listGeoOverviewsForProject(id),
  ])

  const measurement =
    sp.measurement === 'live' ? ('live' as const) : ('recall' as const)
  const geoHistory = buildGeoPositionHistory({
    projectId: id,
    measurement,
    overviews,
  })

  return (
    <ProjectWorkspace
      project={project}
      recentScans={recentScans}
      domains={domains}
      geoJobs={geoJobs}
      geoHistory={geoHistory}
    />
  )
}
