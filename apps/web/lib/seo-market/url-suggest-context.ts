/**
 * Lightweight site fetch + HTML parse for Market Suggest Research Agent.
 * Spec: specs/domain/seo-market-suggest-agent.md
 */

export type UrlSuggestContext = {
  url: string
  title: string | null
  description: string | null
  h1: string | null
  bodyExcerpt?: string | null
}

export type SitePageCorpus = UrlSuggestContext & {
  kind: 'home' | 'deep'
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

function extractBodyExcerpt(html: string, maxChars = 4000): string | null {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
  const text = decodeEntities(stripped)
  if (text.length < 40) return null
  return text.slice(0, maxChars)
}

export function parseHtmlSuggestContext(html: string, url: string): UrlSuggestContext {
  return {
    url,
    title: extractTitle(html),
    description: metaContent(html, ['description', 'og:description', 'twitter:description']),
    h1: extractH1(html),
    bodyExcerpt: extractBodyExcerpt(html),
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

export function hostFromDomain(domain: string): string {
  return canonicalSuggestUrl(domain).replace(/^https?:\/\//, '').replace(/\/$/, '')
}

const DEEP_PATH_RE =
  /\/(about|about-us|unternehmen|company|produkte|products|product|solutions?|leistungen|services?|service|wir|marke|brand|technology|technolog|innovation|portfolio|angebot|solutions-overview|blog|wissen|faq|hilfe|support|karriere)(\/|$)/i

/**
 * Same-origin internal links from homepage HTML, ranked for research value.
 */
export function discoverDeepLinks(html: string, domain: string, max = 6): string[] {
  const host = hostFromDomain(domain)
  const base = `https://${host}`
  const seen = new Set<string>()
  const ranked: Array<{ url: string; score: number }> = []
  const re = /href=["']([^"'#]+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    let href = (m[1] || '').trim()
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
      continue
    }
    try {
      const abs = new URL(href, base)
      if (abs.protocol !== 'http:' && abs.protocol !== 'https:') continue
      const h = abs.hostname.replace(/^www\./i, '').toLowerCase()
      if (h !== host && h !== `www.${host}`) continue
      abs.hash = ''
      const path = abs.pathname.replace(/\/$/, '') || '/'
      if (path === '/' || path === '') continue
      if (/\.(pdf|jpg|jpeg|png|gif|svg|zip|css|js)$/i.test(path)) continue
      const url = `${abs.origin}${path}${abs.search}`
      const key = url.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      const score = DEEP_PATH_RE.test(path) ? 10 : path.split('/').filter(Boolean).length <= 2 ? 3 : 1
      ranked.push({ url, score })
    } catch {
      /* skip bad href */
    }
  }
  return ranked
    .sort((a, b) => b.score - a.score || a.url.length - b.url.length)
    .slice(0, max)
    .map((r) => r.url)
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'CHECKION-SEO-Suggest-Agent/1.0 (+https://checkion.msqdx)',
      },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return null
    const ctype = (res.headers.get('content-type') || '').toLowerCase()
    if (ctype && !ctype.includes('html') && !ctype.includes('text/plain')) return null
    const html = await res.text()
    if (!html || html.length < 40) return null
    return html.slice(0, 350_000)
  } catch {
    return null
  }
}

/**
 * Best-effort GET of the project homepage. Fail soft (null) on timeout/network/HTML issues.
 */
export async function fetchUrlSuggestContext(
  domain: string,
): Promise<UrlSuggestContext | null> {
  const url = canonicalSuggestUrl(domain)
  const html = await fetchHtml(url)
  if (!html) return null
  const ctx = parseHtmlSuggestContext(html, url)
  if (!ctx.title && !ctx.description && !ctx.h1 && !ctx.bodyExcerpt) return null
  return ctx
}

/**
 * Homepage + ranked deep pages for the research agent.
 */
export async function gatherSiteCorpus(domain: string): Promise<{
  pages: SitePageCorpus[]
  homeHtml: string | null
}> {
  const homeUrl = canonicalSuggestUrl(domain)
  const homeHtml = await fetchHtml(homeUrl)
  const pages: SitePageCorpus[] = []
  if (homeHtml) {
    const home = parseHtmlSuggestContext(homeHtml, homeUrl)
    pages.push({ ...home, kind: 'home' })
    const deep = discoverDeepLinks(homeHtml, domain, 6)
    for (const url of deep) {
      const html = await fetchHtml(url)
      if (!html) continue
      const ctx = parseHtmlSuggestContext(html, url)
      if (!ctx.title && !ctx.bodyExcerpt && !ctx.description) continue
      pages.push({ ...ctx, kind: 'deep' })
    }
  }
  return { pages, homeHtml }
}

export function urlContextHasSignal(ctx: UrlSuggestContext | null | undefined): boolean {
  return Boolean(ctx?.title || ctx?.description || ctx?.h1 || ctx?.bodyExcerpt)
}
