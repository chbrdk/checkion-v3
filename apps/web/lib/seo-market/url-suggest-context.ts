/**
 * Lightweight homepage context for Market smart suggestions.
 * Used when Collection Knowledge is thin — Qwen infers vertical from live site chrome.
 */

export type UrlSuggestContext = {
  url: string
  title: string | null
  description: string | null
  h1: string | null
}

function decodeEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function metaContent(html: string, names: string[]): string | null {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`,
      'i',
    )
    const m = html.match(re)
    const v = decodeEntities(m?.[1] || m?.[2] || '')
    if (v) return v.slice(0, 280)
  }
  return null
}

function extractTitle(html: string): string | null {
  const og = metaContent(html, ['og:title', 'twitter:title'])
  if (og) return og
  const m = html.match(/<title[^>]*>([^<]{2,200})<\/title>/i)
  return m?.[1] ? decodeEntities(m[1]).slice(0, 200) : null
}

function extractH1(html: string): string | null {
  const m = html.match(/<h1[^>]*>([\s\S]{2,240}?)<\/h1>/i)
  if (!m?.[1]) return null
  const text = decodeEntities(m[1].replace(/<[^>]+>/g, ' '))
  return text ? text.slice(0, 200) : null
}

export function parseHtmlSuggestContext(html: string, url: string): UrlSuggestContext {
  return {
    url,
    title: extractTitle(html),
    description: metaContent(html, ['description', 'og:description', 'twitter:description']),
    h1: extractH1(html),
  }
}

export function canonicalSuggestUrl(domain: string): string {
  const host = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '')
    .split('/')[0]
  return `https://${host}/`
}

/**
 * Best-effort GET of the project homepage. Fail soft (null) on timeout/network/HTML issues.
 */
export async function fetchUrlSuggestContext(
  domain: string,
): Promise<UrlSuggestContext | null> {
  const url = canonicalSuggestUrl(domain)
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'CHECKION-SEO-Suggest/1.0 (+https://checkion.msqdx)',
      },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return null
    const ctype = (res.headers.get('content-type') || '').toLowerCase()
    if (ctype && !ctype.includes('html') && !ctype.includes('text/plain')) return null
    const html = await res.text()
    if (!html || html.length < 40) return null
    const ctx = parseHtmlSuggestContext(html.slice(0, 250_000), url)
    if (!ctx.title && !ctx.description && !ctx.h1) return null
    return ctx
  } catch {
    return null
  }
}

export function urlContextHasSignal(ctx: UrlSuggestContext | null | undefined): boolean {
  return Boolean(ctx?.title || ctx?.description || ctx?.h1)
}
