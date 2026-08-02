import type { ScanCorrelationInput, ScanSummary } from '@checkion-v3/contracts'

/** Attach optional AUDION correlation fields onto a scan summary. */
export function withScanCorrelation(
  scan: ScanSummary,
  correlation?: ScanCorrelationInput | null,
): ScanSummary {
  if (!correlation) return scan
  const platformProjectId = correlation.platformProjectId?.trim() || undefined
  const audionRunId = correlation.audionRunId?.trim() || undefined
  const stepUrl = correlation.stepUrl?.trim() || undefined
  if (!platformProjectId && !audionRunId && !stepUrl) return scan
  return {
    ...scan,
    ...(platformProjectId ? { platformProjectId } : {}),
    ...(audionRunId ? { audionRunId } : {}),
    ...(stepUrl ? { stepUrl } : {}),
  }
}

export function hasAudionCorrelation(scan: Pick<ScanSummary, 'audionRunId' | 'platformProjectId' | 'stepUrl'>): boolean {
  return Boolean(scan.audionRunId || scan.stepUrl || scan.platformProjectId)
}

export function parseScanCorrelation(body: {
  platformProjectId?: unknown
  audionRunId?: unknown
  stepUrl?: unknown
}): ScanCorrelationInput | undefined {
  const platformProjectId =
    typeof body.platformProjectId === 'string' ? body.platformProjectId.trim() : ''
  const audionRunId = typeof body.audionRunId === 'string' ? body.audionRunId.trim() : ''
  const stepUrl = typeof body.stepUrl === 'string' ? body.stepUrl.trim() : ''
  if (!platformProjectId && !audionRunId && !stepUrl) return undefined
  return {
    ...(platformProjectId ? { platformProjectId } : {}),
    ...(audionRunId ? { audionRunId } : {}),
    ...(stepUrl ? { stepUrl } : {}),
  }
}
