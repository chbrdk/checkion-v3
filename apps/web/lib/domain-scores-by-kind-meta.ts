import type { DomainScanLight, ScoreKind } from '@checkion-v3/contracts'

/** Short labels for hub / list meta (GEO-style compact strip). */
export const SCORE_KIND_SHORT: Partial<Record<ScoreKind, string>> = {
  accessibility: 'a11y',
  seo: 'seo',
  performance: 'perf',
  best_practices: 'bp',
  ux: 'ux',
  eco: 'eco',
  generative: 'geo',
}

const META_KIND_ORDER: ScoreKind[] = [
  'accessibility',
  'generative',
  'seo',
  'performance',
  'ux',
  'eco',
  'best_practices',
]

/**
 * Compact kind means for project hub deep list meta, e.g. `a11y 72 · geo 61`.
 * Prefers weakest kinds first (same spirit as magazine snapshot).
 */
export function formatDomainScoresByKindMeta(
  scoresByKind: DomainScanLight['scoresByKind'],
  maxKinds = 3,
): string {
  if (!scoresByKind) return ''
  const entries = META_KIND_ORDER.filter((k) => typeof scoresByKind[k] === 'number').map((k) => ({
    kind: k,
    value: scoresByKind[k] as number,
  }))
  if (!entries.length) return ''
  const sorted = [...entries].sort((a, b) => a.value - b.value).slice(0, maxKinds)
  return sorted
    .map((e) => `${SCORE_KIND_SHORT[e.kind] ?? e.kind} ${e.value}`)
    .join(' · ')
}
