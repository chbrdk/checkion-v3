import { AppShell } from '../../components/app-shell'
import { ScanLaunchForm } from '../../components/scan-launch-form'
import { listProjects } from '../../lib/fixtures/project-store'
import { TopStatus } from '@msqdx/ui'

/** Avoid SSG hitting Postgres when Coolify injects DATABASE_URL at build time. */
export const dynamic = 'force-dynamic'

function decodeOptionalUrl(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined
  try {
    const decoded = decodeURIComponent(raw.trim())
    if (!/^https?:\/\//i.test(decoded)) return undefined
    return decoded
  } catch {
    return undefined
  }
}

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{
    projectId?: string
    mode?: string
    url?: string
    platformProjectId?: string
    audionRunId?: string
    stepUrl?: string
  }>
}) {
  const params = await searchParams
  const projects = ((await listProjects())).map((p) => ({ id: p.id, name: p.name }))
  const defaultProjectId =
    params.projectId && projects.some((p) => p.id === params.projectId)
      ? params.projectId
      : undefined
  const defaultUrl = decodeOptionalUrl(params.url) ?? decodeOptionalUrl(params.stepUrl)
  const fromAudion = Boolean(
    params.audionRunId?.trim() ||
      params.platformProjectId?.trim() ||
      (defaultUrl && params.projectId?.trim() && params.mode !== 'deep'),
  )
  /** AUDION journey handoff always launches single-page (never deep crawl). */
  const defaultMode = fromAudion ? 'single' : params.mode === 'deep' ? 'deep' : 'single'
  const selectedProject = defaultProjectId
    ? projects.find((p) => p.id === defaultProjectId)
    : undefined

  return (
    <AppShell
      title="Scan"
      status={
        <TopStatus
          level="ok"
          primary={fromAudion ? 'AUDION handoff' : 'Dummy launch'}
          secondary={fromAudion ? 'single-page · CHECKION' : 'fixtures'}
        />
      }
    >
      <ScanLaunchForm
        projects={projects}
        defaultMode={defaultMode}
        defaultProjectId={defaultProjectId}
        defaultUrl={defaultUrl}
        correlation={{
          platformProjectId: params.platformProjectId?.trim() || undefined,
          audionRunId: params.audionRunId?.trim() || undefined,
          stepUrl: decodeOptionalUrl(params.stepUrl) || defaultUrl,
        }}
        fromAudion={fromAudion}
        projectLabel={selectedProject?.name}
      />
    </AppShell>
  )
}
