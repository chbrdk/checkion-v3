import { describe, expect, it } from 'vitest'
import {
  buildCompetitiveSystemPrompt,
  citationMatchesTargetHost,
  hostEqualsOrSubdomain,
  isRegistrableDomainHost,
  normalizeCompetitiveCitations,
  parseCompetitiveResponse,
} from '../lib/geo-eeat/competitive-response'

describe('buildCompetitiveSystemPrompt (honesty)', () => {
  it('does not embed target or competitor domains and asks for varied options', () => {
    const prompt = buildCompetitiveSystemPrompt()
    expect(prompt).not.toMatch(/moebel-martin|known domains|use that domain/i)
    expect(prompt).toMatch(/genuinely mention/i)
    expect(prompt).toMatch(/Empty citations are fine|empty citations are fine/i)
    expect(prompt).toMatch(/multiple distinct options|3–5/)
    expect(prompt).toMatch(/not by fame/i)
  })

  it('still defines the JSON answer + citations contract', () => {
    const prompt = buildCompetitiveSystemPrompt()
    expect(prompt).toContain('"answer"')
    expect(prompt).toContain('"citations"')
  })
})

describe('registrable domain + label-aware host match', () => {
  it('rejects bare brand names', () => {
    expect(isRegistrableDomainHost('möbel martin')).toBe(false)
    expect(isRegistrableDomainHost('moebel-martin')).toBe(false)
    expect(isRegistrableDomainHost('moebel-martin.de')).toBe(true)
  })

  it('does not treat moebel-martin.de as a hit for martin.de (suffix trap)', () => {
    expect(citationMatchesTargetHost('martin.de', 'moebel-martin.de')).toBe(false)
    expect(hostEqualsOrSubdomain('moebel-martin.de', 'martin.de')).toBe(false)
  })

  it('matches exact host and real subdomains', () => {
    expect(citationMatchesTargetHost('moebel-martin.de', 'moebel-martin.de')).toBe(true)
    expect(citationMatchesTargetHost('www.moebel-martin.de', 'moebel-martin.de')).toBe(true)
    expect(citationMatchesTargetHost('shop.moebel-martin.de', 'moebel-martin.de')).toBe(true)
    expect(citationMatchesTargetHost('ikea.com', 'moebel-martin.de')).toBe(false)
  })

  it('drops bare brand citations and renumbers positions', () => {
    const citations = normalizeCompetitiveCitations([
      { domain: 'Möbel Martin', position: 1 },
      { domain: 'ikea.com', position: 2 },
      { domain: 'moebel-martin.de', position: 3 },
    ])
    expect(citations).toEqual([
      { domain: 'ikea.com', position: 1 },
      { domain: 'moebel-martin.de', position: 2 },
    ])
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
