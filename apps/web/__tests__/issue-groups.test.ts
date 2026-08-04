import { describe, expect, it } from 'vitest'
import type { IssueSummary } from '@checkion-v3/contracts'
import { cleanIssueTitle, selectTopIssueGroups } from '../lib/issue-groups'

function issue(
  partial: Pick<IssueSummary, 'id' | 'ruleId' | 'title' | 'severity'> &
    Partial<IssueSummary>,
): IssueSummary {
  return {
    scanId: 'scan-1',
    section: 'accessibility',
    affectedCount: 1,
    ...partial,
  }
}

describe('selectTopIssueGroups', () => {
  it('collapses repeated rule hits and ranks by severity then count', () => {
    const grouped = selectTopIssueGroups(
      [
        issue({
          id: 'a1',
          ruleId: 'aria-hidden-focus',
          title:
            'ARIA hidden element must not be focusable (https://dequeuniversity.com/rules/axe/4.11/aria-hidden-focus)',
          severity: 'critical',
        }),
        issue({
          id: 'a2',
          ruleId: 'aria-hidden-focus',
          title: 'ARIA hidden element must not be focusable',
          severity: 'critical',
        }),
        issue({
          id: 'a3',
          ruleId: 'aria-hidden-focus',
          title: 'ARIA hidden element must not be focusable',
          severity: 'critical',
        }),
        issue({
          id: 'b1',
          ruleId: 'color-contrast',
          title: 'Elements must have sufficient color contrast',
          severity: 'serious',
        }),
        issue({
          id: 'c1',
          ruleId: 'image-alt',
          title: 'Images must have alternate text',
          severity: 'critical',
        }),
      ],
      8,
    )

    expect(grouped).toHaveLength(3)
    expect(grouped[0]?.ruleId).toBe('aria-hidden-focus')
    expect(grouped[0]?.affectedCount).toBe(3)
    expect(grouped[0]?.title).toBe('ARIA hidden element must not be focusable')
    expect(grouped[1]?.ruleId).toBe('image-alt')
    expect(grouped[2]?.ruleId).toBe('color-contrast')
  })

  it('respects limit so more rule types fit the magazine teaser', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      issue({
        id: `i${i}`,
        ruleId: i < 12 ? 'aria-hidden-focus' : `rule-${i}`,
        title: i < 12 ? 'Repeated' : `Other ${i}`,
        severity: 'serious',
      }),
    )
    const grouped = selectTopIssueGroups(many, 5)
    expect(grouped).toHaveLength(5)
    expect(grouped[0]?.ruleId).toBe('aria-hidden-focus')
    expect(grouped[0]?.affectedCount).toBe(12)
    expect(grouped.map((g) => g.ruleId)).toContain('rule-12')
  })
})

describe('cleanIssueTitle', () => {
  it('strips trailing help URL parentheses', () => {
    expect(
      cleanIssueTitle(
        'Color contrast (https://dequeuniversity.com/rules/axe/4.11/color-contrast?application=axeAPI)',
      ),
    ).toBe('Color contrast')
  })
})
