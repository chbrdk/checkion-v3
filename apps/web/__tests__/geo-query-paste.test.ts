import { describe, expect, it } from 'vitest'
import {
  applyPastedGeoQueries,
  GEO_QUERY_PASTE_MAX,
  parsePastedGeoQueries,
  stripGeoQueryLineMarker,
} from '../lib/geo-query-paste'

describe('geo-query-paste', () => {
  it('strips numbered and bulleted markers', () => {
    expect(stripGeoQueryLineMarker('01 Best alternatives to bosch-ebike')).toBe(
      'Best alternatives to bosch-ebike',
    )
    expect(stripGeoQueryLineMarker('1. Who leads in category?')).toBe('Who leads in category?')
    expect(stripGeoQueryLineMarker('- bosch-ebike vs competitors')).toBe(
      'bosch-ebike vs competitors',
    )
    expect(stripGeoQueryLineMarker('• Enterprise buyers?')).toBe('Enterprise buyers?')
    expect(stripGeoQueryLineMarker('Q2: Heat pump ROI')).toBe('Heat pump ROI')
  })

  it('parses newline lists into prompts', () => {
    const raw = [
      '01 Best alternatives to bosch-ebike',
      '02 Who leads in bosch-ebike category solutions?',
      '03 bosch-ebike vs competitors for enterprise buyers',
      '',
      '  ',
    ].join('\n')
    expect(parsePastedGeoQueries(raw)).toEqual([
      'Best alternatives to bosch-ebike',
      'Who leads in bosch-ebike category solutions?',
      'bosch-ebike vs competitors for enterprise buyers',
    ])
  })

  it('splits a single line with multiple question marks', () => {
    expect(
      parsePastedGeoQueries('Lohnt sich eine Wärmepumpe? Was kostet der Einbau?'),
    ).toEqual(['Lohnt sich eine Wärmepumpe?', 'Was kostet der Einbau?'])
  })

  it('dedupes and caps pasted prompts', () => {
    const lines = Array.from({ length: GEO_QUERY_PASTE_MAX + 5 }, (_, i) => `${i + 1}. Prompt ${i}`)
    lines.push('1. Prompt 0')
    const parsed = parsePastedGeoQueries(lines.join('\n'))
    expect(parsed).toHaveLength(GEO_QUERY_PASTE_MAX)
    expect(parsed[0]).toBe('Prompt 0')
  })

  it('replaces a blank list and merges into a filled list', () => {
    expect(applyPastedGeoQueries(['', '  '], 'A?\nB?')).toEqual({
      next: ['A?', 'B?'],
      added: 2,
      isList: true,
    })
    expect(applyPastedGeoQueries(['Keep me'], 'Keep me\nNew one')).toEqual({
      next: ['Keep me', 'New one'],
      added: 1,
      isList: true,
    })
  })
})
