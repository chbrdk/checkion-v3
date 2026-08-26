'use client'

import { useEffect, useState } from 'react'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'

export function DomainSeoReading({
  domainId,
  fallback,
  headingId = 'seo-heading',
}: {
  domainId: string
  fallback: string
  headingId?: string
}) {
  const t = useT()
  const [statement, setStatement] = useState(fallback)

  useEffect(() => {
    setStatement(fallback)
  }, [fallback])

  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()

    void (async () => {
      try {
        const res = await fetch(paths.routes.apiDomainSeoReading(domainId), {
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
    <div className="checkion-domain-reading checkion-domain-reading--headline">
      <p className="checkion-spread__eyebrow">{t('domain.seoCoverage')}</p>
      <h3 id={headingId} className="checkion-domain-reading__quote">
        {statement}
      </h3>
    </div>
  )
}
