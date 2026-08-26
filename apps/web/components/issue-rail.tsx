'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Chip, EmptyState, FilterRow, Text } from '@msqdx/ui'
import type { IssueSeverity, IssueSummary } from '@checkion-v3/contracts'
import type { TipId } from '../lib/help-tips'
import { useT } from '../lib/user-prefs'
import { LabelWithTip } from './help-tip'

const SEVERITIES: Array<IssueSeverity | 'all'> = [
  'all',
  'critical',
  'serious',
  'moderate',
  'minor',
]

const SEVERITY_TIP: Partial<Record<IssueSeverity, TipId>> = {
  critical: 'issue.severity.critical',
  serious: 'issue.severity.serious',
  moderate: 'issue.severity.moderate',
  minor: 'issue.severity.minor',
}

/** Compact expandable issue rail for the 20% column beside the capture. */
export function IssueRail({
  issues,
  openId,
  onOpenChange,
}: {
  issues: IssueSummary[]
  openId: string | null
  onOpenChange: (id: string | null) => void
}) {
  const t = useT()
  const [severity, setSeverity] = useState<IssueSeverity | 'all'>('all')
  const listRef = useRef<HTMLUListElement>(null)

  const filtered = useMemo(() => {
    return issues.filter((issue) => {
      if (severity !== 'all' && issue.severity !== severity) return false
      return true
    })
  }, [issues, severity])

  const counts = useMemo(() => {
    const bySev: Record<string, number> = { all: issues.length }
    for (const s of SEVERITIES) {
      if (s === 'all') continue
      bySev[s] = issues.filter((i) => i.severity === s).length
    }
    return bySev
  }, [issues])

  useEffect(() => {
    if (!openId || !listRef.current) return
    const node = listRef.current.querySelector(`[data-issue-id="${openId}"]`)
    if (node && 'scrollIntoView' in node) {
      try {
        ;(node as HTMLElement).scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      } catch {
        /* jsdom */
      }
    }
  }, [openId])

  return (
    <aside className="checkion-issue-rail" aria-label={t('results.issuesChrome.findings')}>
      <header className="checkion-issue-rail__head">
        <p className="checkion-spread__eyebrow">{t('results.issuesChrome.findings')}</p>
        <p className="checkion-issue-rail__count">
          {filtered.length}/{issues.length}
        </p>
      </header>

      <div className="checkion-issue-rail__filters">
        <span className="checkion-issue-rail__filter-label">{t('results.issuesChrome.severity')}</span>
        <div
          className="checkion-issue-rail__sev-tips"
          aria-label={t('results.issuesChrome.severityGlossary')}
        >
          {(['critical', 'serious', 'moderate', 'minor'] as const).map((s) => (
            <LabelWithTip key={s} tipId={SEVERITY_TIP[s]!}>
              <span className="checkion-issue-rail__sev-tip">{s}</span>
            </LabelWithTip>
          ))}
        </div>
        <FilterRow role="group" aria-label={t('results.issuesChrome.severity')}>
          {SEVERITIES.map((s) => (
            <Chip
              key={s}
              size="sm"
              selected={severity === s}
              onClick={() => setSeverity(s)}
              aria-pressed={severity === s}
            >
              {s === 'all'
                ? t('results.issuesChrome.allCount', { count: counts.all })
                : `${s[0]!.toUpperCase()} ${counts[s] ?? 0}`}
            </Chip>
          ))}
        </FilterRow>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>{t('results.issuesChrome.noMatches')}</EmptyState>
      ) : (
        <ul className="checkion-issue-rail__list" ref={listRef}>
          {filtered.map((issue, index) => {
            const open = issue.id === openId
            return (
              <li
                key={issue.id}
                data-issue-id={issue.id}
                data-open={open ? 'true' : undefined}
                data-sev={issue.severity}
              >
                <button
                  type="button"
                  className="checkion-issue-rail__row"
                  aria-expanded={open}
                  onClick={() => onOpenChange(open ? null : issue.id)}
                >
                  <span className="checkion-issue-rail__idx">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="checkion-issue-rail__title">{issue.title}</span>
                  <span className="checkion-issue-rail__meta">
                    {issue.severity}
                    {issue.boundingBox ? t('results.issuesChrome.mapSuffix') : ''}
                  </span>
                </button>
                {open ? (
                  <div className="checkion-issue-rail__body">
                    <Text role="meta">
                      {issue.ruleId}
                      {issue.wcagLevel ? ` · WCAG ${issue.wcagLevel}` : ''}
                      {issue.runner ? ` · ${issue.runner}` : ''}
                    </Text>
                    <p>
                      {issue.detail ?? t('results.issuesChrome.dummyDetail')}
                    </p>
                    {issue.selector ? (
                      <Text role="mono" as="p">
                        {issue.selector}
                      </Text>
                    ) : null}
                    {issue.helpUrl ? (
                      <a
                        href={issue.helpUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="checkion-band-action"
                      >
                        {t('results.issuesChrome.ruleHelp')}
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
