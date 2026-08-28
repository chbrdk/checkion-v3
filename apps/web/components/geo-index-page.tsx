import Link from 'next/link'
import { Button, Chip, Panel, SectionChrome, Text } from '@msqdx/ui'
import { AppShell } from './app-shell'
import { auth } from '../auth'
import { listGeoJobs } from '../lib/fixtures/geo-store'
import { listProjectsForViewer } from '../lib/fixtures/project-store'
import { paths } from '../lib/paths'
import { geoJobMeasurement, geoMeasurementLabel } from '../lib/geo/measurement'

export async function GeoIndexPage() {
  const jobs = await listGeoJobs()
  const session = await auth()
  const projects = Object.fromEntries(
    ((await listProjectsForViewer(session?.user?.id ?? null))).map((p) => [p.id, p.name]),
  )

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
            we show where your domain is cited and how E-E-A-T reads on-page. Start a new job from
            the central launch form.
          </Text>
          <div className="checkion-scan-form__actions checkion-scan-form__actions--after-copy">
            <Link href={paths.routes.scanLaunch({ mode: 'geo' })}>
              <Button variant="primary">Start GEO job</Button>
            </Link>
          </div>
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
                  <Chip static size="sm">
                    {geoMeasurementLabel(geoJobMeasurement(job))}
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
