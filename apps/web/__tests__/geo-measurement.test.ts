import { describe, expect, it } from 'vitest'
import { parseGeoMeasurement } from '@checkion-v3/contracts'
import {
  GEO_MEASUREMENT_DEFAULT,
  geoJobMeasurement,
  geoMeasurementLabel,
  geoMeasurementLayerKicker,
  geoMeasurementLede,
} from '../lib/geo/measurement'

describe('GEO measurement helpers', () => {
  it('defaults unknown values to recall', () => {
    expect(parseGeoMeasurement(undefined)).toBe(GEO_MEASUREMENT_DEFAULT)
    expect(parseGeoMeasurement('recall')).toBe('recall')
    expect(parseGeoMeasurement('live')).toBe('live')
    expect(parseGeoMeasurement('chatgpt')).toBe('recall')
    expect(geoJobMeasurement({})).toBe('recall')
    expect(geoJobMeasurement({ measurement: 'live' })).toBe('live')
  })

  it('labels layers without mixing them', () => {
    expect(geoMeasurementLabel('recall')).toBe('Model memory')
    expect(geoMeasurementLabel('live')).toBe('Live search')
    expect(geoMeasurementLayerKicker('recall')).toBe('Layer 1')
    expect(geoMeasurementLayerKicker('live')).toBe('Layer 2')
  })

  it('ledes distinguish live search from model-memory pipeline copy', () => {
    expect(geoMeasurementLede('live', 'example.com', 'completed', { queries: 2, models: 3 })).toMatch(
      /web search/i,
    )
    expect(geoMeasurementLede('recall', 'example.com', 'completed', { queries: 2, models: 3 })).not.toMatch(
      /web search/i,
    )
  })
})
