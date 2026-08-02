import { DeferredJobsPage } from '../../components/deferred-jobs-page'
import { JOURNEY_JOB_FIXTURES } from '../../lib/fixtures/deferred-jobs'

/** Avoid SSG hitting Postgres when Coolify injects DATABASE_URL at build time. */
export const dynamic = 'force-dynamic'

export default function JourneyPage() {
  return (
    <DeferredJobsPage
      title="Journey agent"
      description="Deferred — one island agent service later; two product BFFs."
      jobs={JOURNEY_JOB_FIXTURES}
      specHint="No live journey agent in dummy mode. Cards preview the future session list."
    />
  )
}
