import Link from 'next/link'
import { Chip, Panel, SectionChrome, Text } from '@msqdx/ui'
import { AppShell } from '../../components/app-shell'
import { listProjects } from '../../lib/fixtures/project-store'
import { listDomainScans } from '../../lib/fixtures/scan-store'
import { paths } from '../../lib/paths'

export default function DomainIndexPage() {
  const projects = Object.fromEntries(listProjects().map((p) => [p.id, p.name]))
  const domains = listDomainScans()

  return (
    <AppShell
      title="Domain crawls"
      description="Light domain payloads — overview / issues / detail (dummy + live corpus)."
    >
      <Panel>
        <SectionChrome title="Domain scans" meta={`${domains.length}`} />
        {domains.length === 0 ? (
          <Text role="meta">No domain fixtures. Launch a deep scan to synthesize one.</Text>
        ) : (
          <ul className="checkion-issue-list">
            {domains.map((d) => (
              <li key={d.id}>
                <Link href={paths.routes.domainDetail(d.id)} className="checkion-index-card">
                  <div className="checkion-index-card__meta">
                    <Chip static size="sm">
                      deep
                    </Chip>
                    <Chip static size="sm">
                      {d.status}
                    </Chip>
                    <Chip static size="sm">
                      {d.pageCount} pages
                    </Chip>
                    {d.overallScore != null ? (
                      <Chip static size="sm">
                        {d.overallScore}
                      </Chip>
                    ) : null}
                  </div>
                  <strong>{d.rootUrl}</strong>
                  <Text role="meta">{projects[d.projectId] ?? d.projectId}</Text>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </AppShell>
  )
}
