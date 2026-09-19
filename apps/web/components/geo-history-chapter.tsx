'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type {
  GeoMeasurement,
  GeoPositionHistoryResult,
  GeoQuestionHistorySeries,
} from '@checkion-v3/contracts'
import { Chip, EmptyState, Hint, Panel, SectionChrome, Text } from '@msqdx/ui'
import { SeriesChart } from '../lib/msqdx-ui-client'
import { geoMeasurementLabel } from '../lib/geo/measurement'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'

function formatHistoryLabel(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: '2-digit' }).format(
      new Date(iso),
    )
  } catch {
    return iso.slice(0, 10)
  }
}

function trendLabel(
  trend: GeoQuestionHistorySeries['trend'],
  t: (key: string) => string,
): string {
  if (trend === 'improving') return t('projects.geoHistoryTrendImproving')
  if (trend === 'declining') return t('projects.geoHistoryTrendDeclining')
  if (trend === 'stable') return t('projects.geoHistoryTrendStable')
  return t('projects.geoHistoryTrendUnknown')
}

export function GeoHistoryChapter({
  projectId,
  history,
  measurement = 'recall',
}: {
  projectId: string
  history: GeoPositionHistoryResult
  measurement?: GeoMeasurement
}) {
  const t = useT()
  const [modelId, setModelId] = useState<string | 'avg'>('avg')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('chapter') === 'geo-history') {
      document.getElementById('geo-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const modelIds = history.modelIds
  const chartSeriesFor = (item: GeoQuestionHistorySeries) => {
    if (modelId === 'avg') {
      return [
        {
          id: 'avg',
          label: history.targetHost || t('projects.geoHistoryTarget'),
          points: item.points.map((p) => ({
            label: formatHistoryLabel(p.recordedAt),
            value: p.avgPosition,
          })),
        },
      ]
    }
    return [
      {
        id: modelId,
        label: modelId,
        points: item.points.map((p) => ({
          label: formatHistoryLabel(p.recordedAt),
          value: p.positionsByModel[modelId] ?? null,
        })),
      },
    ]
  }

  const withTimeline = useMemo(
    () => history.items.filter((i) => i.points.length >= 2),
    [history.items],
  )

  return (
    <section
      id="geo-history"
      className="checkion-workspace-chapter checkion-geo-history-chapter"
      aria-label={t('projects.geoHistoryAria')}
    >
      <p className="checkion-workspace-chapter__eyebrow">{t('projects.geoHistoryEyebrow')}</p>
      <h2 className="checkion-workspace-chapter__title">{t('projects.geoHistoryTitle')}</h2>
      <p className="checkion-workspace-chapter__deck">
        {t('projects.geoHistoryDeck', {
          layer: geoMeasurementLabel(measurement),
          host: history.targetHost || projectId,
        })}
      </p>

      {withTimeline.length === 0 ? (
        <EmptyState className="checkion-project-chapter__empty">
          {t('projects.geoHistoryEmpty')}{' '}
          <Link
            href={paths.routes.scanLaunch({
              projectId,
              mode: 'geo',
              measurement,
            })}
          >
            {t('projects.geoHistoryEmptyCta')}
          </Link>
          .
        </EmptyState>
      ) : (
        <>
          <div className="checkion-geo-history-filters" role="group" aria-label={t('projects.geoHistoryModelsAria')}>
            <Chip
              size="sm"
              selected={modelId === 'avg'}
              onClick={() => setModelId('avg')}
            >
              {t('projects.geoHistoryAvg')}
            </Chip>
            {modelIds.map((id) => (
              <Chip
                key={id}
                size="sm"
                selected={modelId === id}
                onClick={() => setModelId(id)}
              >
                {id}
              </Chip>
            ))}
          </div>
          <Hint>{t('projects.geoHistoryHint')}</Hint>
          <div className="checkion-geo-history-grid">
            {withTimeline.map((item) => (
              <Panel key={item.queryKey} className="checkion-geo-history-card">
                <SectionChrome
                  title={item.queryText}
                  meta={trendLabel(item.trend, t)}
                />
                <Text role="meta" as="p" className="checkion-geo-history-card__meta">
                  {t('projects.geoHistoryLatest', {
                    pos:
                      item.latestPosition != null
                        ? String(item.latestPosition)
                        : t('projects.geoHistoryMiss'),
                  })}
                </Text>
                <SeriesChart
                  invertY
                  height={180}
                  series={chartSeriesFor(item)}
                  title={item.queryText}
                />
              </Panel>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
