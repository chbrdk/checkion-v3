'use client'

import { useCallback, useId, useState } from 'react'
import Link from 'next/link'
import type { GeoRecommendation } from '@checkion-v3/contracts'
import { paths } from '../lib/paths'

function severityTone(severity: GeoRecommendation['severity']): 'neg' | 'low' | 'pos' {
  if (severity === 'high') return 'neg'
  if (severity === 'medium') return 'low'
  return 'pos'
}

export function GeoMovesGallery({
  recommendations,
  jobId,
}: {
  recommendations: GeoRecommendation[]
  jobId: string
}) {
  const labelId = useId()
  const total = recommendations.length
  const [index, setIndex] = useState(0)
  const safeIndex = total === 0 ? 0 : Math.min(index, total - 1)
  const rec = recommendations[safeIndex]

  const go = useCallback(
    (dir: -1 | 1) => {
      if (total <= 1) return
      setIndex((i) => (i + dir + total) % total)
    },
    [total],
  )

  if (!rec || total === 0) {
    return (
      <p className="checkion-geo-recs__empty" role="status">
        No moves for this run yet.
      </p>
    )
  }

  const title = rec.query ? (
    <Link
      href={paths.routes.geoQueriesPrompt(jobId, rec.query)}
      className="checkion-geo-recs__title-link"
    >
      {rec.title}
    </Link>
  ) : (
    <span className="checkion-geo-recs__title">{rec.title}</span>
  )

  return (
    <div
      className="checkion-geo-recs__gallery"
      role="region"
      aria-roledescription="carousel"
      aria-labelledby={labelId}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          go(-1)
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          go(1)
        }
      }}
    >
      <div className="checkion-geo-recs__toolbar">
        <p id={labelId} className="checkion-geo-recs__count">
          <span className="checkion-geo-recs__count-cur">
            {String(safeIndex + 1).padStart(2, '0')}
          </span>
          <span aria-hidden> / </span>
          <span>{String(total).padStart(2, '0')}</span>
        </p>
        {total > 1 ? (
          <div className="checkion-geo-recs__controls">
            <button
              type="button"
              className="checkion-geo-recs__ctrl"
              onClick={() => go(-1)}
              aria-label="Previous move"
            >
              ←
            </button>
            <button
              type="button"
              className="checkion-geo-recs__ctrl"
              onClick={() => go(1)}
              aria-label="Next move"
            >
              →
            </button>
          </div>
        ) : null}
      </div>

      <article
        key={rec.id}
        className="checkion-geo-recs__slide"
        data-tone={severityTone(rec.severity)}
        aria-label={`Move ${safeIndex + 1} of ${total}`}
      >
        <div className="checkion-geo-recs__slide-head">
          <span className="checkion-geo-recs__idx" aria-hidden>
            {String(safeIndex + 1).padStart(2, '0')}
          </span>
          <div className="checkion-geo-recs__meta">
            <span className="checkion-geo-recs__sev">{rec.severity}</span>
            {rec.source === 'derived' ? (
              <span className="checkion-geo-recs__src">insights</span>
            ) : null}
          </div>
        </div>
        <p className="checkion-geo-recs__lead">{title}</p>
        <p className="checkion-geo-recs__copy">{rec.body}</p>
        {rec.query ? (
          <p className="checkion-geo-recs__slide-cta">
            <Link
              href={paths.routes.geoQueriesPrompt(jobId, rec.query)}
              className="checkion-geo-recs__nav"
            >
              Open this prompt
            </Link>
          </p>
        ) : null}
      </article>

      {total > 1 ? (
        <ol className="checkion-geo-recs__ticks" aria-hidden>
          {recommendations.map((r, i) => (
            <li key={r.id}>
              <button
                type="button"
                className="checkion-geo-recs__tick"
                data-active={i === safeIndex ? 'true' : undefined}
                onClick={() => setIndex(i)}
                tabIndex={-1}
                aria-label={`Go to move ${i + 1}`}
              />
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}
