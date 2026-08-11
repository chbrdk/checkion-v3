'use client'

import Link from 'next/link'
import { Hint, StatusMeterPanel } from '@msqdx/ui'
import type { GeoOverview } from '@checkion-v3/contracts'
import {
  geoOverviewReadyForMagazine,
  isGeoJobInProgress,
  isGeoOverviewFailed,
} from '../lib/geo-job-display'
import { paths } from '../lib/paths'
import { scoreTone } from '../lib/scan-display'
import { buildGeoReadingFallback } from '../lib/geo-readings'
import { GeoPublishKnowledgeCta } from './geo-publish-knowledge-cta'
import { GeoReading } from './geo-reading'
import { GeoPresenceStage } from './geo-share-of-voice'
import { GeoInsightsPanel } from './geo-insights-panel'
import { GeoMovesGallery } from './geo-moves-gallery'
import { LabelWithTip } from './help-tip'

export function GeoOverviewPanel({
  overview,
  canPublishKnowledge = false,
}: {
  overview: GeoOverview
  canPublishKnowledge?: boolean
}) {
  const { eeat, recommendations, job, presence } = overview
  const inProgress = isGeoJobInProgress(job.status)
  const failed = isGeoOverviewFailed(overview)
  const showMagazine = geoOverviewReadyForMagazine(overview)

  if (inProgress) {
    const queued = job.status === 'queued'
    return (
      <div className="checkion-magazine-body checkion-spread checkion-geo-spread-layout">
        <StatusMeterPanel
          title={queued ? 'GEO job queued' : 'GEO run in progress'}
          meta={`${job.queryCount} queries · ${job.modelCount} models`}
          level="warn"
          banner={
            queued
              ? 'Waiting for the live pipeline to start — results will appear here when query runs finish.'
              : 'Answer engines are being queried now. This page refreshes when the magazine has values.'
          }
          meters={[
            {
              id: 'queue',
              label: 'Queue',
              value: queued ? '…' : 'ok',
              fillPct: queued ? 35 : 100,
            },
            {
              id: 'models',
              label: 'Models',
              value: '…',
              fillPct: queued ? 10 : 45,
            },
            {
              id: 'finalize',
              label: 'Magazine',
              value: '…',
              fillPct: queued ? 5 : 20,
            },
          ]}
        />
        <p className="checkion-spread__prose">{overview.lede}</p>
      </div>
    )
  }

  if (failed) {
    const detail =
      overview.lede?.trim() ||
      'The GEO pipeline finished without query results. Check OPENAI_API_KEY and try again.'
    return (
      <div className="checkion-magazine-body checkion-spread checkion-geo-spread-layout">
        <StatusMeterPanel
          title="GEO run failed"
          meta={job.status === 'failed' ? 'failed' : 'empty result'}
          level="critical"
          banner={detail}
          meters={[
            { id: 'pipeline', label: 'Pipeline', value: 'err', fillPct: 100 },
            { id: 'queries', label: 'Query runs', value: '0', fillPct: 0 },
            { id: 'magazine', label: 'Magazine', value: '—', fillPct: 0 },
          ]}
        />
        <p className="checkion-geo-recs__cta">
          Use Re-run in the top bar to queue the same prompts again, or{' '}
          <Link href={paths.routes.scanLaunch({ mode: 'geo', projectId: job.projectId })} className="checkion-geo-recs__nav">
            start a new GEO compose
          </Link>
          .
        </p>
      </div>
    )
  }

  if (!showMagazine) return null

  const tone = scoreTone(job.overallScore)
  const avgPos = presence.solo.avgPosition

  const eeatScores = eeat
    ? [
        { id: 'experience', tipId: 'geo.eeat.experience' as const, label: 'Experience', value: eeat.experience },
        { id: 'expertise', tipId: 'geo.eeat.expertise' as const, label: 'Expertise', value: eeat.expertise },
        {
          id: 'authoritativeness',
          tipId: 'geo.eeat.authoritativeness' as const,
          label: 'Authoritativeness',
          value: eeat.authoritativeness,
        },
        {
          id: 'trustworthiness',
          tipId: 'geo.eeat.trustworthiness' as const,
          label: 'Trustworthiness',
          value: eeat.trustworthiness,
        },
        { id: 'geoFitness', tipId: 'geo.eeat.fitness' as const, label: 'GEO fitness', value: eeat.geoFitness },
      ].sort((a, b) => a.value - b.value)
    : []

  const weakest = eeatScores[0]
  const strongest = eeatScores[eeatScores.length - 1]
  const eeatSpan =
    weakest && strongest ? Math.max(0, strongest.value - weakest.value) : null

  return (
    <div className="checkion-magazine-body checkion-spread checkion-geo-spread-layout">
      <section
        className="checkion-spread__open"
        data-layout="main-first"
        aria-labelledby="geo-verdict-heading"
      >
        <div className="checkion-spread__open-main">
          <p className="checkion-spread__eyebrow">Verdict</p>
          <h3 id="geo-verdict-heading" className="checkion-spread__headline">
            How answer engines see you
          </h3>
          <GeoReading
            jobId={job.id}
            kind="verdict"
            fallback={buildGeoReadingFallback(overview, 'verdict')}
          />
          <p className="checkion-spread__prose">{overview.lede}</p>
        </div>
        <aside className="checkion-geo-snapshot" aria-label="GEO snapshot">
          <div className="checkion-lab-tile" data-tone={tone}>
            <span className="checkion-lab-tile__k">
              <LabelWithTip tipId="geo.cited_share">Cited share</LabelWithTip>
            </span>
            <span className="checkion-lab-tile__v">{job.citedShare}%</span>
          </div>
          <div className="checkion-lab-tile">
            <span className="checkion-lab-tile__k">Queries</span>
            <span className="checkion-lab-tile__v">{job.queryCount}</span>
          </div>
          <div className="checkion-lab-tile">
            <span className="checkion-lab-tile__k">Avg position</span>
            <span className="checkion-lab-tile__v">
              {avgPos != null ? `#${avgPos.toFixed(1)}` : '—'}
            </span>
          </div>
        </aside>
      </section>

      <GeoPresenceStage overview={overview} />

      <GeoInsightsPanel overview={overview} />

      <section className="checkion-geo-recs" aria-labelledby="geo-recs-heading">
        <header className="checkion-metrics-spread__head">
          <p className="checkion-spread__eyebrow">Next moves</p>
          <h3 id="geo-recs-heading" className="checkion-spread__headline">
            What to change first
          </h3>
        </header>
        <GeoMovesGallery recommendations={recommendations} jobId={job.id} />
        <p className="checkion-geo-recs__cta">
          <Link href={paths.routes.geoSection(job.id, 'queries')} className="checkion-geo-recs__nav">
            Read answers
          </Link>
        </p>
        {job.status === 'completed' ? (
          <GeoPublishKnowledgeCta jobId={job.id} canPublish={canPublishKnowledge} />
        ) : null}
      </section>

      {eeat ? (
        <section
          className="checkion-spread__open"
          data-layout="main-first"
          aria-labelledby="geo-eeat-heading"
        >
          <div className="checkion-spread__open-main">
            <p className="checkion-spread__eyebrow">On-page (when available)</p>
            <h3 id="geo-eeat-heading" className="checkion-spread__headline">
              <LabelWithTip tipId="geo.eeat">E-E-A-T ledger</LabelWithTip>
            </h3>
            <GeoReading
              jobId={job.id}
              kind="eeat"
              fallback={buildGeoReadingFallback(overview, 'eeat')}
              eyebrow="Reading"
            />
            <Hint>From an attached page reading — not the LLM competitive run.</Hint>
            <div className="checkion-score-ledger" aria-label="E-E-A-T scores">
              {eeatScores.map((score, index) => {
                const reasoningKey =
                  score.id === 'experience'
                    ? 'experienceReasoning'
                    : score.id === 'expertise'
                      ? 'expertiseReasoning'
                      : score.id === 'authoritativeness'
                        ? 'authoritativenessReasoning'
                        : score.id === 'trustworthiness'
                          ? 'trustworthinessReasoning'
                          : score.id === 'geoFitness'
                            ? 'geoFitnessReasoning'
                            : null
                const reasoning =
                  reasoningKey && eeat
                    ? (eeat[reasoningKey as keyof typeof eeat] as string | undefined)
                    : undefined
                return (
                  <div
                    key={score.id}
                    className="checkion-score-ledger__cell"
                    data-tone={scoreTone(score.value)}
                    style={{ ['--bar' as string]: `${score.value}%` }}
                  >
                    <span className="checkion-score-ledger__idx">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="checkion-score-ledger__label">
                      <LabelWithTip tipId={score.tipId}>{score.label}</LabelWithTip>
                    </span>
                    <span className="checkion-score-ledger__value">{score.value}</span>
                    <span className="checkion-score-ledger__bar" aria-hidden />
                    {reasoning ? (
                      <p className="checkion-score-ledger__why">{reasoning}</p>
                    ) : null}
                  </div>
                )
              })}
            </div>
            {eeat.missingElements && eeat.missingElements.length > 0 ? (
              <div className="checkion-geo-eeat-gaps" aria-label="Missing GEO elements">
                <p className="checkion-spread__eyebrow">Missing / weak</p>
                <ul className="checkion-geo-eeat-gaps__list">
                  {eeat.missingElements.map((el) => (
                    <li key={el}>{el}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <aside
            className="checkion-spread__callout"
            data-tone={weakest ? scoreTone(weakest.value) : 'ok'}
          >
            <p className="checkion-spread__eyebrow">Range</p>
            <p className="checkion-spread__callout-num">{eeatSpan ?? '—'}</p>
            <p className="checkion-spread__callout-label">points between best &amp; worst</p>
            <p className="checkion-spread__callout-body">
              {weakest && strongest
                ? `${weakest.label} at ${weakest.value} vs ${strongest.label} at ${strongest.value}.`
                : 'No E-E-A-T scores yet.'}
            </p>
          </aside>
        </section>
      ) : null}
    </div>
  )
}
