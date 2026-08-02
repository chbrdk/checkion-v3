import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Button, TopStatus } from '@msqdx/ui'
import { AppShell } from '../../../../components/app-shell'
import { GeoMagazineShell } from '../../../../components/geo-magazine-shell'
import { GeoOverviewPanel } from '../../../../components/geo-overview-panel'
import { GeoQueriesPanel } from '../../../../components/geo-queries-panel'
import type { GeoSectionId } from '../../../../components/geo-section-nav'
import { getGeoOverview } from '../../../../lib/fixtures/geo-store'
import { paths } from '../../../../lib/paths'
import { statusTopLevel } from '../../../../lib/scan-display'

export default async function GeoSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; section: string }>
  searchParams: Promise<{ q?: string; model?: string }>
}) {
  const { id, section: rawSection } = await params
  const { q, model } = await searchParams
  const overview = await getGeoOverview(id)
  if (!overview) notFound()

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

  const actions = (
    <Link href={paths.routes.projectDetail(overview.job.projectId)}>
      <Button size="sm" variant="ghost">
        Project
      </Button>
    </Link>
  )

  return (
    <AppShell
      title="GEO result"
      status={
        <TopStatus
          level={statusTopLevel(overview.job.status === 'completed' ? 'completed' : 'running')}
          primary={overview.job.status}
          secondary="geo"
          live={overview.job.status === 'running'}
        />
      }
    >
      <GeoMagazineShell
        overview={overview}
        actions={actions}
        variant={section === 'overview' ? 'cover' : 'folio'}
        activeSection={section}
      >
        {section === 'overview' ? <GeoOverviewPanel overview={overview} /> : null}
        {section === 'queries' ? (
          <GeoQueriesPanel overview={overview} initialQuery={q} initialModel={model} />
        ) : null}
      </GeoMagazineShell>
    </AppShell>
  )
}
