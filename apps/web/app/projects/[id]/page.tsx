import { notFound } from 'next/navigation'
import { AppShell } from '../../../components/app-shell'
import { ProjectWorkspace } from '../../../components/project-panels'
import { getProject } from '../../../lib/fixtures/project-store'
import { listDomainScans, listScans } from '../../../lib/fixtures/scan-store'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = getProject(id)
  if (!project) notFound()
  const recentScans = listScans(id)
  const domains = listDomainScans(id)

  return (
    <AppShell title={project.name} description={project.domain}>
      <ProjectWorkspace project={project} recentScans={recentScans} domains={domains} />
    </AppShell>
  )
}
