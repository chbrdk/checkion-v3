import { notFound, redirect } from 'next/navigation'
import { TopStatus } from '@msqdx/ui'
import { AppShell } from '../../../../components/app-shell'
import { ScanStatusPoller } from '../../../../components/scan-status-poller'
import { DomainDetailPanel } from '../../../../components/domain-detail-panel'
import { DomainIssuesPanel } from '../../../../components/domain-issues-panel'
import { DomainMagazineShell } from '../../../../components/domain-magazine-shell'
import { DomainOverviewPanel } from '../../../../components/domain-overview-panel'
import { ResultActions } from '../../../../components/result-actions'
import {
  getDomainOverview,
  getScanIssues,
} from '../../../../lib/fixtures/scan-store'
import { paths } from '../../../../lib/paths'
import { statusTopLevel } from '../../../../lib/scan-display'

/** Avoid SSG hitting Postgres when Coolify injects DATABASE_URL at build time. */
export const dynamic = 'force-dynamic'

export default async function DomainSectionPage({
  params,
}: {
  params: Promise<{ id: string; section: string }>
}) {
  const { id, section: rawSection } = await params
  const overview = await getDomainOverview(id)
  if (!overview) notFound()

  if (rawSection === 'scores') {
    redirect(paths.routes.domainSection(id, 'detail'))
  }

  if (rawSection !== 'overview' && rawSection !== 'issues' && rawSection !== 'detail') {
    notFound()
  }
  const section = rawSection

  const issues = await getScanIssues(id)
  const actions = (
    <ResultActions
      resourceId={id}
      resourceType="domain"
      projectId={overview.scan.projectId}
      url={overview.scan.rootUrl}
      mode="deep"
      status={overview.scan.status}
    />
  )

  return (
    <AppShell
      title="Domain scan"
      status={
        <TopStatus
          level={statusTopLevel(overview.scan.status)}
          primary={overview.scan.status}
          secondary="deep"
          live={overview.scan.status === 'running'}
        />
      }
    >
      <ScanStatusPoller scanId={id} status={overview.scan.status} resource="domain" />
      <DomainMagazineShell
        overview={overview}
        actions={actions}
        variant={section === 'overview' ? 'cover' : 'folio'}
        activeSection={section}
      >
        {section === 'overview' ? <DomainOverviewPanel overview={overview} /> : null}
        {section === 'issues' ? <DomainIssuesPanel domainId={id} issues={issues} /> : null}
        {section === 'detail' ? <DomainDetailPanel overview={overview} /> : null}
      </DomainMagazineShell>
    </AppShell>
  )
}
