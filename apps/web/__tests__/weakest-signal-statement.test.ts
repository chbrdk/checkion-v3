import { describe, expect, it } from 'vitest'
import { getScanOverview } from '../lib/fixtures/scan-store'
import {
  buildWeakestSignalContext,
  buildWeakestSignalFallback,
} from '../lib/weakest-signal-statement'

describe('weakest signal statement', () => {
  it('builds accessibility-aware fallback for live scan-single-1', () => {
    const overview = getScanOverview('scan-single-1')
    expect(overview).toBeTruthy()
    const line = buildWeakestSignalFallback(overview!)
    expect(line.toLowerCase()).toMatch(/accessib|contrast|wcag|a11y|finding/)
    expect(line.length).toBeGreaterThan(24)
    expect(line).not.toMatch(/\n/)
  })

  it('packs opening-spread context for the LLM prompt', () => {
    const overview = getScanOverview('scan-single-1')
    const ctx = buildWeakestSignalContext(overview!)
    expect(ctx.weakest).toMatchObject({ kind: 'accessibility', value: 0 })
    expect(ctx.generative).toMatchObject({ hasLlmsTxt: false, hasFaqSchema: false })
    expect(Array.isArray(ctx.scoreline)).toBe(true)
  })
})
