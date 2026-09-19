import { notFound } from 'next/navigation'
import { AppShell } from '../../../components/app-shell'
import { ProjectWorkspace } from '../../../components/project-panels'
import { buildGeoPositionHistory } from '../../../lib/geo/position-history'
import { listGeoJobs, listGeoOverviewsForProject } from '../../../lib/fixtures/geo-store'
import { getProject } from '../../../lib/fixtures/project-store'
import { listDomainScans, listScans } from '../../../lib/fixtures/scan-store'

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
  const project = await getProject(id)
  if (!project) notFound()
  const [recentScans, domains, allGeo, overviews] = await Promise.all([
    listScans(id),
    listDomainScans(id),
    listGeoJobs(),
    listGeoOverviewsForProject(id),
  ])
  const geoJobs = allGeo
    .filter((job) => job.projectId === id)
    .sort((a, b) => {
      const at = a.completedAt ?? ''
      const bt = b.completedAt ?? ''
      return bt.localeCompare(at)
    })

  const measurement =
    sp.measurement === 'live' ? ('live' as const) : ('recall' as const)
  const geoHistory = buildGeoPositionHistory({
    projectId: id,
    measurement,
    overviews,
  })

  return (
    <AppShell>
      <ProjectWorkspace
        project={project}
        recentScans={recentScans}
        domains={domains}
        geoJobs={geoJobs}
        geoHistory={geoHistory}
      />
    </AppShell>
  )
}
