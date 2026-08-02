import { AppShell } from '../../components/app-shell'
import { ScanLaunchForm, type LaunchMode } from '../../components/scan-launch-form'
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

function parseLaunchMode(raw: string | undefined): LaunchMode | undefined {
  if (raw === 'seo' || raw === 'deep' || raw === 'geo' || raw === 'single') return raw
  return undefined
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
  const projects = ((await listProjects())).map((p) => ({
    id: p.id,
    name: p.name,
    domain: p.domain,
  }))
  const defaultProjectId =
    params.projectId && projects.some((p) => p.id === params.projectId)
      ? params.projectId
      : undefined
  const defaultUrl = decodeOptionalUrl(params.url) ?? decodeOptionalUrl(params.stepUrl)
  const fromAudion = Boolean(
    params.audionRunId?.trim() ||
      params.platformProjectId?.trim() ||
      (defaultUrl &&
        params.projectId?.trim() &&
        params.mode !== 'deep' &&
        params.mode !== 'geo' &&
        params.mode !== 'seo'),
  )
  /** AUDION journey handoff always launches WCAG Quick single (never deep / GEO / SEO). */
  const defaultMode: LaunchMode | undefined = fromAudion ? 'single' : parseLaunchMode(params.mode)
  const selectedProject = defaultProjectId
    ? projects.find((p) => p.id === defaultProjectId)
    : undefined

  const statusPrimary = fromAudion
    ? 'AUDION handoff'
    : defaultMode === 'geo'
      ? 'GEO launch'
      : defaultMode === 'seo'
        ? 'SEO launch'
        : 'Launch'
  const statusSecondary = fromAudion
    ? 'WCAG single · CHECKION'
    : defaultMode === 'geo'
      ? 'competitive presence'
      : defaultMode === 'seo'
        ? 'domain SEO coverage'
        : defaultMode === 'deep'
          ? 'WCAG deep crawl'
          : defaultMode === 'single'
            ? 'WCAG single page'
            : 'choose a capability'

  return (
    <AppShell
      title="Launch"
      status={<TopStatus level="ok" primary={statusPrimary} secondary={statusSecondary} />}
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
