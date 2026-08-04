'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { paths } from '../lib/paths'

const POLL_MS = 2000

type PollStatus = 'queued' | 'running' | 'completed' | 'failed'

export function ScanStatusPoller({
  scanId,
  status,
  resource = 'scan',
}: {
  scanId: string
  status: PollStatus
  resource?: 'scan' | 'domain'
}) {
  const router = useRouter()
  const endpoint =
    resource === 'domain'
      ? paths.routes.apiDomainScanDetail(scanId)
      : paths.routes.apiScanDetail(scanId)

  useEffect(() => {
    if (status !== 'queued' && status !== 'running') return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const tick = async () => {
      try {
        const res = await fetch(endpoint, { cache: 'no-store' })
        if (cancelled || !res.ok) return
        const data = (await res.json()) as { status?: PollStatus }
        if (data.status && data.status !== status) {
          router.refresh()
          return
        }
      } catch {
        /* ignore network blips */
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
  }, [endpoint, router, status])

  return null
}

