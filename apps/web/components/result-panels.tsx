'use client'

import Link from 'next/link'
import {
  Chip,
  EmptyState,
  RankedList,
  RankedRow,
  StatusMeterPanel,
  Text,
} from '@msqdx/ui'
import type {
  IssueSummary,
  ScanOverview,
  ScoreCard,
  SecurityPrivacySnapshot,
  VisualLayersSnapshot,
} from '@checkion-v3/contracts'
import { paths } from '../lib/paths'
import { scoreTone, severityRank } from '../lib/scan-display'
import { IssuesWorkspace } from './issues-workspace'
import { LabelWithTip } from './help-tip'
import { ScoresPanel } from './scores-panel'
import { WeakestSignalCallout } from './weakest-signal-callout'
import { buildWeakestSignalFallback } from '../lib/weakest-signal-statement'
import { useT } from '../lib/user-prefs'

export { ScoresPanel } from './scores-panel'

function msParts(value: number): { n: string; unit: string } {
  if (value >= 1000) {
    return {
      n: (value / 1000).toFixed(value >= 10000 ? 1 : 2),
      unit: 's',
    }
  }
  return { n: String(Math.round(value)), unit: 'ms' }
}

function vitalTone(msValue: number, good: number, ok: number): 'pos' | 'low' | 'neg' {
  if (msValue <= good) return 'pos'
  if (msValue <= ok) return 'low'
  return 'neg'
}

function intensityLabel(tier: number, t: (key: string) => string): string {
  if (tier <= 1) return t('results.intensityLight')
  if (tier === 2) return t('results.intensityModerate')
  if (tier === 3) return t('results.intensityDense')
  if (tier === 4) return t('results.intensityHeavy')
  return t('results.intensityExtreme')
}

function readabilityTone(score: number): 'pos' | 'low' | 'neg' {
  if (score >= 70) return 'pos'
  if (score >= 55) return 'low'
  return 'neg'
}

function shieldStats(
  snap: SecurityPrivacySnapshot,
  t: (key: string) => string,
): {
  ok: number
  total: number
  gaps: string[]
} {
  const items: Array<{ ok: boolean; gap: string }> = [
    { ok: snap.https, gap: 'HTTPS' },
    { ok: snap.hsts, gap: 'HSTS' },
    { ok: snap.csp, gap: 'CSP' },
    { ok: snap.hasPrivacyPolicy, gap: t('results.gapPrivacy') },
    { ok: snap.hasCookieBanner, gap: t('results.gapCookies') },
    { ok: !snap.mixedContent, gap: t('results.gapMix') },
  ]
  return {
    ok: items.filter((i) => i.ok).length,
    total: items.length,
    gaps: items.filter((i) => !i.ok).map((i) => i.gap),
  }
}

