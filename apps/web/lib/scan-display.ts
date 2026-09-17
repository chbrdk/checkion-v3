import type {
  GeoJobStatus,
  IssueSeverity,
  ScanStatus,
  ScoreCard,
} from '@checkion-v3/contracts'
import type { TopStatusLevel } from '@msqdx/ui'

/** Score color band for magazine surfaces (`data-tone`). Includes orange `mid`. */
export type ScoreBandTone = 'default' | 'pos' | 'low' | 'mid' | 'neg'

/**
 * Map overall score → magazine tone.
 * Green ≥80 · yellow ≥60 · orange ≥40 · red <40 · muted null.
 */
export function scoreTone(value: number | null | undefined): ScoreBandTone {
  if (value == null) return 'default'
  if (value >= 80) return 'pos'
  if (value >= 60) return 'low'
  if (value >= 40) return 'mid'
  return 'neg'
}

export function statusTopLevel(status: ScanStatus | GeoJobStatus): TopStatusLevel {
  if (status === 'failed') return 'critical'
  if (status === 'running' || status === 'queued') return 'warn'
  return 'ok'
}

export function worstScore(scores: ScoreCard[]): ScoreCard | null {
  if (scores.length === 0) return null
  return scores.reduce((worst, s) => (s.value < worst.value ? s : worst), scores[0])
}

export function severityRank(severity: IssueSeverity): number {
  switch (severity) {
    case 'critical':
      return 100
    case 'serious':
      return 75
    case 'moderate':
      return 45
    case 'minor':
      return 20
    default:
      return 0
  }
}

export function formatScanInstant(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 16)
  }
}

/** Compact date for magazine collection metrics. */
export function formatScanShort(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

/** Compact host+path for run list labels (shared by project panels). */
export function compactScanUrl(url: string, max = 52): string {
  try {
    const u = new URL(url)
    const path = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '')
    const full = `${u.hostname}${path}`
    return full.length > max ? `${full.slice(0, max - 3)}…` : full
  } catch {
    return url.length > max ? `${url.slice(0, max - 3)}…` : url
  }
}

/** Operator title when set; else compact URL fallback. */
export function displayRunTitle(
  title: string | null | undefined,
  url: string,
): string {
  const custom = typeof title === 'string' ? title.trim() : ''
  return custom || compactScanUrl(url)
}
