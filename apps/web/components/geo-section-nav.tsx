'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'

export type GeoSectionId = 'overview' | 'queries'

/** Expand only after sentinel is clearly back in view — stops sticky thrash. */
const EXPAND_HYSTERESIS_PX = 28

export function GeoSectionNav({
  jobId,
  active,
}: {
  jobId: string
  active: GeoSectionId
}) {
  const t = useT()
  const [compact, setCompact] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const compactRef = useRef(false)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        const top = entry.boundingClientRect.top
        const next = compactRef.current
          ? top > EXPAND_HYSTERESIS_PX
            ? false
            : true
          : top < 0
        if (next === compactRef.current) return
        compactRef.current = next
        setCompact(next)
      },
      { root: null, threshold: [0, 1], rootMargin: '0px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  const sections = [
    {
      id: 'overview' as const,
      index: '01',
      label: t('nav.overview'),
      href: paths.routes.geoSection(jobId, 'overview'),
    },
    {
      id: 'queries' as const,
      index: '02',
      label: t('nav.queries'),
      href: paths.routes.geoSection(jobId, 'queries'),
    },
  ]

  return (
    <>
      <div ref={sentinelRef} className="checkion-contents-sentinel" aria-hidden />
      <nav
        className={
          compact ? 'checkion-contents checkion-contents--compact' : 'checkion-contents'
        }
        aria-label={t('nav.geoSections')}
        data-compact={compact ? 'true' : undefined}
      >
        <p className="checkion-contents__label">{t('nav.contents')}</p>
        <ul className="checkion-contents__list" role="tablist">
          {sections.map((s) => {
            const selected = s.id === active
            return (
              <li key={s.id} className="checkion-contents__item">
                <Link
                  href={s.href}
                  role="tab"
                  aria-selected={selected}
                  className={
                    selected
                      ? 'checkion-contents__link checkion-contents__link--active'
                      : 'checkion-contents__link'
                  }
                  data-section={s.id}
                >
                  <span className="checkion-contents__index" aria-hidden>
                    {s.index}
                  </span>
                  <span className="checkion-contents__name">{s.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
