'use client'

import Link from 'next/link'
import type { SeoProjectChapter } from '../lib/paths'

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
  return (
    <div
      className="checkion-depth-grid checkion-seo-project__chapters"
      role="radiogroup"
      aria-label="SEO chapters"
    >
      {SEO_CHAPTER_NAV.map((item, i) => {
        const selected = active === item.id
        const className = selected
          ? 'checkion-depth-tile checkion-depth-tile--selected'
          : 'checkion-depth-tile'
        const body = (
          <>
            <span className="checkion-depth-tile__kicker" aria-hidden>
              {chapterIndex(i)}
            </span>
            <span className="checkion-depth-tile__label">{item.label}</span>
          </>
        )
        if (hrefFor) {
          return (
            <Link
              key={item.id}
              href={hrefFor(item.id)}
              role="radio"
              aria-checked={selected}
              aria-label={item.label}
              className={className}
            >
              {body}
            </Link>
          )
        }
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={item.label}
            className={className}
            onClick={() => onSelect?.(item.id)}
          >
            {body}
          </button>
        )
      })}
    </div>
  )
}
