import Link from 'next/link'
import { Button, Chip, Panel, SectionChrome, Lede, LedeStrip, Text } from '@msqdx/ui'
import { AppShell } from '../components/app-shell'
import { listProjects } from '../lib/fixtures/project-store'
import { listDomainScans, listScans } from '../lib/fixtures/scan-store'
import { listShares } from '../lib/fixtures/share-store'
import { paths } from '../lib/paths'

/** Avoid SSG hitting Postgres when Coolify injects DATABASE_URL at build time. */
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const projects = await listProjects()
  const scans = ((await listScans())).filter((s) => s.status === 'completed').slice(0, 5)
  const domains = ((await listDomainScans())).slice(0, 3)
  const shares = await listShares()

  return (
    <AppShell
      title="Home"
      description="Dummy corpus — browse projects, scans, and shares without live crawl or Plexon."
    >
      <div className="checkion-magazine">
        <Panel>
          <SectionChrome title="Demo snapshot" meta="fixtures" />
          <LedeStrip>
            <Lede label="Projects" value={projects.length} />
            <Lede label="Scans" value={((await listScans())).length} />
            <Lede label="Domain" value={((await listDomainScans())).length} />
            <Lede label="Shares" value={shares.length} />
          </LedeStrip>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <Link href={paths.routes.scan}>
              <Button>New scan</Button>
            </Link>
            <Link href={paths.routes.projects}>
              <Button variant="ghost">Projects</Button>
            </Link>
            <Link href={paths.routes.results}>
              <Button variant="ghost">All results</Button>
            </Link>
            <Link href={paths.routes.domain}>
              <Button variant="ghost">Domain</Button>
            </Link>
          </div>
        </Panel>

        <Panel>
          <SectionChrome title="Explore" meta="local" />
          <ul className="checkion-issue-list">
            <li>
              <Link href={paths.routes.geo}>GEO — Overview + Queries magazine</Link>
            </li>
            <li>
              <Link href={paths.routes.journey}>Journey agent — deferred fixture cards</Link>
            </li>
            <li>
              <Link href={paths.routes.reports}>Reports — deferred fixture cards</Link>
            </li>
          </ul>
        </Panel>

        <Panel>
          <SectionChrome title="Recent completed scans" meta={`${scans.length}`} />
          <ul className="checkion-issue-list">
            {scans.map((scan) => (
              <li key={scan.id}>
                <Link href={paths.routes.resultDetail(scan.id)}>
                  <strong>{scan.mode}</strong> · {scan.url}
                  {scan.overallScore != null ? ` · ${scan.overallScore}` : ''}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <SectionChrome title="Deep scans" meta={`${domains.length}`} />
          {domains.length === 0 ? (
            <Text role="meta">No domain fixtures.</Text>
          ) : (
            <ul className="checkion-issue-list">
              {domains.map((d) => (
                <li key={d.id}>
                  <Link href={paths.routes.domainDetail(d.id)}>
                    {d.rootUrl} · {d.pageCount} pages · score {d.overallScore ?? '—'}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <SectionChrome title="Sample shares" />
          <ul className="checkion-issue-list">
            {shares.map((s) => (
              <li key={s.token}>
                <Link href={paths.routes.shareDetail(s.token)}>
                  <Chip static size="sm">
                    {s.resourceType}
                  </Chip>{' '}
                  {s.token}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </AppShell>
  )
}
