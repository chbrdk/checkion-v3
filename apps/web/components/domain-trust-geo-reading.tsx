'use client'

import { useEffect, useState } from 'react'
import { paths } from '../lib/paths'

export function DomainTrustGeoReading({
  domainId,
  fallback,
}: {
  domainId: string
  fallback: string
}) {
  const [statement, setStatement] = useState(fallback)

  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()

    void (async () => {
      try {
        const res = await fetch(paths.routes.apiDomainTrustReading(domainId), {
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
  }, [domainId, fallback])

  return (
    <aside className="checkion-domain-reading" aria-label="Trust and GEO reading">
      <p className="checkion-domain-reading__eyebrow">Reading</p>
      <blockquote className="checkion-domain-reading__quote">
        <p>{statement}</p>
      </blockquote>
    </aside>
  )
}
