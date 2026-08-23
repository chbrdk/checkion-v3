/**
 * Resolve search market for Layer 2 GEO from target URL TLD.
 * Spec: specs/domain/geo-measurement-layers.md § Layer 2 v1.1
 */

export type GeoSearchMarket = {
  /** ISO 3166-1 alpha-2 country code */
  country: string
  /** IANA timezone when known for the market */
  timezone?: string
}

const TLD_COUNTRY: Record<string, GeoSearchMarket> = {
  de: { country: 'DE', timezone: 'Europe/Berlin' },
  at: { country: 'AT', timezone: 'Europe/Vienna' },
  ch: { country: 'CH', timezone: 'Europe/Zurich' },
  fr: { country: 'FR', timezone: 'Europe/Paris' },
  it: { country: 'IT', timezone: 'Europe/Rome' },
  es: { country: 'ES', timezone: 'Europe/Madrid' },
  nl: { country: 'NL', timezone: 'Europe/Amsterdam' },
  be: { country: 'BE', timezone: 'Europe/Brussels' },
  uk: { country: 'GB', timezone: 'Europe/London' },
  co: { country: 'US', timezone: 'America/New_York' },
}

const DEFAULT_MARKET: GeoSearchMarket = { country: 'DE', timezone: 'Europe/Berlin' }

function hostnameFromUrl(input: string): string {
  const s = input.trim().toLowerCase()
  if (!s) return ''
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return s.replace(/^www\./, '').split(/[/?#]/)[0] ?? ''
  }
}

/** Last registrable label before TLD — `shop.example.co.uk` → `co`, `brand.de` → `de`. */
function countryTldFromHost(host: string): string | null {
  const labels = host.split('.').filter(Boolean)
  if (labels.length < 2) return null
  const last = labels[labels.length - 1]!
  if (last.length === 2 && /^[a-z]{2}$/.test(last) && last !== 'co') {
    return last
  }
  if (labels.length >= 3 && labels[labels.length - 2] === 'co' && last === 'uk') {
    return 'uk'
  }
  return null
}

/** Derive search market from target URL or hostname. */
export function resolveSearchMarket(targetUrl: string): GeoSearchMarket {
  const host = hostnameFromUrl(targetUrl)
  const ccTld = countryTldFromHost(host)
  if (ccTld && TLD_COUNTRY[ccTld]) {
    return TLD_COUNTRY[ccTld]!
  }
  return DEFAULT_MARKET
}

/** Provider `user_location` object for OpenAI / Anthropic web search tools. */
export function searchUserLocation(market: GeoSearchMarket): {
  type: 'approximate'
  country: string
  timezone?: string
} {
  return {
    type: 'approximate',
    country: market.country,
    ...(market.timezone ? { timezone: market.timezone } : {}),
  }
}
