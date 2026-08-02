'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Chip, EmptyState, Input } from '@msqdx/ui'
import type { IssueSeverity, IssueSummary } from '@checkion-v3/contracts'
import { DomainIssueAffectedPages } from './domain-issue-affected-pages'

const SEVERITIES: Array<IssueSeverity | 'all'> = [
  'all',
  'critical',
  'serious',
  'moderate',
  'minor',
]

const PAGE_SIZE = 25

/** Domain issues = systemic groups by pages affected — no capture canvas. */
export function DomainIssuesPanel({
  domainId,
  issues,
}: {
  domainId: string
  issues: IssueSummary[]
}) {
  const [q, setQ] = useState('')
  const [severity, setSeverity] = useState<IssueSeverity | 'all'>('all')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const deferredQ = useDeferredValue(q)

  const filtered = useMemo(() => {
    const needle = deferredQ.trim().toLowerCase()
    return [...issues]
      .filter((i) => (severity === 'all' ? true : i.severity === severity))
      .filter((i) => {
        if (!needle) return true
        return (
          i.title.toLowerCase().includes(needle) ||
          i.ruleId.toLowerCase().includes(needle) ||
          (i.detail ?? '').toLowerCase().includes(needle)
        )
      })
      .sort((a, b) => b.affectedCount - a.affectedCount)
  }, [issues, deferredQ, severity])

  const total = filtered.length
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    setPage(1)
    setExpandedId(null)
  }, [deferredQ, severity])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const maxPages = Math.max(1, ...filtered.map((i) => i.affectedCount), 1)
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="checkion-magazine-body checkion-spread checkion-domain-issues">
      <header className="checkion-issues-panel__head">
        <p className="checkion-spread__eyebrow">Chapter 02 · Issues</p>
        <h3 id="domain-issues-chapter" className="checkion-issues-panel__title">
          Systemic issue groups
        </h3>
      </header>

      <div className="checkion-domain-issues__toolbar">
        <Input
          aria-label="Filter issue groups"
          placeholder="Filter by rule or title…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="checkion-chip-row" role="group" aria-label="Severity filter">
          {SEVERITIES.map((s) => (
            <button
              key={s}
              type="button"
              className="checkion-domain-filter"
              data-active={severity === s ? 'true' : undefined}
              onClick={() => setSeverity(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>No issue groups match.</EmptyState>
      ) : (
        <>
          <ul className="checkion-domain-issues__list">
            {pageItems.map((issue) => {
              const width = Math.max(6, Math.round((100 * issue.affectedCount) / maxPages))
              const open = expandedId === issue.id
              const panelId = `domain-issue-panel-${issue.id}`
              return (
                <li
                  key={issue.id}
                  className="checkion-domain-issues__item"
                  data-expanded={open ? 'true' : undefined}
                >
                  <button
                    type="button"
                    className="checkion-domain-issues__row"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setExpandedId(open ? null : issue.id)}
                  >
                    <Chip static size="sm">
                      {issue.severity}
                    </Chip>
                    <span className="checkion-domain-issues__title">{issue.title}</span>
                    <span className="checkion-domain-issues__pages">
                      {issue.affectedCount.toLocaleString()} pages
                    </span>
                    <span className="checkion-domain-systemic__bar" aria-hidden>
                      <span style={{ width: `${width}%` }} />
                    </span>
                  </button>
                  {open ? (
                    <div id={panelId} className="checkion-domain-issues__expand">
                      <div className="checkion-chip-row">
                        <Chip static size="sm">
                          {issue.section}
                        </Chip>
                        {issue.runner ? (
                          <Chip static size="sm">
                            {issue.runner}
                          </Chip>
                        ) : null}
                        {issue.wcagLevel ? (
                          <Chip static size="sm">
                            WCAG {issue.wcagLevel}
                          </Chip>
                        ) : null}
                      </div>
                      <p className="checkion-domain-issues__rule">{issue.ruleId}</p>
                      {issue.detail ? (
                        <p className="checkion-domain-issues__detail">{issue.detail}</p>
                      ) : null}
                      {issue.helpUrl ? (
                        <a
                          className="checkion-domain-issues__help"
                          href={issue.helpUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Rule help
                        </a>
                      ) : null}
                      <DomainIssueAffectedPages
                        domainId={domainId}
                        issueId={issue.id}
                        totalHint={issue.affectedCount}
                      />
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>

          <nav className="checkion-domain-issues__pager" aria-label="Issue groups pages">
            <p className="checkion-domain-issues__pager-meta" aria-live="polite">
              Showing {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()} of{' '}
              {total.toLocaleString()}
            </p>
            <div className="checkion-domain-issues__pager-actions">
              <button
                type="button"
                className="checkion-domain-filter"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="checkion-domain-filter"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                Next
              </button>
            </div>
          </nav>
        </>
      )}
    </div>
  )
}
