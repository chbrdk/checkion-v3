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
])

/** True for bare junk tokens that must never surface as keyword chips. */
export function isJunkKeywordToken(raw: string | null | undefined): boolean {
  const t = (raw ?? '').trim().toLowerCase()
  if (!t) return true
  if (JUNK_TOKENS.has(t)) return true
  if (/^www(\.|$)/.test(t)) return true
  if (/^https?:\/\//.test(t)) return true
  return false
}
