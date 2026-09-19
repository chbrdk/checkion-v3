'use client'

import Link from 'next/link'
import { Hint, Panel, SectionChrome, Text } from '@msqdx/ui'
import type { GeoMeasurement } from '@checkion-v3/contracts'
import { geoMeasurementLabel } from '../lib/geo/measurement'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'

/** Compact magazine teaser when ≥1 query has ≥2 history points. */
export function GeoHistoryTeaser({
  projectId,
  measurement,
  seriesCount,
  sampleQuery,
}: {
  projectId: string
  measurement: GeoMeasurement
  seriesCount: number
  sampleQuery?: string
}) {
  const t = useT()
  if (seriesCount < 1) return null

  const sample =
    sampleQuery && sampleQuery.trim().length > 0
      ? t('geo.historyTeaserSample', { query: sampleQuery.trim() })
      : ''

  return (
    <Panel className="checkion-geo-history-teaser" data-testid="geo-history-teaser">
      <SectionChrome
        title={t('geo.historyTeaserTitle')}
        meta={geoMeasurementLabel(measurement)}
      />
      <Text role="meta" as="p">
        {t('geo.historyTeaserBody', {
          count: String(seriesCount),
          sample,
        })}
      </Text>
      <Hint>{t('geo.historyTeaserHint')}</Hint>
      <p className="checkion-geo-history-teaser__cta">
        <Link href={paths.routes.projectGeoHistory(projectId)}>
          {t('geo.historyTeaserCta')}
        </Link>
      </p>
    </Panel>
  )
}
