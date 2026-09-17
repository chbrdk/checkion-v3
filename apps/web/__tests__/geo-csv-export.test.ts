import { describe, expect, it } from 'vitest'
import type { GeoOverview } from '@checkion-v3/contracts'
import { finalizeGeoOverview } from '../lib/geo-eeat/finalize-overview'
import {
  buildGeoCsv,
  buildGeoCsvRows,
  escapeCsvField,
  flattenCsvText,
  geoCsvFilename,
  GEO_CSV_COLUMNS,
  GEO_CSV_DELIMITER,
  sanitizeCsvCell,
} from '../lib/geo-csv-export'

function sampleOverview(overrides?: {
  queryRuns?: GeoOverview['queryRuns']
  eeat?: GeoOverview['eeat']
}): GeoOverview {
  return finalizeGeoOverview({
    job: {
      id: 'geo-csv-1',
      title: 'CSV fixture',
      projectId: 'proj-1',
      url: 'https://www.example.com',
      status: 'completed',
      overallScore: 42,
      completedAt: '2026-09-17T10:00:00.000Z',
      queryCount: 1,
      modelCount: 1,
      citedShare: 100,
      measurement: 'recall',
    },
    lede: 'Lede with, comma and "quotes".',
    targetHost: 'example.com',
    models: ['gpt-5.4-nano'],
    queries: ['Best paint systems'],
    competitors: ['abb.com'],
    positionMatrix: [],
    eeat: overrides?.eeat,
    queryRuns: overrides?.queryRuns ?? [
      {
        queryId: 'q-1',
        query: 'Best paint systems',
        modelId: 'gpt-5.4-nano',
        answerText: 'Example leads; ABB is second.\nLine two.',
        ourPosition: 1,
        citations: [
          { domain: 'example.com', position: 1, context: 'lead', url: 'https://www.example.com/a' },
          { domain: 'abb.com', position: 2 },
        ],
        searchQueries: ['paint systems OEM'],
      },
    ],
  })
}

describe('geo-csv-export', () => {
  it('sanitizes formula-like cells and escapes semicolon fields', () => {
    expect(sanitizeCsvCell('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(escapeCsvField('a;b')).toBe('"a;b"')
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""')
    expect(flattenCsvText('line\nbreak')).toBe('line break')
    expect(escapeCsvField('line\nbreak')).toBe('line break')
  })

  it('builds one analysis-first row per queryRun', () => {
    const overview = sampleOverview()
    const rows = buildGeoCsvRows(overview)
    expect(rows).toHaveLength(1)
    const row = rows[0]!
    expect(row.query_index).toBe(1)
    expect(row.query).toBe('Best paint systems')
    expect(row.model_id).toBe('gpt-5.4-nano')
    expect(row.hit).toBe('yes')
    expect(row.answer_text).toContain('Example leads')
    expect(row.citations).toBe('example.com@1 | abb.com@2')
    expect(row.citation_urls).toBe('https://www.example.com/a')
    expect(row.search_queries).toBe('paint systems OEM')
    expect(row.our_position).toBe(1)
    expect(row.co_cited).toBe('yes')
    expect(row.job_id).toBe('geo-csv-1')
    expect(row.measurement).toBe('recall')
    expect(GEO_CSV_COLUMNS[0]).toBe('query_index')
    expect(GEO_CSV_COLUMNS.indexOf('answer_text')).toBeLessThan(GEO_CSV_COLUMNS.indexOf('job_id'))
  })

  it('includes EEAT score columns when present', () => {
    const rows = buildGeoCsvRows(
      sampleOverview({
        eeat: {
          experience: 10,
          expertise: 20,
          authoritativeness: 30,
          trustworthiness: 40,
          geoFitness: 50,
          missingElements: ['FAQs', 'llms.txt'],
        },
      }),
    )
    expect(rows[0]!.eeat_geo_fitness).toBe(50)
  })

  it('emits Excel sep hint + header-only when queryRuns are empty', () => {
    const csv = buildGeoCsv(sampleOverview({ queryRuns: [] }))
    expect(csv.startsWith('\uFEFF')).toBe(true)
    const lines = csv.replace(/^\uFEFF/, '').trimEnd().split('\r\n')
    expect(lines[0]).toBe('sep=;')
    expect(lines[1]).toBe(GEO_CSV_COLUMNS.join(GEO_CSV_DELIMITER))
    expect(lines).toHaveLength(2)
  })

  it('keeps one physical row per answer even with multiline text', () => {
    const csv = buildGeoCsv(sampleOverview())
    const lines = csv.replace(/^\uFEFF/, '').trimEnd().split('\r\n')
    // sep + header + 1 data row
    expect(lines).toHaveLength(3)
    expect(lines[2]).toContain('Example leads; ABB is second. Line two.')
    expect(lines[2]?.includes('\n')).toBe(false)
  })

  it('sorts rows by query then model', () => {
    const overview = sampleOverview({
      queryRuns: [
        {
          queryId: 'q-2',
          query: 'Best paint systems',
          modelId: 'z-model',
          answerText: 'z',
          ourPosition: null,
          citations: [],
        },
        {
          queryId: 'q-1',
          query: 'Best paint systems',
          modelId: 'a-model',
          answerText: 'a',
          ourPosition: 1,
          citations: [{ domain: 'example.com', position: 1 }],
        },
      ],
    })
    const rows = buildGeoCsvRows(overview)
    expect(rows.map((r) => r.model_id)).toEqual(['a-model', 'z-model'])
  })

  it('builds a safe download filename', () => {
    expect(geoCsvFilename('geo-1')).toBe('checkion-geo-geo-1.csv')
    expect(geoCsvFilename('../evil/id')).toBe('checkion-geo-evil-id.csv')
  })
})
