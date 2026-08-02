import { AppShell } from '../../components/app-shell'
import { ProjectListPanel } from '../../components/project-panels'
import { getProjectByPlatformId, listProjects } from '../../lib/fixtures/project-store'
import { paths } from '../../lib/paths'
import { redirect } from 'next/navigation'

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ platformProjectId?: string }>
}) {
  const { platformProjectId } = await searchParams
  let bindPlatformProjectId: string | undefined

  if (platformProjectId) {
    const bound = await getProjectByPlatformId(platformProjectId)
    if (bound) redirect(paths.routes.projectDetail(bound.id))
    bindPlatformProjectId = platformProjectId
  }

  const projects = await listProjects()
  return (
    <AppShell
      title="Projects"
      description="Local CHECKION records for the same collections as in Plexon."
    >
      <ProjectListPanel projects={projects} bindPlatformProjectId={bindPlatformProjectId} />
    </AppShell>
  )
}
