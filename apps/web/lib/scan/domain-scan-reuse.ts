import { v4 as uuidv4 } from 'uuid'
import type { ScanResult } from '@/lib/scan/types'

/** Drop heavy blobs before caching / cloning into a new domain run. */
export function slimScanResultForCache(source: ScanResult): ScanResult {
  const {
    screenshot: _screenshot,
    saliencyHeatmap: _saliency,
    passes: _passes,
    ...rest
  } = source as ScanResult & {
    screenshot?: unknown
    saliencyHeatmap?: unknown
    passes?: unknown
  }
  return rest as ScanResult
}

/** Clone a prior page scan for a new domain run (new id, groupId, request URL, timestamp). */
export function cloneScanResultForReuse(
  source: ScanResult,
  domainScanId: string,
  requestUrl: string,
): ScanResult {
  return {
    ...slimScanResultForCache(source),
    id: uuidv4(),
    groupId: domainScanId,
    url: requestUrl,
    timestamp: new Date().toISOString(),
    reusedUnchanged: true,
  }
}

/**
 * Resolves skipUnchangedPages: explicit false wins; otherwise default true.
 * Safe when no prior cache exists — HEAD reuse simply does not trigger.
 */
export function resolveSkipUnchangedPages(value: unknown): boolean {
  if (value === false || value === 'false' || value === 0 || value === '0') return false
  return true
}
