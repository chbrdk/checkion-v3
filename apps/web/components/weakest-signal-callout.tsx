'use client'

import { useEffect, useState } from 'react'
import { paths } from '../lib/paths'

export function WeakestSignalCallout({
  scanId,
  fallback,
}: {
  scanId: string
  fallback: string
}) {
  const [statement, setStatement] = useState(fallback)

  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()

    void (async () => {
      try {
        const res = await fetch(paths.routes.apiScanWeakestSignal(scanId), {
          signal: ctrl.signal,
          cache: 'no-store',
        })
        if (!res.ok) return
        const data = (await res.json()) as { statement?: string }
        if (!cancelled && data.statement?.trim()) {
          setStatement(data.statement.trim())
        }
      } catch {
        /* keep fallback */
      }
    })()

    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [scanId])

  return (
    <aside
      className="checkion-spread__callout checkion-spread__callout--signal"
      aria-label="Weakest signal"
    >
      <blockquote className="checkion-spread__signal-quote">
        <p>{statement}</p>
      </blockquote>
    </aside>
  )
}
