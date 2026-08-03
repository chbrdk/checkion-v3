'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button, Chip, FilterRow } from '@msqdx/ui'
import type { IssueAffectedPagesResult } from '@checkion-v3/contracts'
import { paths } from '../lib/paths'
import { scoreTone } from '../lib/scan-display'

const AFFECTED_PAGE_SIZE = 25

type SortMode = IssueAffectedPagesResult['sort']
type DensityFilter = 'all' | 'heavy' | 'medium' | 'light'

/** Issue-load bands for the density filter (inclusive). */
const DENSITY_BAND: Record<DensityFilter, { min: number; max: number | null }> = {
  all: { min: 0, max: null },
  heavy: { min: 12, max: null },
  medium: { min: 5, max: 11 },
  light: { min: 1, max: 4 },
}

function compactPath(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname === '/' ? '/' : u.pathname.replace(/\/$/, '')
    return path.length > 64 ? `${path.slice(0, 61)}…` : path
  } catch {
    return url.length > 64 ? `${url.slice(0, 61)}…` : url
  }
}

/** Map issue load to score-like tone (more overlap = worse). */
function loadTone(issueCount: number): ReturnType<typeof scoreTone> {
  if (issueCount >= 12) return scoreTone(40)
  if (issueCount >= 5) return scoreTone(65)
  return scoreTone(85)
}

export function DomainIssueAffectedPages({
  domainId,
  issueId,
  totalHint,
}: {
  domainId: string
  issueId: string
  totalHint: number
}) {
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<SortMode>('issues-desc')
  const [density, setDensity] = useState<DensityFilter>('all')
  const [data, setData] = useState<IssueAffectedPagesResult | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setPage(1)
    setSort('issues-desc')
    setDensity('all')
  }, [issueId])

  useEffect(() => {
    setPage(1)
  }, [sort, density])

  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()
    setLoading(true)
    setError(false)

    void (async () => {
      try {
        const band = DENSITY_BAND[density]
        const qs = new URLSearchParams({
          page: String(page),
          pageSize: String(AFFECTED_PAGE_SIZE),
          sort,
          minIssues: String(band.min),
        })
        if (band.max != null) qs.set('maxIssues', String(band.max))
        const res = await fetch(
          `${paths.routes.apiDomainIssuePages(domainId, issueId)}?${qs}`,
          { signal: ctrl.signal, cache: 'no-store' },
        )
        if (!res.ok) throw new Error('fetch_failed')
        const json = (await res.json()) as IssueAffectedPagesResult
        if (!cancelled) setData(json)
      } catch {
        if (!cancelled) {
          setError(true)
          setData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [domainId, issueId, page, sort, density])

  const total = data?.total ?? (density === 'all' ? totalHint : 0)
  const pageCount = Math.max(1, Math.ceil(Math.max(total, 1) / AFFECTED_PAGE_SIZE))
  const rangeStart = total === 0 ? 0 : (page - 1) * AFFECTED_PAGE_SIZE + 1
  const rangeEnd = Math.min(page * AFFECTED_PAGE_SIZE, total)

  return (
    <div className="checkion-domain-issues__affected">
      <div className="checkion-domain-issues__affected-toolbar">
        <p className="checkion-domain-issues__affected-label">Affected pages</p>
        <FilterRow role="group" aria-label="Sort affected pages">
          <Chip
            size="sm"
            selected={sort === 'issues-desc'}
            onClick={() => setSort('issues-desc')}
          >
            Most issues
          </Chip>
          <Chip
            size="sm"
            selected={sort === 'issues-asc'}
            onClick={() => setSort('issues-asc')}
          >
            Fewest issues
          </Chip>
        </FilterRow>
        <FilterRow role="group" aria-label="Filter by issue density">
          {(
            [
              ['all', 'All'],
              ['heavy', 'Heavy'],
              ['medium', 'Medium'],
              ['light', 'Light'],
            ] as const
          ).map(([id, label]) => (
            <Chip
              key={id}
              size="sm"
              selected={density === id}
              onClick={() => setDensity(id)}
            >
              {label}
            </Chip>
          ))}
        </FilterRow>
      </div>

      {loading && !data ? (
        <p className="checkion-domain-issues__affected-status">Loading pages…</p>
      ) : null}
      {error ? (
        <p className="checkion-domain-issues__affected-status">Could not load pages.</p>
      ) : null}

      {data?.items.length ? (
        <table className="checkion-report__table checkion-domain-issues__affected-table" aria-label="Affected pages">
          <thead>
            <tr>
              <th scope="col">Page</th>
              <th scope="col">Issues</th>
              <th scope="col">Critical</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.url} data-tone={loadTone(item.issueCount)}>
                <th scope="row">
                  <Link
                    href={paths.routes.resultDetail(item.scanId)}
                    title={item.url}
                  >
                    {compactPath(item.url)}
                  </Link>
                </th>
                <td className="checkion-domain-issues__affected-num">{item.issueCount}</td>
                <td className="checkion-domain-issues__affected-num">{item.criticalCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {!loading && !error && data && data.items.length === 0 ? (
        <p className="checkion-domain-issues__affected-status">No pages match this filter.</p>
      ) : null}

      {total > 0 ? (
        <nav
          className="checkion-domain-issues__pager checkion-domain-issues__pager--nested"
          aria-label="Affected pages"
        >
          <p className="checkion-domain-issues__pager-meta" aria-live="polite">
            Pages {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()} of{' '}
            {total.toLocaleString()}
          </p>
          <div className="checkion-domain-issues__pager-actions">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= pageCount || loading}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Next
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  )
}
