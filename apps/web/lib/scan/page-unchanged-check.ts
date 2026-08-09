import { getScanFetchHeaders } from '@/lib/scan/scan-browser-profile'

export type PageUnchangedStatus = 'unchanged' | 'unknown' | 'changed'

const HEAD_TIMEOUT_MS = 10_000

/**
 * Compare current response headers to a prior scan's stored hints.
 * Returns `unknown` on network errors, missing headers, or inconclusive cases (safe default: full scan).
 */
export async function checkPageUnchangedByHeaders(
  url: string,
  previous: { etag?: string; lastModified?: string },
): Promise<PageUnchangedStatus> {
  const prevEtag = previous.etag?.trim()
  const prevLm = previous.lastModified?.trim()
  if (!prevEtag && !prevLm) return 'unknown'

  let res: Response
  try {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), HEAD_TIMEOUT_MS)
    res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: ac.signal,
      headers: getScanFetchHeaders(),
    })
    clearTimeout(t)
  } catch {
    return 'unknown'
  }

  if (!res.ok) {
    return 'unknown'
  }

  const etag = res.headers.get('etag')?.trim() ?? undefined
  const lm = res.headers.get('last-modified')?.trim() ?? undefined

  if (prevEtag) {
    if (etag && etag === prevEtag) return 'unchanged'
    if (etag && etag !== prevEtag) return 'changed'
  }
  if (prevLm) {
    if (lm && lm === prevLm) return 'unchanged'
    if (lm && lm !== prevLm) return 'changed'
  }

  return 'unknown'
}
