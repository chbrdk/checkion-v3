'use client'

import { Text } from '@msqdx/ui'
import type { GeoReadingKind } from '../lib/geo-readings'
import { paths } from '../lib/paths'
import { useEffect, useState } from 'react'

/** Fetchable magazine one-liner — light weight, not a heavy headline. */
export function GeoReading({
  jobId,
  kind,
  fallback,
  eyebrow,
  query,
}: {
  jobId: string
  kind: GeoReadingKind
  fallback: string
  eyebrow?: string
  /** Required when kind === 'query' */
  query?: string
}) {
  const [statement, setStatement] = useState(fallback)

  useEffect(() => {
    setStatement(fallback)
  }, [fallback])

  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()

    void (async () => {
      try {
        const res = await fetch(paths.routes.apiGeoReading(jobId, kind, query), {
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
  }, [jobId, kind, query, fallback])

  return (
    <div className="checkion-geo-reading">
      {eyebrow ? (
        <Text role="meta" as="p">
          {eyebrow}
        </Text>
      ) : null}
      <p className="checkion-geo-reading__statement">{statement}</p>
    </div>
  )
}
