import { DeferredJobsPage } from '../../components/deferred-jobs-page'
import { REPORT_JOB_FIXTURES } from '../../lib/fixtures/deferred-jobs'

export default function ReportsPage() {
  return (
    <DeferredJobsPage
      title="Reports"
      description="Deferred project reports — dummy digest cards."
      jobs={REPORT_JOB_FIXTURES}
      specHint="Multi-agent reports arrive after Core Quality MVP. These cards are placeholders."
    />
  )
}
