/**
 * Magazine overview: collapse repeated rule hits into ranked groups
 * so “What breaks” shows distinct finding types, not eight copies of one axe rule.
 */

import type { IssueSeverity, IssueSummary } from '@checkion-v3/contracts'

const SEVERITY_RANK: Record<IssueSeverity, number> = {
  critical: 4,
  serious: 3,
  moderate: 2,
  minor: 1,
}

function worseSeverity(a: IssueSeverity, b: IssueSeverity): IssueSeverity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b
}

/** Strip trailing help-URL parentheticals that axe often appends to messages. */
export function cleanIssueTitle(title: string): string {
  return title
    .replace(/\s*\((https?:\/\/[^)]+)\)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Group by ruleId (+ section), sum occurrences into `affectedCount`,
 * keep worst severity, then rank severity → count.
 */
export function selectTopIssueGroups(
  issues: IssueSummary[],
  limit = 8,
): IssueSummary[] {
  if (issues.length === 0) return []

  const groups = new Map<string, IssueSummary>()

  for (const issue of issues) {
    const key = `${issue.section}::${issue.ruleId}`
    const existing = groups.get(key)
    if (!existing) {
      groups.set(key, {
        ...issue,
        id: `${issue.scanId}-rule-${issue.ruleId}`,
        title: cleanIssueTitle(issue.title),
        affectedCount: Math.max(1, issue.affectedCount),
        // Magazine teaser: prefer rule summary, drop per-node selector noise
        selector: undefined,
        context: undefined,
        boundingBox: undefined,
      })
      continue
    }

    groups.set(key, {
      ...existing,
      severity: worseSeverity(existing.severity, issue.severity),
      affectedCount: existing.affectedCount + Math.max(1, issue.affectedCount),
      helpUrl: existing.helpUrl ?? issue.helpUrl,
      wcagLevel: existing.wcagLevel ?? issue.wcagLevel,
      runner: existing.runner ?? issue.runner,
      detail: existing.detail ?? issue.detail,
    })
  }

  return [...groups.values()]
    .sort((a, b) => {
      const sev = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]
      if (sev !== 0) return sev
      if (b.affectedCount !== a.affectedCount) return b.affectedCount - a.affectedCount
      return a.title.localeCompare(b.title)
    })
    .slice(0, limit)
}
