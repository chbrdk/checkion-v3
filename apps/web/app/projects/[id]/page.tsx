import { notFound } from 'next/navigation'
import { AppShell } from '../../../components/app-shell'
import { ProjectWorkspace } from '../../../components/project-panels'
import { listGeoJobs } from '../../../lib/fixtures/geo-store'
import { getProject } from '../../../lib/fixtures/project-store'
import { listDomainScans, listScans } from '../../../lib/fixtures/scan-store'

/** Avoid SSG hitting Postgres when Coolify injects DATABASE_URL at build time. */
export const dynamic = 'force-dynamic'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = await getProject(id)
  if (!project) notFound()
  const [recentScans, domains, allGeo] = await Promise.all([
    listScans(id),
    listDomainScans(id),
    listGeoJobs(),
  ])
  const geoJobs = allGeo
    .filter((job) => job.projectId === id)
    .sort((a, b) => {
      const at = a.completedAt ?? ''
      const bt = b.completedAt ?? ''
      return bt.localeCompare(at)
    })

  return (
    <AppShell title={project.name} description={project.domain}>
      <ProjectWorkspace
        project={project}
        recentScans={recentScans}
        domains={domains}
        geoJobs={geoJobs}
      />
    </AppShell>
  )
}
