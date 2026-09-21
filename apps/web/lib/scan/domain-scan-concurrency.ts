/**
 * Domain spider parallelism — pages share one Chromium (`sharedBrowser`).
 * Default **1** so Next.js UI stays responsive on the same host as Puppeteer.
 * Raise via `DOMAIN_SCAN_CONCURRENCY` only when the container has spare CPU/RAM.
 */

export function resolveDomainScanConcurrency(
  raw: string | undefined = typeof process !== 'undefined'
    ? process.env.DOMAIN_SCAN_CONCURRENCY
    : undefined,
): number {
  const n = parseInt(raw || '1', 10)
  if (!Number.isFinite(n)) return 1
  return Math.min(12, Math.max(1, n))
}

export function resolveDomainScanDelayMs(
  raw: string | undefined = typeof process !== 'undefined'
    ? process.env.DOMAIN_SCAN_DELAY_MS
    : undefined,
): number {
  const n = parseInt(raw || '500', 10)
  if (!Number.isFinite(n) || n < 0) return 500
  return n
}
