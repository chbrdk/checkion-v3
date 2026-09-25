import { HomeMagazine } from '../../components/home-magazine'
import { auth } from '../../auth'
import {
  listDomainScansForViewer,
  listGeoJobsForViewer,
  listScansForViewer,
} from '../../lib/resource-access'
import { listProjectsForViewer } from '../../lib/fixtures/project-store'

/** Avoid SSG hitting Postgres when Coolify injects DATABASE_URL at build time. */
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const session = await auth()
  const viewerId = session?.user?.id ?? null
  const [projects, scans, domains, geoJobs] = await Promise.all([
    listProjectsForViewer(viewerId),
    // Home magazine only needs recent teasers — avoid loading every scan payload.
    listScansForViewer(viewerId, undefined, { limit: 40 }),
    listDomainScansForViewer(viewerId, undefined, { limit: 40 }),
    listGeoJobsForViewer(viewerId, undefined, { limit: 40 }),
  ])

  return (
    <HomeMagazine
      projects={projects}
      scans={scans}
      domains={domains}
      geoJobs={geoJobs}
    />
  )
}
