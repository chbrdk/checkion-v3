/**
 * Normalize a user/project host into a DataForSEO Backlinks / Labs `target`.
 * Domains must be bare hosts without scheme, www, path, port, or query —
 * otherwise the vendor returns `Invalid Field: 'target'` (40501).
 */
export function normalizeDataForSeoTarget(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw Object.assign(new Error('domain is required'), { code: 'invalid_domain' })
  }

  let host: string
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    host = new URL(withProto).hostname
  } catch {
    host =
      trimmed
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        ?.split('?')[0]
        ?.split('#')[0] ?? ''
  }

  host = host
    .toLowerCase()
    .replace(/\.$/, '')
    .replace(/^www\./, '')
    .split(':')[0]
    ?.trim() ?? ''

  if (!host || !host.includes('.') || /\s/.test(host)) {
    throw Object.assign(
      new Error(
        `Invalid domain for SEO lookup — use a bare host like example.com (got "${trimmed}")`,
      ),
      { code: 'invalid_domain' },
    )
  }

  return host
}
