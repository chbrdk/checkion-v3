'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { GeoJobStatus } from '@checkion-v3/contracts'
import { isGeoJobInProgress } from '../lib/geo-job-display'
import { paths } from '../lib/paths'

const POLL_MS = 2000

/**
 * While a live GEO job is queued/running, poll the job API and refresh the
 * server-rendered overview once status advances (or fails).
 */
export function GeoJobStatusPoller({
  jobId,
  status,
}: {
  jobId: string
  status: GeoJobStatus
}) {
  const router = useRouter()

  useEffect(() => {
    if (!isGeoJobInProgress(status)) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const tick = async () => {
      try {
        const res = await fetch(paths.routes.apiGeoJobDetail(jobId), {
          cache: 'no-store',
        })
        if (cancelled || !res.ok) return
        const data = (await res.json()) as {
          job?: { status?: GeoJobStatus }
          status?: GeoJobStatus
        }
        const next = data.job?.status ?? data.status
        if (next && next !== status) {
          router.refresh()
          return
        }
      } catch {
        /* network blip — keep polling */
      }
      if (!cancelled) {
        timer = setTimeout(() => {
          void tick()
        }, POLL_MS)
      }
    }

    void tick()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [jobId, status, router])

  return null
}
