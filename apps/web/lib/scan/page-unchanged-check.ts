import { buildContentFingerprint } from '@/lib/scan/content-fingerprint'
import { getScanFetchHeaders } from '@/lib/scan/scan-browser-profile'

export type PageUnchangedStatus = 'unchanged' | 'unknown' | 'changed'

const HEAD_TIMEOUT_MS = 10_000
const HTML_TIMEOUT_MS = 12_000
/** Cap HTML download for fingerprinting (bytes). */
const HTML_MAX_CHARS = 400_000

export type PageCacheHints = {
  etag?: string
  lastModified?: string
  contentFingerprint?: string
}

/** Strip weak-validator prefix for comparison (`W/"abc"` ≡ `"abc"`). */
export function normalizeEtag(value: string | null | undefined): string | null {
  if (!value) return null
  const t = value.trim()
  if (!t) return null
  return t.replace(/^W\//i, '').trim() || null
}

function etagsEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeEtag(a)
  const nb = normalizeEtag(b)
  return Boolean(na && nb && na === nb)
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Best-effort title / h1 / body from raw HTML for fingerprint compare. */
export function fingerprintFromHtml(html: string): string | undefined {
  const slice = html.slice(0, HTML_MAX_CHARS)
  const titleRaw = slice.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''
  const h1Raw = slice.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? ''
  const withoutNoise = slice
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
  const body = stripTags(withoutNoise)
  return buildContentFingerprint({
    title: stripTags(titleRaw),
    h1: stripTags(h1Raw),
    bodyTextExcerpt: body.slice(0, 6000),
  })
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: ac.signal, redirect: 'follow' })
  } finally {
    clearTimeout(t)
  }
}

/**
 * Conditional HEAD (GET fallback) against prior ETag / Last-Modified.
 * Spec: `specs/domain/page-unchanged-reuse.md`
 */
export async function checkPageUnchangedByHeaders(
  url: string,
  previous: { etag?: string; lastModified?: string },
): Promise<PageUnchangedStatus> {
  const prevEtag = previous.etag?.trim()
  const prevLm = previous.lastModified?.trim()
  if (!prevEtag && !prevLm) return 'unknown'

  const headers: Record<string, string> = {
    ...getScanFetchHeaders(),
  }
  if (prevEtag) headers['If-None-Match'] = prevEtag
  if (prevLm) headers['If-Modified-Since'] = prevLm

  const run = async (method: 'HEAD' | 'GET'): Promise<Response | null> => {
    try {
      return await fetchWithTimeout(
        url,
        { method, headers },
        HEAD_TIMEOUT_MS,
      )
    } catch {
      return null
    }
  }

  let res = await run('HEAD')
  if (!res || res.status === 405 || res.status === 501) {
    res = await run('GET')
  }
  if (!res) return 'unknown'

  if (res.status === 304) return 'unchanged'
  if (!res.ok) return 'unknown'

  const etag = res.headers.get('etag') ?? undefined
  const lm = res.headers.get('last-modified') ?? undefined

  if (prevEtag) {
    if (etagsEqual(etag, prevEtag)) return 'unchanged'
    if (etag && normalizeEtag(etag) && !etagsEqual(etag, prevEtag)) return 'changed'
  }
  if (prevLm) {
    if (lm && lm.trim() === prevLm) return 'unchanged'
    if (lm && lm.trim() !== prevLm) return 'changed'
  }

  return 'unknown'
}

/**
 * Cheap HTML GET fingerprint vs stored hash (no Chromium).
 * Spec: `specs/domain/page-unchanged-reuse.md`
 */
export async function checkPageUnchangedByFingerprint(
  url: string,
  previousFingerprint: string,
): Promise<PageUnchangedStatus> {
  const prev = previousFingerprint.trim()
  if (!prev) return 'unknown'

  let res: Response
  try {
    res = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers: getScanFetchHeaders(),
      },
      HTML_TIMEOUT_MS,
    )
  } catch {
    return 'unknown'
  }

  if (!res.ok) return 'unknown'
  const ct = (res.headers.get('content-type') || '').toLowerCase()
  if (ct && !ct.includes('html') && !ct.includes('text/plain') && !ct.includes('xml')) {
    return 'unknown'
  }

  let html: string
  try {
    html = await res.text()
  } catch {
    return 'unknown'
  }
  if (!html.trim()) return 'unknown'

  const next = fingerprintFromHtml(html)
  if (!next) return 'unknown'
  return next === prev ? 'unchanged' : 'changed'
}

/**
 * Full reuse decision: conditional headers first, then content fingerprint.
 */
export async function resolvePageUnchanged(
  url: string,
  previous: PageCacheHints,
): Promise<PageUnchangedStatus> {
  const hasHeaders = Boolean(previous.etag?.trim() || previous.lastModified?.trim())
  if (hasHeaders) {
    const byHeaders = await checkPageUnchangedByHeaders(url, {
      etag: previous.etag,
      lastModified: previous.lastModified,
    })
    if (byHeaders === 'unchanged' || byHeaders === 'changed') return byHeaders
  }

  const fp = previous.contentFingerprint?.trim()
  if (fp) {
    return checkPageUnchangedByFingerprint(url, fp)
  }

  return 'unknown'
}
