import { AppShell } from '../../components/app-shell'
import { ProjectListPanel } from '../../components/project-panels'
import { auth } from '../../auth'
import { getProjectByPlatformId, listProjectsForViewer } from '../../lib/fixtures/project-store'
import { paths } from '../../lib/paths'
import { redirect } from 'next/navigation'

/** Avoid SSG hitting Postgres when Coolify injects DATABASE_URL at build time. */
export const dynamic = 'force-dynamic'

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ platformProjectId?: string }>
}) {
  const { platformProjectId } = await searchParams
  let bindPlatformProjectId: string | undefined
  const session = await auth()
  const viewerId = session?.user?.id ?? null

  if (platformProjectId) {
    const bound = await getProjectByPlatformId(platformProjectId)
    if (bound) redirect(paths.routes.projectDetail(bound.id))
    bindPlatformProjectId = platformProjectId
  }

  const projects = await listProjectsForViewer(viewerId)
  return (
    <AppShell descriptionKey="pages.projects.lead">
      <ProjectListPanel projects={projects} bindPlatformProjectId={bindPlatformProjectId} />
    </AppShell>
  )
}
