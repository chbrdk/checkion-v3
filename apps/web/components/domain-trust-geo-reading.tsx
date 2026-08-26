'use client'

import { useEffect, useState } from 'react'
import { paths } from '../lib/paths'
import { useT, useUserPrefs } from '../lib/user-prefs'

export function DomainTrustGeoReading({
  domainId,
  fallback,
}: {
  domainId: string
  fallback: string
}) {
  const t = useT()
  const { locale } = useUserPrefs()
  const [statement, setStatement] = useState(fallback)

  useEffect(() => {
    setStatement(fallback)
  }, [fallback])

  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()

    void (async () => {
      try {
        const url = `${paths.routes.apiDomainTrustReading(domainId)}?locale=${encodeURIComponent(locale)}`
        const res = await fetch(url, {
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
  }, [domainId, fallback, locale])

  return (
    <aside className="checkion-domain-reading" aria-label={t('domain.readingAria')}>
      <p className="checkion-domain-reading__eyebrow">{t('domain.reading')}</p>
      <blockquote className="checkion-domain-reading__quote">
        <p>{statement}</p>
      </blockquote>
    </aside>
  )
}
