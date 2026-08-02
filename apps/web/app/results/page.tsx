import Link from 'next/link'
import { Chip, Panel, SectionChrome, Text } from '@msqdx/ui'
import { AppShell } from '../../components/app-shell'
import { listProjects } from '../../lib/fixtures/project-store'
import { listScans } from '../../lib/fixtures/scan-store'
import { paths } from '../../lib/paths'

export default async function ResultsIndexPage() {
  const projects = Object.fromEntries(((await listProjects())).map((p) => [p.id, p.name]))
  const scans = await listScans()

  return (
    <AppShell
      title="Results"
      description="All dummy scans — open any row for overview / issues / scores."
    >
      <Panel>
        <SectionChrome title="Scans" meta={`${scans.length}`} />
        {scans.length === 0 ? (
          <Text role="meta">No scans in the fixture store.</Text>
        ) : (
          <ul className="checkion-issue-list">
            {scans.map((scan) => (
              <li key={scan.id}>
                <Link href={paths.routes.resultDetail(scan.id)} className="checkion-index-card">
                  <div className="checkion-index-card__meta">
                    <Chip static size="sm">
                      {scan.mode}
                    </Chip>
                    <Chip static size="sm">
                      {scan.status}
                    </Chip>
                    {scan.overallScore != null ? (
                      <Chip static size="sm">
                        {scan.overallScore}
                      </Chip>
                    ) : null}
                  </div>
                  <strong>{scan.url}</strong>
                  <Text role="meta">{projects[scan.projectId] ?? scan.projectId}</Text>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </AppShell>
  )
}
