import { describe, expect, it } from 'vitest'
import {
  citationsFromSourceUrls,
  extractAnthropicGroundedSources,
  extractGeminiGroundedSources,
  extractOpenAiGroundedSources,
} from '../lib/geo-eeat/grounded-citations'

describe('citationsFromSourceUrls', () => {
  it('keeps first-seen registrable hosts and absolute urls', () => {
    const citations = citationsFromSourceUrls([
      { url: 'https://www.ikea.com/de/de/', title: 'IKEA' },
      { url: 'https://ikea.com/kitchen', title: 'dup host' },
      { url: 'https://moebel-martin.de' },
      { url: 'not-a-host' },
    ])
    expect(citations.map((c) => c.domain)).toEqual(['ikea.com', 'moebel-martin.de'])
    expect(citations[0]?.url).toMatch(/^https:\/\//)
    expect(citations[0]?.position).toBe(1)
    expect(citations[1]?.position).toBe(2)
  })
})

describe('extractOpenAiGroundedSources', () => {
  it('reads output_text and url_citation annotations', () => {
    const extracted = extractOpenAiGroundedSources({
      output_text: 'Two retailers to compare.',
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: 'Two retailers to compare.',
              annotations: [
                { type: 'url_citation', url: 'https://ikea.com', title: 'IKEA' },
                { type: 'url_citation', url: 'https://moebel-martin.de' },
              ],
            },
          ],
        },
      ],
    })
    expect(extracted.answerText).toMatch(/Two retailers/)
    expect(extracted.sources.map((s) => s.url)).toEqual([
      'https://ikea.com',
      'https://moebel-martin.de',
    ])
  })
})

describe('extractAnthropicGroundedSources', () => {
  it('reads text blocks and citation urls', () => {
    const extracted = extractAnthropicGroundedSources({
      content: [
        {
          type: 'text',
          text: 'Look at these shops.',
          citations: [{ type: 'web_search_result_location', url: 'https://hornbach.de' }],
        },
      ],
    })
    expect(extracted.answerText).toBe('Look at these shops.')
    expect(extracted.sources[0]?.url).toBe('https://hornbach.de')
  })
})

describe('extractGeminiGroundedSources', () => {
  it('reads parts text and groundingChunks.web.uri', () => {
    const extracted = extractGeminiGroundedSources({
      candidates: [
        {
          content: { parts: [{ text: 'Grounded Gemini answer.' }] },
          groundingMetadata: {
            groundingChunks: [{ web: { uri: 'https://otto.de', title: 'OTTO' } }],
          },
        },
      ],
    })
    expect(extracted.answerText).toBe('Grounded Gemini answer.')
    expect(extracted.sources[0]?.url).toBe('https://otto.de')
  })
})
