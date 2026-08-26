import { AppShell } from '../components/app-shell'
import { HomeMagazine } from '../components/home-magazine'
import { listGeoJobs } from '../lib/fixtures/geo-store'
import { listProjects } from '../lib/fixtures/project-store'
import { listDomainScans, listScans } from '../lib/fixtures/scan-store'

/** Avoid SSG hitting Postgres when Coolify injects DATABASE_URL at build time. */
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [projects, scans, domains, geoJobs] = await Promise.all([
    listProjects(),
    listScans(),
    listDomainScans(),
    listGeoJobs(),
  ])

  return (
    <AppShell>
      <HomeMagazine
        projects={projects}
        scans={scans}
        domains={domains}
        geoJobs={geoJobs}
      />
    </AppShell>
  )
}
