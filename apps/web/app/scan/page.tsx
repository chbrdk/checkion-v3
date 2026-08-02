import { AppShell } from '../../components/app-shell'
import { ScanLaunchForm } from '../../components/scan-launch-form'
import { listProjects } from '../../lib/fixtures/project-store'
import { TopStatus } from '@msqdx/ui'

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; mode?: string }>
}) {
  const params = await searchParams
  const projects = listProjects().map((p) => ({ id: p.id, name: p.name }))
  const defaultProjectId =
    params.projectId && projects.some((p) => p.id === params.projectId)
      ? params.projectId
      : undefined
  const defaultMode = params.mode === 'deep' ? 'deep' : 'single'

  return (
    <AppShell
      title="Scan"
      status={<TopStatus level="ok" primary="Dummy launch" secondary="fixtures" />}
    >
      <ScanLaunchForm
        projects={projects}
        defaultMode={defaultMode}
        defaultProjectId={defaultProjectId}
      />
    </AppShell>
  )
}
