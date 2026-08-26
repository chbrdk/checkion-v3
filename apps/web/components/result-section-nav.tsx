'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'

export type ResultSectionId = 'overview' | 'issues' | 'detail'

export function ResultSectionNav({
  scanId,
  active,
  base = 'results',
}: {
  scanId: string
  active: ResultSectionId
  base?: 'results' | 'domain'
}) {
  const t = useT()
  const [compact, setCompact] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setCompact(!entry.isIntersecting)
      },
      {
        root: null,
        threshold: 0,
        rootMargin: '0px 0px 0px 0px',
      },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  const sections = [
    {
      id: 'overview' as const,
      index: '01',
      label: t('nav.overview'),
      href:
        base === 'results'
          ? paths.routes.resultSection(scanId, 'overview')
          : paths.routes.domainSection(scanId, 'overview'),
    },
    {
      id: 'issues' as const,
      index: '02',
      label: t('nav.issues'),
      href:
        base === 'results'
          ? paths.routes.resultSection(scanId, 'issues')
          : paths.routes.domainSection(scanId, 'issues'),
    },
    {
      id: 'detail' as const,
      index: '03',
      label: t('nav.detail'),
      href:
        base === 'results'
          ? paths.routes.resultSection(scanId, 'detail')
          : paths.routes.domainSection(scanId, 'detail'),
    },
  ]

  return (
    <>
      <div ref={sentinelRef} className="checkion-contents-sentinel" aria-hidden />
      <nav
        className={
          compact
            ? 'checkion-contents checkion-contents--compact'
            : 'checkion-contents'
        }
        aria-label={t('nav.resultSections')}
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
