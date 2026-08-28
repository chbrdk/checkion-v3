import Link from 'next/link'
import { Chip, Panel, SectionChrome, Text } from '@msqdx/ui'
import { AppShell } from '../../components/app-shell'
import { auth } from '../../auth'
import { listProjectsForViewer } from '../../lib/fixtures/project-store'
import { listDomainScans } from '../../lib/fixtures/scan-store'
import { paths } from '../../lib/paths'

/** Avoid SSG hitting Postgres when Coolify injects DATABASE_URL at build time. */
export const dynamic = 'force-dynamic'

export default async function DomainIndexPage() {
  const session = await auth()
  const projects = Object.fromEntries(
    ((await listProjectsForViewer(session?.user?.id ?? null))).map((p) => [p.id, p.name]),
  )
  const domains = await listDomainScans()

  return (
    <AppShell
      title="Deep scans"
      description="Light corpus payloads — overview / issues / detail (dummy + live corpus)."
    >
      <Panel>
        <SectionChrome title="Deep scans" meta={`${domains.length}`} />
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
