'use client'

import Link from 'next/link'
import type { SeoProjectChapter } from '../lib/paths'
import { useT } from '../lib/user-prefs'

export const SEO_CHAPTER_NAV_IDS: SeoProjectChapter[] = [
  'overview',
  'keywords',
  'domain',
  'backlinks',
  'rank-tracking',
  'competitors',
  'gsc',
]

/** @deprecated Prefer SEO_CHAPTER_NAV_IDS + t(`seoMarket.nav.${id}`) */
export const SEO_CHAPTER_NAV: Array<{ id: SeoProjectChapter; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'keywords', label: 'Research' },
  { id: 'domain', label: 'Domain' },
  { id: 'backlinks', label: 'Backlinks' },
  { id: 'rank-tracking', label: 'Ranks' },
  { id: 'competitors', label: 'Field' },
  { id: 'gsc', label: 'GSC' },
]

function chapterIndex(i: number): string {
  return String(i + 1).padStart(2, '0')
}

/**
 * SEO chapter strip — same language as scan-launch depth tiles
 * (`checkion-depth-tile`), not chip toggles.
 */
export function SeoChapterNav({
  active,
  hrefFor,
  onSelect,
}: {
  active: string
  /** Next.js links (workspace). */
  hrefFor?: (id: SeoProjectChapter) => string
  /** Preview / in-page selection. */
  onSelect?: (id: SeoProjectChapter) => void
}) {
  const t = useT()
  return (
    <div
      className="checkion-depth-grid checkion-seo-project__chapters"
      role="radiogroup"
      aria-label={t('seoMarket.navAria')}
    >
      {SEO_CHAPTER_NAV_IDS.map((id, i) => {
        const label = t(`seoMarket.nav.${id}`)
        const selected = active === id
        const className = selected
          ? 'checkion-depth-tile checkion-depth-tile--selected'
          : 'checkion-depth-tile'
        const body = (
          <>
            <span className="checkion-depth-tile__kicker" aria-hidden>
              {chapterIndex(i)}
            </span>
            <span className="checkion-depth-tile__label">{label}</span>
          </>
        )
        if (hrefFor) {
          return (
            <Link
              key={id}
              href={hrefFor(id)}
              role="radio"
              aria-checked={selected}
              aria-label={label}
              className={className}
            >
              {body}
            </Link>
          )
        }
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            className={className}
            onClick={() => onSelect?.(id)}
          >
            {body}
          </button>
        )
      })}
    </div>
  )
}
