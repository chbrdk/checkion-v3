/** Shared run-title rules for GEO / WCAG / Domain — safe for client + server. */

export const JOB_TITLE_MAX = 120

/** @deprecated Prefer JOB_TITLE_MAX */
export const GEO_JOB_TITLE_MAX = JOB_TITLE_MAX

export function normalizeJobTitle(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const title = raw.replace(/\s+/g, ' ').trim()
  if (!title || title.length > JOB_TITLE_MAX) return null
  return title
}

/** @deprecated Prefer normalizeJobTitle */
export function normalizeGeoJobTitle(raw: unknown): string | null {
  return normalizeJobTitle(raw)
}
