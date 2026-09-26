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
  // Drop leading www. (and common language/www-style subdomains of length ≤3 when followed by more parts)
  const parts = host.split('.').filter(Boolean)
  while (parts.length > 2 && (parts[0] === 'www' || parts[0] === 'm' || parts[0]!.length <= 2)) {
    parts.shift()
  }
  if (parts[0] === 'www' && parts.length > 1) parts.shift()
  const label = parts[0]?.trim() || ''
  if (!label || label === 'www' || label === 'http' || label === 'https') {
    return parts[1]?.trim() || 'brand'
  }
  return label
}
