'use client'

import { useMemo, useState } from 'react'
import {
  Accordion,
  Chip,
  EmptyState,
  FilterRow,
  Text,
} from '@msqdx/ui'
import type { IssueSeverity, IssueSummary } from '@checkion-v3/contracts'

const SEVERITIES: Array<IssueSeverity | 'all'> = [
  'all',
  'critical',
  'serious',
  'moderate',
  'minor',
]

const SECTIONS: Array<IssueSummary['section'] | 'all'> = [
  'all',
  'accessibility',
  'seo',
  'content',
  'technical',
  'ux',
]

function leadIssue(issues: IssueSummary[]): IssueSummary | null {
  const ranked = [...issues].sort((a, b) => {
    const order: Record<IssueSeverity, number> = {
      critical: 0,
      serious: 1,
      moderate: 2,
      minor: 3,
    }
    return order[a.severity] - order[b.severity]
  })
  return ranked[0] ?? null
}

export function IssueFilterPanel({
  issues,
  openId: controlledOpenId,
  onOpenChange,
}: {
  issues: IssueSummary[]
  openId?: string | null
  onOpenChange?: (id: string | null) => void
}) {
  const [severity, setSeverity] = useState<IssueSeverity | 'all'>('all')
  const [section, setSection] = useState<IssueSummary['section'] | 'all'>('all')
  const [internalOpenId, setInternalOpenId] = useState<string | null>(null)

  const openId = controlledOpenId !== undefined ? controlledOpenId : internalOpenId
  const setOpenId = onOpenChange ?? setInternalOpenId

  const lead = useMemo(() => leadIssue(issues), [issues])

  const filtered = useMemo(() => {
    return issues.filter((issue) => {
      if (severity !== 'all' && issue.severity !== severity) return false
      if (section !== 'all' && issue.section !== section) return false
      return true
    })
  }, [issues, severity, section])

  const counts = useMemo(() => {
    const bySev: Record<string, number> = { all: issues.length }
    for (const s of SEVERITIES) {
      if (s === 'all') continue
      bySev[s] = issues.filter((i) => i.severity === s).length
    }
    return bySev
  }, [issues])

  return (
    <div className="checkion-issue-filter checkion-dossier">
      {lead ? (
        <blockquote className="checkion-pullquote" cite={lead.ruleId}>
          <p className="checkion-spread__eyebrow">Lead finding</p>
          <p className="checkion-pullquote__text">{lead.title}</p>
          <footer>
            {lead.severity} · {lead.ruleId} · ×{lead.affectedCount}
            {lead.wcagLevel ? ` · WCAG ${lead.wcagLevel}` : ''}
          </footer>
        </blockquote>
      ) : null}

      <div className="checkion-severity-tally" aria-label="Severity mix">
        {(['critical', 'serious', 'moderate', 'minor'] as IssueSeverity[]).map((s) => (
          <button
            key={s}
            type="button"
            className="checkion-severity-tally__item"
            data-sev={s}
            data-active={severity === s ? 'true' : undefined}
            onClick={() => setSeverity(severity === s ? 'all' : s)}
          >
            <strong>{counts[s] ?? 0}</strong>
            <span>{s}</span>
          </button>
        ))}
      </div>

      <div className="checkion-dossier__filters">
        <FilterRow role="group" aria-label="Severity">
          {SEVERITIES.map((s) => (
            <Chip
              key={s}
              size="sm"
              selected={severity === s}
              onClick={() => setSeverity(s)}
              aria-pressed={severity === s}
            >
              {s}
              {s !== 'all' ? ` (${counts[s] ?? 0})` : ` (${counts.all})`}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow role="group" aria-label="Section">
          {SECTIONS.map((s) => (
            <Chip
              key={s}
              size="sm"
              selected={section === s}
              onClick={() => setSection(s)}
              aria-pressed={section === s}
            >
              {s}
            </Chip>
          ))}
        </FilterRow>
        <Text role="meta">
          Showing {filtered.length} of {issues.length}
        </Text>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>No issues match these filters.</EmptyState>
      ) : (
        <div className="checkion-dossier__inspect">
          <p className="checkion-spread__eyebrow">Inspect</p>
          <Accordion
            aria-label="Issue details"
            value={openId}
            onChange={setOpenId}
            items={filtered.map((issue, index) => ({
              id: issue.id,
              title: `${String(index + 1).padStart(2, '0')}  ${issue.title}`,
              preview: `${issue.severity} · ${issue.ruleId} · ×${issue.affectedCount}`,
              panel: (
                <div className="checkion-issue-detail">
                  <Text role="meta">
                    Section {issue.section} · rule {issue.ruleId}
                    {issue.runner ? ` · ${issue.runner}` : ''}
                    {issue.wcagLevel ? ` · WCAG ${issue.wcagLevel}` : ''}
                  </Text>
                  <p>
                    {issue.detail ??
                      'Dummy finding — remediation copy lands when the live scanner is wired.'}
                  </p>
                  {issue.selector ? (
                    <Text role="mono" as="p">
                      {issue.selector}
                    </Text>
                  ) : null}
                  {issue.context ? (
                    <pre className="checkion-issue-context">{issue.context}</pre>
                  ) : null}
                  {issue.boundingBox ? (
                    <Text role="meta">
                      Box {issue.boundingBox.x},{issue.boundingBox.y} ·{' '}
                      {issue.boundingBox.width}×{issue.boundingBox.height}
                    </Text>
                  ) : null}
                  {issue.helpUrl ? (
                    <a
                      href={issue.helpUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="checkion-band-action"
                    >
                      Rule help →
                    </a>
                  ) : null}
                </div>
              ),
            }))}
          />
        </div>
      )}
    </div>
  )
}
