import Link from 'next/link'
import { Chip, Panel, SectionChrome, Text } from '@msqdx/ui'
import { AppShell } from './app-shell'
import { auth } from '../auth'
import { listProjectsForViewer } from '../lib/fixtures/project-store'
import type { DeferredJobCard } from '../lib/fixtures/deferred-jobs'
import { paths } from '../lib/paths'

export async function DeferredJobsPage({
  title,
  description,
  jobs,
  specHint,
}: {
  title: string
  description: string
  jobs: DeferredJobCard[]
  specHint: string
}) {
  const session = await auth()
  const projects = Object.fromEntries(
    ((await listProjectsForViewer(session?.user?.id ?? null))).map((p) => [p.id, p.name]),
  )

  return (
    <AppShell title={title} description={description}>
      <div className="checkion-magazine">
        <Panel>
          <SectionChrome title="Deferred slice" meta="dummy" />
          <Text role="body">{specHint}</Text>
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href={paths.routes.scan}>Core Quality scan →</Link>
            <Link href={paths.routes.home}>Home →</Link>
          </div>
        </Panel>

        <Panel>
          <SectionChrome title="Fixture cards" meta={`${jobs.length}`} />
          <ul className="checkion-issue-list">
            {jobs.map((job) => (
              <li key={job.id} className="checkion-index-card">
                <div className="checkion-index-card__meta">
                  <Chip static size="sm">
                    {job.status}
                  </Chip>
                  <Text role="meta">{projects[job.projectId] ?? job.projectId}</Text>
                </div>
                <strong>{job.title}</strong>
                <Text role="meta">{job.summary}</Text>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </AppShell>
  )
}