export function ResultOverviewPanel({
  overview,
  issuesHref,
}: {
  overview: ScanOverview
  issuesHref?: string
}) {
  const t = useT()
  const running = overview.scan.status === 'running' || overview.scan.status === 'queued'
  const perf = overview.performance
  const seo = overview.seo
  const eco = overview.eco
  const ux = overview.ux
  const links = overview.links
  const geo = overview.generative
  const sortedScores = [...overview.scores].sort((a, b) => a.value - b.value)
  const shield = overview.securityPrivacy ? shieldStats(overview.securityPrivacy, t) : null
  const clearedCount =
    overview.scan.issueStats?.passed ?? overview.passedChecks?.length ?? null
  const notesTileCount =
    (overview.freshness ? 1 : 0) +
    (shield ? 1 : 0) +
    (clearedCount != null ? 1 : 0) +
    (overview.deviceSiblings?.length ?? 0)
  const vitalsTileCount = perf ? (perf.scriptTransferKb != null ? 6 : 5) : 0
  const metricTileRows = Math.max(
    Math.ceil(notesTileCount / 3),
    Math.ceil(vitalsTileCount / 3),
    1,
  )

  return (
    <div className="checkion-magazine-body checkion-spread">
      {running ? (
        <StatusMeterPanel
          title={t('results.progressTitle')}
          meta={overview.scan.mode}
          level="warn"
          banner={t('results.progressBanner')}
          meters={[
            { id: 'fetch', label: t('results.meterFetch'), value: '…', fillPct: 40 },
            { id: 'rules', label: t('results.meterRules'), value: '…', fillPct: 18 },
            { id: 'score', label: t('results.meterScore'), value: '…', fillPct: 5 },
          ]}
        />
      ) : null}

      {/* Opening spread: scoreline + tension callout */}
      <section className="checkion-spread__open" aria-labelledby="scoreline-heading">
        <div className="checkion-spread__open-main">
          <p className="checkion-spread__eyebrow">{t('results.scorelineEyebrow')}</p>
          <h3 id="scoreline-heading" className="checkion-spread__headline">
            {t('results.scorelineHeadline')}
          </h3>
          <ScoresPanel scores={sortedScores} />
        </div>
        <WeakestSignalCallout
          scanId={overview.scan.id}
          fallback={buildWeakestSignalFallback(overview)}
        />
      </section>

      {/* Margins & pace — two chapters, one metric grid */}
      {(notesTileCount > 0 || perf) && (
        <section className="checkion-metrics-spread" aria-labelledby="metrics-heading">
          <header className="checkion-metrics-spread__head">
            <p className="checkion-spread__eyebrow">{t('results.fieldNotes')}</p>
            <h3 id="metrics-heading" className="checkion-spread__headline">
              {t('results.marginsPace')}
            </h3>
          </header>

          <div
            className="checkion-metrics-spread__body"
            data-chapters={notesTileCount > 0 && perf ? 'both' : notesTileCount > 0 ? 'notes' : 'vitals'}
            style={{ ['--metric-tile-rows' as string]: String(metricTileRows) }}
          >
            {notesTileCount > 0 ? (
              <div className="checkion-metrics-spread__chapter" data-chapter="notes">
                <p className="checkion-metrics-spread__kicker">{t('results.alsoNoted')}</p>
                <div
                  className="checkion-spread__lab checkion-spread__lab--notes checkion-metrics-spread__tiles"
                  style={{ ['--notes-cols' as string]: String(Math.min(notesTileCount, 3)) }}
                >
                  {overview.freshness ? (
                    <div className="checkion-lab-tile">
                      <strong className="checkion-lab-tile__v">
                        {overview.freshness.ageDays ?? '—'}
                        <span className="checkion-lab-tile__unit">d</span>
                      </strong>
                      <span className="checkion-lab-tile__k">
                        <LabelWithTip tipId="lab.freshness">{t('results.freshness')}</LabelWithTip>
                      </span>
                      <span className="checkion-lab-tile__m">
                        {t('results.confidenceMeta', { confidence: overview.freshness.confidence })}
                        {overview.freshness.source
                          ? ` · ${overview.freshness.source.replace(/_/g, ' ')}`
                          : ''}
                      </span>
                    </div>
                  ) : null}
                  {shield ? (
                    <div
                      className="checkion-lab-tile"
                      data-tone={
                        shield.gaps.length === 0
                          ? 'pos'
                          : shield.gaps.length === 1
                            ? 'low'
                            : 'neg'
                      }
                    >
                      <strong className="checkion-lab-tile__v">
                        {shield.ok}
                        <span className="checkion-lab-tile__unit">/{shield.total}</span>
                      </strong>
                      <span className="checkion-lab-tile__k">
                        <LabelWithTip tipId="lab.shield">{t('results.shield')}</LabelWithTip>
                      </span>
                      <span className="checkion-lab-tile__m">
                        {shield.gaps.length === 0
                          ? t('results.allClear')
                          : t('results.missingGaps', { gaps: shield.gaps.join(' · ') })}
                      </span>
                    </div>
                  ) : null}
                  {clearedCount != null ? (
                    <div className="checkion-lab-tile" data-tone="pos">
                      <strong className="checkion-lab-tile__v">{clearedCount}</strong>
                      <span className="checkion-lab-tile__k">
                        <LabelWithTip tipId="lab.cleared">{t('results.cleared')}</LabelWithTip>
                      </span>
                      <span className="checkion-lab-tile__m">
                        {overview.passedChecks?.[0]?.description ?? t('results.checksClean')}
                      </span>
                    </div>
                  ) : null}
                  {overview.deviceSiblings?.map((sib) => (
                    <div
                      key={sib.id}
                      className="checkion-lab-tile"
                      data-tone={scoreTone(sib.overallScore)}
                      data-active={sib.id === overview.scan.id ? 'true' : undefined}
                    >
                      <strong className="checkion-lab-tile__v">{sib.overallScore ?? '—'}</strong>
                      <span className="checkion-lab-tile__k">{sib.device}</span>
                      <span className="checkion-lab-tile__m">
                        {sib.id === overview.scan.id ? t('results.thisScan') : t('results.siblingDevice')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {perf ? (
              <div className="checkion-metrics-spread__chapter" data-chapter="vitals">
                <p className="checkion-metrics-spread__kicker">{t('results.whatSlows')}</p>
                <div
                  className="checkion-spread__lab checkion-spread__lab--notes checkion-metrics-spread__tiles"
                  style={{
                    ['--notes-cols' as string]: String(
                      Math.min(perf.scriptTransferKb != null ? 6 : 5, 3),
                    ),
                  }}
                >
                  {(
                    [
                      {
                        key: 'TTFB',
                        tipId: 'vital.ttfb' as const,
                        value: perf.ttfb,
                        meta: t('results.vitalTtfb'),
                        tone: vitalTone(perf.ttfb, 200, 500),
                      },
                      {
                        key: 'FCP',
                        tipId: 'vital.fcp' as const,
                        value: perf.fcp,
                        meta: t('results.vitalFcp'),
                        tone: vitalTone(perf.fcp, 1800, 3000),
                      },
                      {
                        key: 'LCP',
                        tipId: 'vital.lcp' as const,
                        value: perf.lcp,
                        meta: t('results.vitalLcp'),
                        tone: vitalTone(perf.lcp, 2500, 4000),
                      },
                      {
                        key: 'DOM',
                        tipId: 'vital.dom' as const,
                        value: perf.domLoad,
                        meta: t('results.vitalDom'),
                        tone: vitalTone(perf.domLoad, 2000, 3500),
                      },
                      {
                        key: 'Load',
                        tipId: 'vital.load' as const,
                        value: perf.windowLoad,
                        meta: t('results.vitalLoad'),
                        tone: vitalTone(perf.windowLoad, 3000, 5000),
                      },
                    ] as const
                  ).map((vital) => {
                    const parts = msParts(vital.value)
                    return (
                      <div key={vital.key} className="checkion-lab-tile" data-tone={vital.tone}>
                        <strong className="checkion-lab-tile__v">
                          {parts.n}
                          <span className="checkion-lab-tile__unit">{parts.unit}</span>
                        </strong>
                        <span className="checkion-lab-tile__k">
                          <LabelWithTip tipId={vital.tipId}>{vital.key}</LabelWithTip>
                        </span>
                        <span className="checkion-lab-tile__m">{vital.meta}</span>
                      </div>
                    )
                  })}
                  {perf.scriptTransferKb != null ? (
                    <div
                      className="checkion-lab-tile"
                      data-tone={
                        perf.scriptTransferKb < 300
                          ? 'pos'
                          : perf.scriptTransferKb < 500
                            ? 'low'
                            : 'neg'
                      }
                    >
                      <strong className="checkion-lab-tile__v">
                        {perf.scriptTransferKb}
                        <span className="checkion-lab-tile__unit">kb</span>
                      </strong>
                      <span className="checkion-lab-tile__k">
                        <LabelWithTip tipId="vital.scripts">{t('results.scripts')}</LabelWithTip>
                      </span>
                      <span className="checkion-lab-tile__m">{t('results.transferWeight')}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* On the page — reading profile left, story right */}
      {(seo || ux || overview.classification) && (
        <section
          className="checkion-page-spread"
          aria-labelledby="feature-heading"
        >
          {(ux?.readabilityGrade ||
            ux?.readabilityScore != null ||
            overview.classification?.intensityTier != null ||
            seo?.wordCount != null) && (
            <aside className="checkion-page-spread__reading" aria-label={t('results.readingProfile')}>
              {ux?.readabilityGrade ? (
                <p
                  className="checkion-page-spread__cefr"
                  data-tone={
                    ux.readabilityScore != null ? readabilityTone(ux.readabilityScore) : undefined
                  }
                >
                  <span className="checkion-page-spread__cefr-copy">
                    <span className="checkion-page-spread__cefr-label">
                      <LabelWithTip tipId="reading.cefr">{t('results.readability')}</LabelWithTip>
                    </span>
                    <span className="checkion-page-spread__cefr-meta">
                      {t('results.cefrMeta')}
                    </span>
                  </span>
                  <span className="checkion-page-spread__cefr-mark">{ux.readabilityGrade}</span>
                </p>
              ) : null}

              {ux?.readabilityScore != null ? (
                <div
                  className="checkion-page-spread__clarity"
                  data-tone={readabilityTone(ux.readabilityScore)}
                >
                  <div className="checkion-page-spread__clarity-head">
                    <span>
                      <LabelWithTip tipId="reading.clarity">{t('results.clarity')}</LabelWithTip>
                    </span>
                    <strong>{ux.readabilityScore}</strong>
                  </div>
                  <div
                    className="checkion-page-spread__clarity-track"
                    aria-hidden
                  >
                    <span style={{ width: `${Math.max(4, Math.min(100, ux.readabilityScore))}%` }} />
                  </div>
                </div>
              ) : null}

              {overview.classification?.intensityTier != null ? (
                <div className="checkion-page-spread__complexity">
                  <div className="checkion-page-spread__complexity-head">
                    <span>
                      <LabelWithTip tipId="reading.complexity">{t('results.complexity')}</LabelWithTip>
                    </span>
                    <strong>{intensityLabel(overview.classification.intensityTier, t)}</strong>
                  </div>
                  <ol
                    className="checkion-page-spread__tiers"
                    aria-label={t('results.intensityAria', { tier: overview.classification.intensityTier })}
                  >
                    {[1, 2, 3, 4, 5].map((step) => (
                      <li
                        key={step}
                        data-on={
                          step <= overview.classification!.intensityTier ? 'true' : 'false'
                        }
                      />
                    ))}
                  </ol>
                </div>
              ) : null}

              {seo?.wordCount != null ? (
                <p className="checkion-page-spread__words">
                  <em>{seo.wordCount.toLocaleString()}</em>
                  {' '}{t('results.wordsOnPage')}
                  {seo.skinnyContent ? t('results.wordsSkinny') : '.'}
                </p>
              ) : null}
            </aside>
          )}

          <div className="checkion-page-spread__story">
            <p className="checkion-spread__eyebrow">{t('results.onThePage')}</p>
            <h3 id="feature-heading" className="checkion-spread__headline checkion-spread__headline--story">
              {seo?.title ?? overview.classification?.shortSummary ?? t('results.untitledDocument')}
            </h3>
            {seo?.metaDescription ? (
              <p className="checkion-spread__prose">{seo.metaDescription}</p>
            ) : overview.classification?.shortSummary && seo?.title ? (
              <p className="checkion-spread__prose">{overview.classification.shortSummary}</p>
            ) : null}

            <dl className="checkion-page-dossier">
              {seo?.h1 ? (
                <div className="checkion-page-dossier__row checkion-page-dossier__row--chips">
                  <dt>{t('results.dossierH1')}</dt>
                  <dd>
                    <div className="checkion-chip-row">
                      <Chip static size="sm">
                        {seo.h1}
                      </Chip>
                    </div>
                  </dd>
                </div>
              ) : null}
              {seo ? (
                <div className="checkion-page-dossier__row checkion-page-dossier__row--chips">
                  <dt>{t('results.dossierLengths')}</dt>
                  <dd>
                    <div className="checkion-chip-row">
                      <Chip static size="sm">
                        {t('results.dossierTitleLen', { n: seo.titleLength })}
                      </Chip>
                      <Chip static size="sm">
                        {t('results.dossierMetaLen', { n: seo.metaDescriptionLength })}
                      </Chip>
                    </div>
                  </dd>
                </div>
              ) : null}
              {ux ? (
                <div className="checkion-page-dossier__row checkion-page-dossier__row--chips">
                  <dt>{t('results.dossierStructure')}</dt>
                  <dd>
                    <div className="checkion-chip-row">
                      <Chip static size="sm">
                        {t('results.dossierH1Count', { n: ux.headingH1Count })}
                      </Chip>
                      <Chip static size="sm">
                        {ux.skippedHeadingLevels ? t('results.skippedLevels') : t('results.levelsIntact')}
                      </Chip>
                      {ux.hasSkipLink ? (
                        <Chip static size="sm">
                          {t('results.skipLink')}
                        </Chip>
                      ) : null}
                    </div>
                  </dd>
                </div>
              ) : null}
              {seo ? (
                <div className="checkion-page-dossier__row checkion-page-dossier__row--chips">
                  <dt>{t('results.dossierSignals')}</dt>
                  <dd>
                    <div className="checkion-chip-row">
                      {(
                        [
                          seo.hasOpenGraph ? 'OG' : null,
                          seo.hasJsonLd ? 'JSON-LD' : null,
                          seo.robots ?? null,
                          seo.skinnyContent ? t('results.skinny') : t('results.dense'),
                        ].filter(Boolean) as string[]
                      ).map((signal) => (
                        <Chip key={signal} static size="sm">
                          {signal}
                        </Chip>
                      ))}
                    </div>
                  </dd>
                </div>
              ) : null}
              {seo?.canonical ? (
                <div className="checkion-page-dossier__row checkion-page-dossier__row--chips">
                  <dt>{t('results.dossierCanonical')}</dt>
                  <dd>
                    <div className="checkion-chip-row">
                      <Chip static size="sm">
                        <span className="checkion-spread__facts-mono">{seo.canonical}</span>
                      </Chip>
                    </div>
                  </dd>
                </div>
              ) : null}
              {overview.classification?.tags?.length ? (
                <div className="checkion-page-dossier__row checkion-page-dossier__row--chips">
                  <dt>{t('results.dossierClassed')}</dt>
                  <dd>
                    <div className="checkion-chip-row">
                      {overview.classification.tags.map((tag) => (
                        <Chip key={tag} static size="sm">
                          {tag}
                        </Chip>
                      ))}
                    </div>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </section>
      )}

      {/* Lab strip — UX / Eco / Links teasers (GEO has its own chapter) */}
      {(ux || eco || links) && (
        <section className="checkion-spread__lab" aria-label={t('results.labAria')}>
          {ux ? (
            <div className="checkion-lab-tile" data-tone={scoreTone(ux.score)}>
              <span className="checkion-lab-tile__k">
                <LabelWithTip tipId="lab.ux">{t('results.uxLab')}</LabelWithTip>
              </span>
              <strong className="checkion-lab-tile__v">{ux.score}</strong>
              <span className="checkion-lab-tile__m">
                {[
                  `CLS ${ux.cls}`,
                  ux.mobileFriendly ? t('results.mobile') : t('results.notMobile'),
                  t('results.tapsMeta', { n: ux.tapTargetIssueCount }),
                ].join(' · ')}
              </span>
            </div>
          ) : null}
          {eco ? (
            <div
              className="checkion-lab-tile"
              data-tone={
                eco.grade === 'A+' || eco.grade === 'A' ? 'pos' : eco.grade === 'B' ? 'low' : 'neg'
              }
            >
              <span className="checkion-lab-tile__k">
                <LabelWithTip tipId="lab.eco">{t('results.ecoGrade', { grade: eco.grade })}</LabelWithTip>
              </span>
              <strong className="checkion-lab-tile__v">{eco.co2.toFixed(2)}g</strong>
              <span className="checkion-lab-tile__m">
                {eco.pageWeightKb} KB
                {eco.greenWebHosted === true
                  ? t('results.greenHost')
                  : eco.greenWebHosted === false
                    ? t('results.notGreen')
                    : ''}
              </span>
            </div>
          ) : null}
          {links ? (
            <div
              className="checkion-lab-tile"
              data-tone={links.broken > 0 || links.missingNoopener > 0 ? 'neg' : 'pos'}
            >
              <span className="checkion-lab-tile__k">
                <LabelWithTip tipId="lab.links">{t('results.links')}</LabelWithTip>
              </span>
              <strong className="checkion-lab-tile__v">{links.broken}</strong>
              <span className="checkion-lab-tile__m">
                {t('results.linksMeta', { internal: links.internal, external: links.external })}
                {links.missingNoopener > 0
                  ? t('results.noopenerMeta', { n: links.missingNoopener })
                  : ''}
              </span>
            </div>
          ) : null}
        </section>
      )}

      {/* GEO chapter — magazine lens, still not a full report */}
      {geo ? (
        <section className="checkion-geo-spread" aria-labelledby="geo-heading" data-tone={scoreTone(geo.score)}>
          <header className="checkion-geo-spread__head">
            <p className="checkion-spread__eyebrow">{t('results.geoEyebrow')}</p>
            <h3 id="geo-heading" className="checkion-spread__headline">
              {t('results.geoHeadline')}
            </h3>
            <p className="checkion-geo-spread__lede">
              {geo.hasLlmsTxt && geo.hasFaqSchema
                ? t('results.geoLedeBoth')
                : geo.hasFaqSchema && !geo.hasLlmsTxt
                  ? t('results.geoLedeFaqOnly')
                  : geo.hasLlmsTxt && !geo.hasFaqSchema
                    ? t('results.geoLedeLlmsOnly')
                    : t('results.geoLedeNeither')}
            </p>
          </header>

          <div className="checkion-geo-spread__body">
            <p className="checkion-geo-spread__score" aria-label={t('results.geoScoreAria', { score: geo.score })}>
              <span className="checkion-geo-spread__score-num">{geo.score}</span>
              <span className="checkion-geo-spread__score-label">
                <LabelWithTip tipId="geo.score">{t('results.geoScore')}</LabelWithTip>
              </span>
            </p>

            <div className="checkion-geo-spread__signals">
              <div className="checkion-geo-spread__meter" data-tone={scoreTone(geo.discoverability)}>
                <div className="checkion-geo-spread__meter-head">
                  <span>
                    <LabelWithTip tipId="geo.discoverability">{t('results.discoverability')}</LabelWithTip>
                  </span>
                  <strong>{geo.discoverability}</strong>
                </div>
                <div className="checkion-geo-spread__meter-track" aria-hidden>
                  <span
                    style={{
                      width: `${Math.max(4, Math.min(100, geo.discoverability))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="checkion-geo-spread__meter" data-tone={scoreTone(geo.repurposing)}>
                <div className="checkion-geo-spread__meter-head">
                  <span>
                    <LabelWithTip tipId="geo.repurposing">{t('results.repurposing')}</LabelWithTip>
                  </span>
                  <strong>{geo.repurposing}</strong>
                </div>
                <div className="checkion-geo-spread__meter-track" aria-hidden>
                  <span
                    style={{
                      width: `${Math.max(4, Math.min(100, geo.repurposing))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="checkion-chip-row checkion-geo-spread__presence" aria-label={t('results.geoPresence')}>
                <Chip static size="sm">
                  {geo.hasFaqSchema ? t('results.faqSchema') : t('results.noFaqSchema')}
                </Chip>
                <Chip static size="sm">
                  {geo.hasLlmsTxt ? t('results.llmsTxt') : t('results.noLlmsTxt')}
                </Chip>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {overview.topIssues[0] ? (
        <blockquote className="checkion-pullquote checkion-pullquote--center">
          <p className="checkion-spread__eyebrow">{t('results.fromDossier')}</p>
          <p className="checkion-pullquote__text">{overview.topIssues[0].title}</p>
          <footer>
            {overview.topIssues[0].severity} · ×{overview.topIssues[0].affectedCount}
            {issuesHref ? (
              <>
                {' · '}
                <Link href={issuesHref}>{t('results.openIssues')}</Link>
              </>
            ) : null}
          </footer>
        </blockquote>
      ) : null}

      {/* Issues as main drama */}
      <section className="checkion-spread__breaks" aria-labelledby="breaks-heading">
        <div className="checkion-spread__breaks-head">
          <div>
            <p className="checkion-spread__eyebrow">{t('results.findings')}</p>
            <h3 id="breaks-heading" className="checkion-spread__headline">
              {t('results.whatBreaks')}
            </h3>
          </div>
          {issuesHref ? (
            <Link href={issuesHref} className="checkion-band-action">
              {t('results.allIssues')}
            </Link>
          ) : null}
        </div>
        <IssueList issues={overview.topIssues} />
      </section>
    </div>
  )
}

export function IssueList({ issues }: { issues: IssueSummary[] }) {
  const t = useT()
  if (issues.length === 0) {
    return <EmptyState>{t('results.emptyIssues')}</EmptyState>
  }

  const maxAffected = Math.max(...issues.map((i) => i.affectedCount), 1)

  return (
    <RankedList>
      {issues.map((issue, index) => (
        <RankedRow
          key={issue.id}
          index={index + 1}
          label={issue.title}
          value={
            <Chip static size="sm">
              {issue.severity}
            </Chip>
          }
          secondary={`${issue.ruleId} · ${issue.section} · ×${issue.affectedCount} ${
            issue.affectedCount === 1 ? t('results.hit') : t('results.hits')
          }`}
          barPct={Math.max(
            severityRank(issue.severity) * 0.55 + (issue.affectedCount / maxAffected) * 45,
            8,
          )}
        />
      ))}
    </RankedList>
  )
}

export function ResultIssuesPanel({
  issues,
  screenshotUrl,
  visualLayers,
}: {
  issues: IssueSummary[]
  screenshotUrl?: string | null
  visualLayers?: VisualLayersSnapshot | null
}) {
  const t = useT()
  return (
    <div className="checkion-magazine-body checkion-spread checkion-issues-panel">
      <header className="checkion-issues-panel__head">
        <p className="checkion-spread__eyebrow">{t('results.chapter02Issues')}</p>
        <h3 id="issues-chapter" className="checkion-issues-panel__title">
          {t('results.visualInspect')}
        </h3>
      </header>
      <IssuesWorkspace
        issues={issues}
        screenshotUrl={screenshotUrl}
        visualLayers={visualLayers}
      />
    </div>
  )
}

export function ResultScoresPanel({
  scores,
  overall,
}: {
  scores: ScoreCard[]
  overall?: number | null
}) {
  const t = useT()
  const sorted = [...scores].sort((a, b) => a.value - b.value)
  const worst = sorted[0]
  const best = sorted[sorted.length - 1]
  const span =
    worst && best ? Math.max(0, best.value - worst.value) : null

  return (
    <div className="checkion-magazine-body checkion-spread">
      <section className="checkion-spread__open" aria-labelledby="ledger-heading">
        <div className="checkion-spread__open-main">
          <p className="checkion-spread__eyebrow">{t('results.chapter03')}</p>
          <h3 id="ledger-heading" className="checkion-spread__headline">
            {t('results.theLedger')}
          </h3>
          <p className="checkion-spread__prose">
            {t('results.ledgerProse')}
          </p>
          <div className="checkion-score-ledger" aria-label={t('results.scoreLedger')}>
            {sorted.map((score, index) => (
              <div
                key={score.kind}
                className="checkion-score-ledger__cell"
                data-tone={scoreTone(score.value)}
                style={{ ['--bar' as string]: `${score.value}%` }}
              >
                <span className="checkion-score-ledger__idx">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="checkion-score-ledger__label">{score.label}</span>
                <strong className="checkion-score-ledger__value">{score.value}</strong>
                <span className="checkion-score-ledger__bar" aria-hidden />
              </div>
            ))}
          </div>
        </div>
        <aside
          className="checkion-spread__callout"
          data-tone={worst ? scoreTone(worst.value) : 'ok'}
        >
          <p className="checkion-spread__eyebrow">{t('results.range')}</p>
          <p className="checkion-spread__callout-num">{span ?? '—'}</p>
          <p className="checkion-spread__callout-label">{t('results.pointsBetween')}</p>
          <p className="checkion-spread__callout-body">
            {worst && best
              ? t('results.rangeCompare', {
                  worst: worst.label,
                  worstVal: worst.value,
                  best: best.label,
                  bestVal: best.value,
                })
              : t('results.noCategoryScores')}
            {overall != null ? t('results.overallSuffix', { score: overall }) : ''}
          </p>
        </aside>
      </section>
    </div>
  )
}
