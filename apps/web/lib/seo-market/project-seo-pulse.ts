/**
 * Project-magazine SEO pulse teaser — meters from SeoProjectOverview.
 * Spec: specs/domain/project-workspace.md § SEO pulse
 */
import type { SeoProjectOverview } from '@checkion-v3/contracts'
import { paths } from '../paths'

export type ProjectSeoPulseMeterId =
  | 'tracked'
  | 'refDomains'
  | 'organicKw'
  | 'gscClicks'

export type ProjectSeoPulseMeter = {
  id: ProjectSeoPulseMeterId
  /** Display value (compact count or em dash). */
  value: string
  /** True when a real number backs the meter. */
  linked: boolean
}

export type ProjectSeoPulse = {
  projectId: string
  href: string
  hasData: boolean
  meters: ProjectSeoPulseMeter[]
}

function fmtCount(n: number | null | undefined): { value: string; linked: boolean } {
  if (n == null || !Number.isFinite(n)) return { value: '—', linked: false }
  return {
    value: new Intl.NumberFormat(undefined, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n),
    linked: true,
  }
}

function gscClicks(overview: SeoProjectOverview): number | null {
  if (!overview.gscConnected && !overview.gscSnapshot) return null
  const items = overview.gscSnapshot?.items
  if (!items?.length) return overview.gscConnected ? 0 : null
  return items.reduce((sum, row) => sum + (row.clicks ?? 0), 0)
}

/** Build magazine SEO pulse from a project SEO overview payload. */
export function buildProjectSeoPulse(overview: SeoProjectOverview): ProjectSeoPulse {
  const tracked = overview.rankConfigs.reduce((n, c) => n + (c.keywordCount || 0), 0)
  const refDomains = overview.backlinkSnapshot?.referringDomains ?? null
  const organicKw = overview.domainSnapshot?.organicKeywords ?? null
  const clicks = gscClicks(overview)

  const trackedMeter =
    tracked > 0 || overview.rankConfigs.length > 0
      ? fmtCount(tracked)
      : fmtCount(null)
  const refMeter = fmtCount(refDomains)
  const organicMeter = fmtCount(organicKw)
  const gscMeter = fmtCount(clicks)

  const hasData =
    trackedMeter.linked ||
    refMeter.linked ||
    organicMeter.linked ||
    gscMeter.linked ||
    overview.savedKeywordCount > 0

  return {
    projectId: overview.projectId,
    href: paths.routes.projectSeo(overview.projectId),
    hasData,
    meters: [
      { id: 'tracked', ...trackedMeter },
      { id: 'refDomains', ...refMeter },
      { id: 'organicKw', ...organicMeter },
      { id: 'gscClicks', ...gscMeter },
    ],
  }
}
