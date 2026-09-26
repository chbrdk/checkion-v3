/**
 * Derive a Research seed / brand token from a Collection host.
 * Never return bare `www` (or other junk labels) from hosts like www.vaillant-group.com.
 */
export function brandSeedFromHost(raw: string | null | undefined): string {
  if (!raw?.trim()) return 'brand'
  let host = raw.trim().toLowerCase()
  host = host.replace(/^https?:\/\//, '')
  host = host.split('/')[0] ?? host
  host = host.split(':')[0] ?? host
  host = host.replace(/\.$/, '')
  host = host.replace(/^www\./, '')
  // Drop common language / mobile subdomains when followed by more parts
  const parts = host.split('.').filter(Boolean)
  while (parts.length > 2 && (parts[0] === 'www' || parts[0] === 'm' || parts[0]!.length <= 2)) {
    parts.shift()
  }
  if (parts[0] === 'www' && parts.length > 1) parts.shift()
  const label = parts[0]?.trim() || ''
  if (!label || isJunkKeywordToken(label)) {
    return parts[1]?.trim() && !isJunkKeywordToken(parts[1]!) ? parts[1]! : 'brand'
  }
  return label
}

const JUNK_TOKENS = new Set([
  'www',
  'http',
  'https',
  'com',
  'net',
  'org',
  'de',
  'io',
  'co',
  'uk',
  'brand',
  'google',
  'yahoo',
  'bing',
  'duckduckgo',
  'facebook',
  'instagram',
  'youtube',
  'twitter',
  'linkedin',
])

const SEARCH_ENGINE_RE =
  /\b(google|yahoo|bing|duckduckgo|baidu|yandex|ecosia)\b/i

/** Hostname / URL shaped strings — never trackable SEO keywords. */
const HOST_OR_URL_RE =
  /(?:https?:\/\/)|(?:\bwww\b)|(?:\b[a-z0-9-]+(?:\s+[a-z0-9-]+)*\.(?:com|net|org|io|co|uk|de|info|app|ai)\b)/i

/**
 * True for tokens that must never surface as Market suggestion chips
 * (www / URLs / TLDs / search-engine hosts / bare junk).
 */
export function isJunkKeywordToken(raw: string | null | undefined): boolean {
  const t = (raw ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
  if (!t) return true
  if (t.length < 2) return true
  if (JUNK_TOKENS.has(t)) return true
  // Any www fragment (www.google.com, "www goo", "http www.google.com")
  if (/\bwww\b/.test(t)) return true
  if (/\bhttps?\b/.test(t)) return true
  if (HOST_OR_URL_RE.test(t)) return true
  if (SEARCH_ENGINE_RE.test(t)) return true
  // Truncated junk like "www.go" / "goo" alone already covered; also drop pure TLD-y crumbs
  if (/^[a-z0-9-]{1,3}$/.test(t) && !/^(seo|b2b|crm|erp|kpi)$/.test(t)) return true
  return false
}

/** True when a string looks like a real searchable query (not a host/URL). */
export function looksLikeSearchQuery(raw: string | null | undefined): boolean {
  const t = (raw ?? '').trim()
  if (!t || isJunkKeywordToken(t)) return false
  // Must contain a letter
  if (!/[a-zäöüß]/i.test(t)) return false
  return true
}
