import { notFound, redirect } from 'next/navigation'
import { AppShell } from '../../../../components/app-shell'
import { ScanStatusPoller } from '../../../../components/scan-status-poller'
import { ResultActions } from '../../../../components/result-actions'
import { ResultDetailPanel } from '../../../../components/result-detail-panel'
import { ResultMagazineShell } from '../../../../components/result-magazine-shell'
import { ResultIssuesPanel, ResultOverviewPanel } from '../../../../components/result-panels'
import {
  getScanIssues,
  getScanOverview,
} from '../../../../lib/fixtures/scan-store'
import { paths } from '../../../../lib/paths'

/** Avoid SSG hitting Postgres when Coolify injects DATABASE_URL at build time. */
export const dynamic = 'force-dynamic'

export default async function ResultSectionPage({
  params,
}: {
  params: Promise<{ id: string; section: string }>
}) {
  const { id, section: rawSection } = await params
  const overview = await getScanOverview(id)
  if (!overview) notFound()

  if (rawSection === 'scores') {
    redirect(paths.routes.resultSection(id, 'detail'))
  }

  if (rawSection !== 'overview' && rawSection !== 'issues' && rawSection !== 'detail') {
    notFound()
  }
  const section = rawSection

  const issues = await getScanIssues(id)
  const actions = (
    <ResultActions
      resourceId={overview.scan.id}
      resourceType="single"
      projectId={overview.scan.projectId}
      url={overview.scan.url}
      mode={overview.scan.mode}
    />
  )

  return (
    <AppShell>
      <ScanStatusPoller scanId={overview.scan.id} status={overview.scan.status} />
      <ResultMagazineShell
        overview={overview}
        actions={actions}
        variant={section === 'overview' ? 'cover' : 'folio'}
        activeSection={section}
      >
        {section === 'overview' ? (
          <ResultOverviewPanel
            overview={overview}
            issuesHref={paths.routes.resultSection(id, 'issues')}
          />
        ) : null}

        {section === 'issues' ? (
          <ResultIssuesPanel
            issues={issues}
            screenshotUrl={overview.screenshotUrl}
            visualLayers={overview.visualLayers}
          />
        ) : null}

        {section === 'detail' ? <ResultDetailPanel overview={overview} /> : null}
      </ResultMagazineShell>
    </AppShell>
  )
}
