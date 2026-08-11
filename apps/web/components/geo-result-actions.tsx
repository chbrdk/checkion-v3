'use client'

import { useState } from 'react'
import { Alert, Button } from '@msqdx/ui'
import type { GeoOverview } from '@checkion-v3/contracts'
import { ConfirmDialog } from '../lib/msqdx-ui-client'
import { isGeoJobInProgress } from '../lib/geo-job-display'
import { buildGeoRerunPayload } from '../lib/geo-rerun'
import { paths } from '../lib/paths'
import { useJobNotifications } from './job-notification-center'

export function GeoResultActions({ overview }: { overview: GeoOverview }) {
  const { trackJob } = useJobNotifications()
  const [rerunOpen, setRerunOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inProgress = isGeoJobInProgress(overview.job.status)
  const payload = buildGeoRerunPayload(overview)
  const canRerun = Boolean(payload) && !inProgress

  async function confirmRerun() {
    if (!payload) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(paths.routes.apiGeoJobs, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        let detail = `GEO re-run failed (${res.status})`
        try {
          const errBody = (await res.json()) as { detail?: string; error?: string }
          if (errBody.detail) detail = errBody.detail
          else if (errBody.error) detail = errBody.error
        } catch {
          /* keep status text */
        }
        throw new Error(detail)
      }
      const data = (await res.json()) as {
        jobId?: string
        job?: { id: string; status?: string }
        projectId?: string
      }
      const jobId = data.jobId || data.job?.id
      if (!jobId) throw new Error('GEO re-run returned no job id')
      trackJob({
        id: jobId,
        resource: 'geo',
        status: 'queued',
        title: 'GEO re-run',
        href: paths.routes.geoSection(jobId, 'overview'),
        projectId: data.projectId || payload.projectId,
        targetUrl: payload.url,
        detail: payload.url,
      })
      setRerunOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GEO re-run failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="checkion-result-actions">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={!canRerun || busy}
        onClick={() => setRerunOpen(true)}
        title={
          inProgress
            ? 'Wait for the current GEO run to finish'
            : !payload
              ? 'This job is missing re-run inputs'
              : undefined
        }
      >
        Re-run
      </Button>
      {error ? <Alert tone="error">{error}</Alert> : null}

      <ConfirmDialog
        open={rerunOpen}
        onClose={() => setRerunOpen(false)}
        onConfirm={confirmRerun}
        title="Re-run GEO?"
        confirmLabel="Re-run"
      >
        Queues a new GEO job with the same URL, prompts, and models for {overview.job.url}. The
        current result stays as-is; follow the new job in Notifications.
      </ConfirmDialog>
    </div>
  )
}
