import { describe, expect, it } from 'vitest'
import { paths } from '@/lib/paths'
import { AXE_RULE_WCAG_LEVEL } from '@/lib/scan/axe-wcag-levels'
import { getRemediationUrl, REMEDIATION_AXE_BASE } from '@/lib/scan/remediation-urls'

describe('WCAG detector remediation URLs', () => {
  it('points Deque docs at the installed axe minor (4.13)', () => {
    expect(REMEDIATION_AXE_BASE).toBe(paths.remediationAxeRulesBase)
    expect(REMEDIATION_AXE_BASE).toMatch(/\/rules\/axe\/4\.13$/)
  })

  it('builds axe rule help URLs from the central base', () => {
    expect(getRemediationUrl('color-contrast', 'axe')).toBe(
      `${paths.remediationAxeRulesBase}/color-contrast`,
    )
  })

  it('returns W3C quickref for htmlcs', () => {
    expect(getRemediationUrl('WCAG2AA.Principle1.Guideline1_1.1_1_1.H37', 'htmlcs')).toBe(
      paths.remediationWcagQuickref,
    )
  })

  it('maps no-autoplay-audio to WCAG A (axe 4.13)', () => {
    expect(AXE_RULE_WCAG_LEVEL['no-autoplay-audio']).toBe('A')
  })
})
