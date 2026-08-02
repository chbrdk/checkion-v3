import { scoreTone } from './scan-display'

export type MetricTone = 'pos' | 'low' | 'neg'

/** Timing bands (ms): good / needs-improvement / poor — same thresholds as overview lab tiles. */
export function timingTone(
  ms: number | null | undefined,
  goodMax: number,
  okMax: number,
): MetricTone | undefined {
  if (ms == null || !Number.isFinite(ms)) return undefined
  if (ms <= goodMax) return 'pos'
  if (ms <= okMax) return 'low'
  return 'neg'
}

export function clsTone(cls: number | null | undefined): MetricTone | undefined {
  if (cls == null || !Number.isFinite(cls)) return undefined
  if (cls <= 0.1) return 'pos'
  if (cls <= 0.25) return 'low'
  return 'neg'
}

/** Boolean where `true` is the healthy state (HTTPS, HSTS, skip link, …). */
export function goodWhenTrue(value: boolean | null | undefined): MetricTone | undefined {
  if (value == null) return undefined
  return value ? 'pos' : 'neg'
}

/** Boolean where `true` is the unhealthy state (mixed content, skinny, …). */
export function badWhenTrue(value: boolean | null | undefined): MetricTone | undefined {
  if (value == null) return undefined
  return value ? 'neg' : 'pos'
}

/** Counts where zero is healthy (broken links, missing SRI, tap targets, …). */
export function countTone(
  count: number | null | undefined,
  warnAt = 1,
  badAt = 5,
): MetricTone | undefined {
  if (count == null || !Number.isFinite(count)) return undefined
  if (count < warnAt) return 'pos'
  if (count < badAt) return 'low'
  return 'neg'
}

export function issueStatsTone(
  errors: number | null | undefined,
  warnings: number | null | undefined,
): MetricTone | undefined {
  if (errors == null && warnings == null) return undefined
  if ((errors ?? 0) > 0) return 'neg'
  if ((warnings ?? 0) > 0) return 'low'
  return 'pos'
}

export function ecoGradeTone(grade: string | null | undefined): MetricTone | undefined {
  if (!grade) return undefined
  const g = grade.toUpperCase()
  if (g === 'A+' || g === 'A') return 'pos'
  if (g === 'B') return 'low'
  return 'neg'
}

/** Page weight (KB): rough magazine bands. */
export function pageWeightTone(kb: number | null | undefined): MetricTone | undefined {
  if (kb == null || !Number.isFinite(kb)) return undefined
  if (kb <= 1500) return 'pos'
  if (kb <= 3000) return 'low'
  return 'neg'
}

/** CO₂ g/visit — lower is better. */
export function co2Tone(grams: number | null | undefined): MetricTone | undefined {
  if (grams == null || !Number.isFinite(grams)) return undefined
  if (grams <= 0.5) return 'pos'
  if (grams <= 1.0) return 'low'
  return 'neg'
}

/** Cleaner-than percentile — higher is better. */
export function cleanerThanTone(pct: number | null | undefined): MetricTone | undefined {
  if (pct == null || !Number.isFinite(pct)) return undefined
  if (pct >= 70) return 'pos'
  if (pct >= 40) return 'low'
  return 'neg'
}

export function scoreMetricTone(value: number | null | undefined): MetricTone | undefined {
  const tone = scoreTone(value)
  if (tone === 'pos' || tone === 'low' || tone === 'neg') return tone
  return undefined
}

/** Clarity 0–100 (magazine readability score). */
export function clarityTone(score: number | null | undefined): MetricTone | undefined {
  if (score == null || !Number.isFinite(score)) return undefined
  if (score >= 70) return 'pos'
  if (score >= 55) return 'low'
  return 'neg'
}

/** Title/meta length heuristics for SEO. */
export function titleLenTone(len: number | null | undefined): MetricTone | undefined {
  if (len == null) return undefined
  if (len >= 30 && len <= 60) return 'pos'
  if (len >= 20 && len <= 70) return 'low'
  return 'neg'
}

export function metaLenTone(len: number | null | undefined): MetricTone | undefined {
  if (len == null) return undefined
  if (len >= 120 && len <= 160) return 'pos'
  if (len >= 70 && len <= 200) return 'low'
  return 'neg'
}

export function wordCountTone(words: number | null | undefined): MetricTone | undefined {
  if (words == null) return undefined
  if (words >= 300) return 'pos'
  if (words >= 150) return 'low'
  return 'neg'
}

export function h1CountTone(count: number | null | undefined): MetricTone | undefined {
  if (count == null) return undefined
  if (count === 1) return 'pos'
  if (count === 0 || count > 2) return 'neg'
  return 'low'
}

export function freshnessAgeTone(days: number | null | undefined): MetricTone | undefined {
  if (days == null) return undefined
  if (days <= 30) return 'pos'
  if (days <= 180) return 'low'
  return 'neg'
}

export function confidenceTone(
  confidence: 'low' | 'medium' | 'high' | string | null | undefined,
): MetricTone | undefined {
  if (!confidence) return undefined
  if (confidence === 'high') return 'pos'
  if (confidence === 'medium') return 'low'
  if (confidence === 'low') return 'neg'
  return undefined
}

export function scanStatusTone(
  status: string | null | undefined,
): MetricTone | undefined {
  if (!status) return undefined
  if (status === 'completed') return 'pos'
  if (status === 'failed') return 'neg'
  if (status === 'running' || status === 'queued') return 'low'
  return undefined
}

/** Script transfer size (KB). */
export function scriptKbTone(kb: number | null | undefined): MetricTone | undefined {
  if (kb == null || !Number.isFinite(kb)) return undefined
  if (kb <= 150) return 'pos'
  if (kb <= 350) return 'low'
  return 'neg'
}
