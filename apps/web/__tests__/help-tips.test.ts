import { describe, expect, it } from 'vitest'
import {
  HELP_TIPS,
  resolveHelpTip,
  tipIdForDetailBand,
  tipIdForScoreKind,
} from '../lib/help-tips'

describe('help-tips', () => {
  it('falls back to English when locale is missing or unknown', () => {
    const en = resolveHelpTip('score.accessibility', 'en')
    expect(resolveHelpTip('score.accessibility', null).content).toBe(en.content)
    expect(resolveHelpTip('score.accessibility', 'fr').content).toBe(en.content)
    expect(en.label).toMatch(/Accessibility/i)
  })

  it('resolves German tip bodies when locale is de', () => {
    const de = resolveHelpTip('geo.discoverability', 'de')
    const en = resolveHelpTip('geo.discoverability', 'en')
    expect(de.content).toBe(HELP_TIPS['geo.discoverability'].de)
    expect(de.content).not.toBe(en.content)
    expect(de.label).toBe(en.label)
  })

  it('maps score kinds and detail bands to tip ids', () => {
    expect(tipIdForScoreKind('generative')).toBe('score.geo')
    expect(tipIdForScoreKind('unknown')).toBeNull()
    expect(tipIdForDetailBand('report-performance')).toBe('detail.performance')
    expect(tipIdForDetailBand('class-/-devices')).toBe('detail.class')
  })
})
