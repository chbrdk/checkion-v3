/** Shared GEO job title rules — safe for client + server. */

export const GEO_JOB_TITLE_MAX = 120

export function normalizeGeoJobTitle(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const title = raw.replace(/\s+/g, ' ').trim()
  if (!title || title.length > GEO_JOB_TITLE_MAX) return null
  return title
}
