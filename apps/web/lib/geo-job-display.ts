import type { GeoJobStatus, GeoOverview } from '@checkion-v3/contracts'

/** Live create returns queued/running shells before finalize writes queryRuns. */
export function isGeoJobInProgress(status: GeoJobStatus): boolean {
  return status === 'queued' || status === 'running'
}

/**
 * Completed-looking magazine with no queryRuns is a failure (silent empty pipeline),
 * not a legitimate “invisible brand” result.
 */
export function isGeoOverviewEmptySuccess(overview: GeoOverview): boolean {
  return overview.job.status === 'completed' && overview.queryRuns.length === 0
}

export function isGeoOverviewFailed(overview: GeoOverview): boolean {
  return overview.job.status === 'failed' || isGeoOverviewEmptySuccess(overview)
}

export function geoOverviewReadyForMagazine(overview: GeoOverview): boolean {
  return !isGeoJobInProgress(overview.job.status) && !isGeoOverviewFailed(overview)
}
