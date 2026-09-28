'use client'

import type { ProjectSummary } from '@checkion-v3/contracts'
import { CollectionHubMetric } from '@msqdx/ui'
import {
  emptyActivityLane,
  type ProjectActivityLane,
} from '../lib/project-activity'
import { useT } from '../lib/user-prefs'
import type { Translator } from '../lib/i18n'

export function projectActivityLanes(project: ProjectSummary): {
  singles: ProjectActivityLane
  deep: ProjectActivityLane
  geo: ProjectActivityLane
  seo: ProjectActivityLane
} {
  if (project.activity) return project.activity
  return {
    singles: { count: project.scanCount, lastAt: project.lastScanAt },
    deep: emptyActivityLane(),
    geo: emptyActivityLane(),
    seo: emptyActivityLane(),
  }
}

export function formatActivityListMeta(project: ProjectSummary, t: Translator): string {
  const lanes = projectActivityLanes(project)
  const parts: string[] = []
  if (lanes.singles.count > 0) {
    parts.push(`${lanes.singles.count} ${t('projects.metricSingles')}`)
  }
  if (lanes.deep.count > 0) {
    parts.push(`${lanes.deep.count} ${t('projects.metricDeep')}`)
  }
  if (lanes.geo.count > 0) {
    parts.push(`${lanes.geo.count} ${t('projects.metricGeo')}`)
  }
  if (lanes.seo.count > 0) {
    parts.push(`${lanes.seo.count} ${t('projects.metricSeo')}`)
  }
  if (parts.length === 0) return t('projects.metricNone')
  return parts.join(' · ')
}

/** Hub / home collection-card stats: count per capability lane (no dates). */
export function ProjectActivityStats({ project }: { project: ProjectSummary }) {
  const t = useT()
  const lanes = projectActivityLanes(project)
  const cells: Array<{ key: string; lane: ProjectActivityLane; label: string }> = [
    { key: 'singles', lane: lanes.singles, label: t('projects.metricSingles') },
    { key: 'deep', lane: lanes.deep, label: t('projects.metricDeep') },
    { key: 'geo', lane: lanes.geo, label: t('projects.metricGeo') },
    { key: 'seo', lane: lanes.seo, label: t('projects.metricSeo') },
  ]
  return (
    <div className="checkion-project-activity-stats" aria-label={t('projects.metricsAria')}>
      {cells.map(({ key, lane, label }) => (
        <CollectionHubMetric
          key={key}
          value={String(lane.count)}
          label={label}
          linked={lane.count > 0}
        />
      ))}
    </div>
  )
}
