import { describe, expect, it } from 'vitest'
import {
  buildCompetitiveSystemPrompt,
  parseCompetitiveResponse,
} from '../lib/geo-eeat/competitive-response'

describe('buildCompetitiveSystemPrompt (honesty)', () => {
  it('does not embed target or competitor domains', () => {
    const prompt = buildCompetitiveSystemPrompt()
    expect(prompt).not.toMatch(/moebel-martin|known domains|use that domain/i)
    expect(prompt).toMatch(/genuinely recommend/i)
    expect(prompt).toMatch(/Empty citations are fine/i)
    expect(prompt).toMatch(/citations/)
  })

  it('still defines the JSON answer + citations contract', () => {
    const prompt = buildCompetitiveSystemPrompt()
    expect(prompt).toContain('"answer"')
    expect(prompt).toContain('"citations"')
  })
})

describe('parseCompetitiveResponse', () => {
  it('keeps post-hoc placement data when domains are present', () => {
    const parsed = parseCompetitiveResponse(
      JSON.stringify({
        answer: 'Two retailers worth comparing.',
        citations: [
          { domain: 'ikea.com', position: 1 },
          { domain: 'moebel-martin.de', position: 2 },
        ],
      }),
    )
    expect(parsed.citations).toEqual([
      { domain: 'ikea.com', position: 1 },
      { domain: 'moebel-martin.de', position: 2 },
    ])
  })
})
