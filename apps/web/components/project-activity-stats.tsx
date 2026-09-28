'use client'

import type { ProjectSummary } from '@checkion-v3/contracts'
import { CollectionHubMetric } from '@msqdx/ui'
import {
  emptyActivityLane,
  type ProjectActivityLane,
} from '../lib/project-activity'
import { formatScanShort } from '../lib/scan-display'
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
    parts.push(`${t('projects.metricSingles')} ${formatScanShort(lanes.singles.lastAt)}`)
  }
  if (lanes.deep.count > 0) {
    parts.push(`${t('projects.metricDeep')} ${formatScanShort(lanes.deep.lastAt)}`)
  }
  if (lanes.geo.count > 0) {
    parts.push(`${t('projects.metricGeo')} ${formatScanShort(lanes.geo.lastAt)}`)
  }
  if (lanes.seo.count > 0) {
    parts.push(`${t('projects.metricSeo')} ${formatScanShort(lanes.seo.lastAt)}`)
  }
  if (parts.length === 0) return t('projects.metricNone')
  return parts.join(' · ')
}

/** Hub / home collection-card stats: last activity per capability lane. */
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
      {cells.map(({ key, lane, label }) => {
        const has = lane.count > 0 || lane.lastAt != null
        return (
          <CollectionHubMetric
            key={key}
            value={has ? formatScanShort(lane.lastAt) : '—'}
            label={
              lane.count > 0
                ? t('projects.metricLaneWithCount', { label, count: lane.count })
                : label
            }
            linked={has}
          />
        )
      })}
    </div>
  )
}
