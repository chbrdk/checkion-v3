/**
 * GEO measurement layer helpers — specs/domain/geo-measurement-layers.md
 */

import {
  GEO_MEASUREMENT_DEFAULT,
  GEO_MEASUREMENT_ORDER,
  encodeGeoMeasurements,
  parseGeoMeasurement,
  parseGeoMeasurements,
  parseGeoMeasurementsOrDefault,
  toggleGeoMeasurement,
  type GeoJobSummary,
  type GeoMeasurement,
} from '@checkion-v3/contracts'

export {
  GEO_MEASUREMENT_DEFAULT,
  GEO_MEASUREMENT_ORDER,
  encodeGeoMeasurements,
  parseGeoMeasurement,
  parseGeoMeasurements,
  parseGeoMeasurementsOrDefault,
  toggleGeoMeasurement,
}
export type { GeoMeasurement }

export function geoJobMeasurement(
  job: Pick<GeoJobSummary, 'measurement'> | { measurement?: unknown },
): GeoMeasurement {
  return parseGeoMeasurement(job.measurement)
}

export function geoMeasurementLabel(measurement: GeoMeasurement): string {
  return measurement === 'live' ? 'Live search' : 'Model memory'
}

export function geoMeasurementLayerKicker(measurement: GeoMeasurement): string {
  return measurement === 'live' ? 'Layer 2' : 'Layer 1'
}

export function geoMeasurementMagazineLabel(measurement: GeoMeasurement): string {
  return `${geoMeasurementLayerKicker(measurement)} · ${geoMeasurementLabel(measurement)}`
}

export function geoMeasurementLede(
  measurement: GeoMeasurement,
  host: string,
  phase: 'queued' | 'running' | 'completed',
  counts?: { queries: number; models: number },
): string {
  const target = host || 'target'
  if (measurement === 'live') {
    if (phase === 'queued') return `Live-search GEO queued for ${target}.`
    if (phase === 'running') return `Live-search GEO running for ${target} — web-grounded citations.`
    const q = counts?.queries ?? 0
    const m = counts?.models ?? 0
    return `Live-search GEO for ${target} across ${q} queries × ${m} models — citations from web search, not model memory.`
  }
  if (phase === 'queued') return `GEO job queued for ${target}.`
  if (phase === 'running') return `Running live GEO for ${target}…`
  const q = counts?.queries ?? 0
  const m = counts?.models ?? 0
  return `Live GEO run for ${target} across ${q} queries × ${m} models.`
}
