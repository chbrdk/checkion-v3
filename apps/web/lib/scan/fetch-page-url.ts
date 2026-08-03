/**
 * SSRF-safe URL check for thin fetch-page (http/https, block private hosts).
 */

import { isIP } from 'node:net'

export function hostBlockedForFetchPage(host: string): boolean {
  const h = (host || '').trim().toLowerCase()
  if (!h) return true
  if (h === 'localhost' || h.endsWith('.localhost')) return true
  if (h === 'metadata.google.internal' || h === 'metadata' || h === '169.254.169.254') {
    return true
  }
  if (isIP(h)) return isPrivateOrReservedIp(h)
  return false
}

function isPrivateOrReservedIp(ip: string): boolean {
  if (ip.includes('.')) {
    const parts = ip.split('.').map((p) => Number(p))
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true
    const [a, b] = parts as [number, number, number, number]
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true
    if (a >= 224) return true
    return false
  }
  const lower = ip.toLowerCase()
  if (lower === '::1' || lower === '::') return true
  if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) return true
  return false
}

/** Validate public http(s) URL for fetch-page. */
export function normalizeFetchPageUrl(
  raw: string,
): { url: string } | { error: string } {
  const s = (raw || '').trim()
  if (!s) return { error: 'url is required' }
  let parsed: URL
  try {
    parsed = new URL(s)
  } catch {
    return { error: 'Invalid URL' }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { error: 'Only http and https URLs are allowed' }
  }
  if (!parsed.hostname || hostBlockedForFetchPage(parsed.hostname)) {
    return { error: 'URL host is not allowed' }
  }
  if (parsed.username || parsed.password) {
    return { error: 'URLs with credentials are not allowed' }
  }
  return { url: s }
}
