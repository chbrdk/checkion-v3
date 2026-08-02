import Link from 'next/link'
import { Chip, Panel, SectionChrome, Text } from '@msqdx/ui'
import { AppShell } from './app-shell'
import { listGeoJobs } from '../lib/fixtures/geo-store'
import { listProjects } from '../lib/fixtures/project-store'
import { paths } from '../lib/paths'

export async function GeoIndexPage() {
  const jobs = await listGeoJobs()
  const projects = Object.fromEntries(((await listProjects())).map((p) => [p.id, p.name]))

  return (
    <AppShell
      title="GEO / E-E-A-T"
      description="Competitive LLM placement — fixture magazine results."
    >
      <div className="checkion-magazine checkion-magazine--editorial">
        <Panel>
          <SectionChrome title="GEO jobs" meta={`${jobs.length} fixtures`} />
          <Text role="body">
            Separate from single and domain scans: project queries run against answer engines, then
            we show where your domain is cited and how E-E-A-T reads on-page.
          </Text>
        </Panel>

        <Panel>
          <SectionChrome title="Completed runs" meta="open magazine" />
          <ul className="checkion-issue-list">
            {jobs.map((job) => {
              return (
                <li key={job.id} className="checkion-index-card">
                  <div className="checkion-index-card__meta">
                    <Chip static size="sm">
                      {job.status}
                    </Chip>
                    <Text role="meta">{projects[job.projectId] ?? job.projectId}</Text>
                    <Chip static size="sm">
                      {job.overallScore ?? '—'}
                    </Chip>
                  </div>
                  <Link href={paths.routes.geoSection(job.id, 'overview')}>
                    <strong>{job.title}</strong>
                  </Link>
                  <Text role="meta">
                    {job.queryCount} queries · {job.modelCount} models · {job.citedShare}% cited ·{' '}
                    {job.url}
                  </Text>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>
    </AppShell>
  )
}
