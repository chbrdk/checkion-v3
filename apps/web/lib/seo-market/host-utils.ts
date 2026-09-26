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

/**
 * Search-facing brand label (vaillant-group.com → "vaillant").
 * Prefer the first hyphen segment when it looks like a product brand.
 */
export function displayBrandFromHost(raw: string | null | undefined): string {
  const full = brandSeedFromHost(raw)
  if (full === 'brand') return full
  const head = full.split(/[-_]/)[0]?.trim() ?? full
  return head.length >= 3 ? head : full
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

const HOST_OR_URL_RE =
  /(?:https?:\/\/)|(?:\bwww\b)|(?:\b[a-z0-9-]+(?:\s+[a-z0-9-]+)*\.(?:com|net|org|io|co|uk|de|info|app|ai)\b)/i

/** Street / postal addresses must never become track keywords. */
const ADDRESS_RE =
  /\b(straße|strasse|str\.|weg|platz|allee|gasse|ring|ufer|damm)\b|\b\d{4,5}\s+[a-zäöüß]|\b\d{1,4}[a-z]?\s+(straße|strasse|str\.|weg|platz)/i

/** Empty brand+suffix templates ("vaillant vergleich") — not worth tracking alone. */
const WEAK_BRAND_SUFFIX_RE =
  /^(vergleich|alternative|erfahrung|kosten|test|preis|review|pricing|best|vs|kaufen|buy)$/i

/**
 * True for tokens that must never surface as Market suggestion chips
 * (www / URLs / TLDs / search-engine hosts / addresses / bare junk).
 */
export function isJunkKeywordToken(raw: string | null | undefined): boolean {
  const t = (raw ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
  if (!t) return true
  if (t.length < 2) return true
  if (JUNK_TOKENS.has(t)) return true
  if (/\bwww\b/.test(t)) return true
  if (/\bhttps?\b/.test(t)) return true
  if (HOST_OR_URL_RE.test(t)) return true
  if (SEARCH_ENGINE_RE.test(t)) return true
  if (ADDRESS_RE.test(t)) return true
  if (/^[a-z0-9-]{1,3}$/.test(t) && !/^(seo|b2b|crm|erp|kpi)$/.test(t)) return true
  return false
}

/** True when a string looks like a real searchable query (not a host/URL/address). */
export function looksLikeSearchQuery(raw: string | null | undefined): boolean {
  const t = (raw ?? '').trim()
  if (!t || isJunkKeywordToken(t)) return false
  if (!/[a-zäöüß]/i.test(t)) return false
  return true
}

/**
 * Stricter gate for Rank / Field chips: reject brand-only mashups and weak templates.
 */
export function isTrackWorthyKeyword(
  raw: string | null | undefined,
  domain: string,
): boolean {
  if (!looksLikeSearchQuery(raw)) return false
  const t = (raw ?? '').trim().replace(/\s+/g, ' ')
  const lower = t.toLowerCase()
  const brandFull = brandSeedFromHost(domain).toLowerCase()
  const brandShort = displayBrandFromHost(domain).toLowerCase()
  const brandBits = new Set(
    [brandFull, brandShort, domain.replace(/^www\./i, '').split('.')[0] ?? '']
      .flatMap((s) => [s, ...s.split(/[-_]/g)])
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 1),
  )

  const tokens = lower.split(/\s+/).filter(Boolean)
  if (!tokens.length) return false

  // All tokens are brand fragments → "vaillant-group vaillant"
  if (tokens.every((tok) => brandBits.has(tok))) return false

  // Exactly brand + weak suffix → "vaillant vergleich"
  if (tokens.length === 2) {
    const [a, b] = tokens
    const aBrand = brandBits.has(a!)
    const bBrand = brandBits.has(b!)
    if (aBrand && WEAK_BRAND_SUFFIX_RE.test(b!)) return false
    if (bBrand && WEAK_BRAND_SUFFIX_RE.test(a!)) return false
  }

  return true
}
