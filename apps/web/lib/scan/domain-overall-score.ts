/**
 * Deep-scan overall score — unweighted mean of page overalls.
 * @see specs/domain/scoring.md
 */

export type PageOverallScoreSource = {
  score?: number | null
  ux?: { score?: number | null } | null
}

/** Page overall used in domain aggregation (ux.score preferred). */
export function pageOverallScore(page: PageOverallScoreSource): number {
  const ux = page.ux?.score
  if (typeof ux === 'number' && Number.isFinite(ux)) return ux
  const raw = page.score
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  return 0
}

/**
 * Corpus overall: simple arithmetic mean of page overalls, rounded 0–100.
 * Depth / home weighting is intentionally not applied (parity with kind means).
 */
export function meanDomainOverallScore(
  pages: PageOverallScoreSource[],
  fallback = 0,
): number {
  if (!pages.length) return Math.round(fallback)
  const sum = pages.reduce((acc, p) => acc + pageOverallScore(p), 0)
  return Math.round(sum / pages.length)
}
