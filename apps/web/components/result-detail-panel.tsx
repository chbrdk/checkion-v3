'use client'

import { useDeferredValue, useMemo, useState, type ReactNode } from 'react'
import { Chip, EmptyState, Input } from '@msqdx/ui'
import type { ScanOverview, ScoreCard } from '@checkion-v3/contracts'
import {
  badWhenTrue,
  cleanerThanTone,
  clarityTone,
  clsTone,
  co2Tone,
  confidenceTone,
  countTone,
  ecoGradeTone,
  freshnessAgeTone,
  goodWhenTrue,
  h1CountTone,
  issueStatsTone,
  metaLenTone,
  type MetricTone,
  pageWeightTone,
  scanStatusTone,
  scoreMetricTone,
  scriptKbTone,
  timingTone,
  titleLenTone,
  wordCountTone,
} from '../lib/detail-metric-tone'
import {
  bandVisible,
  filterFacts,
  parseDetailQuery,
  scoreMatches,
  type DetailSearchQuery,
  type SearchableFact,
} from '../lib/detail-report-search'
import { DETAIL_SCORE_FORMULAS, formulaForBand } from '../lib/detail-score-formulas'
import { tipIdForDetailBand } from '../lib/help-tips'
import { scoreTone } from '../lib/scan-display'
import { useT } from '../lib/user-prefs'
import type { Translator } from '../lib/i18n'
import { LabelWithTip } from './help-tip'

function msLabel(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)} s`
  }
  return `${Math.round(value)} ms`
}

function yesNo(value: boolean, t: Translator): string {
  return value ? t('results.detail.yes') : t('results.detail.no')
}

function intensityLabel(tier: number, t: Translator): string {
  if (tier <= 1) return t('results.intensityLight')
  if (tier === 2) return t('results.intensityModerate')
  if (tier === 3) return t('results.intensityDense')
  if (tier === 4) return t('results.intensityHeavy')
  return t('results.intensityExtreme')
}

function fmtDuration(ms: number | null | undefined): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

type Fact = SearchableFact

function ReportTable({ rows }: { rows: Fact[] }) {
  return (
    <table className="checkion-report__table">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} data-tone={row.tone}>
            <th scope="row">{row.label}</th>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ReportBand({
  id,
  title,
  formula,
  rows,
}: {
  id: string
  title: string
  formula?: string
  rows: Fact[]
}) {
  if (rows.length === 0) return null
  const tipId = tipIdForDetailBand(id)
  return (
    <section className="checkion-report__band" aria-labelledby={id}>
      <header className="checkion-report__band-head">
        <h3 id={id} className="checkion-report__band-title">
          {tipId ? <LabelWithTip tipId={tipId}>{title}</LabelWithTip> : title}
        </h3>
        {formula ? <p className="checkion-report__formula">{formula}</p> : null}
      </header>
      <ReportTable rows={rows} />
    </section>
  )
}

function ChipRow({ values }: { values: string[] }) {
  if (values.length === 0) return <span>—</span>
  return (
    <div className="checkion-chip-row checkion-chip-row--tight">
      {values.map((value) => (
        <Chip key={value} static size="sm">
          {value}
        </Chip>
      ))}
    </div>
  )
}

function pushIf(
  rows: Fact[],
  label: string,
  value: ReactNode | null | undefined,
  show: boolean = value != null && value !== '',
  tone?: MetricTone,
) {
  if (show) rows.push({ label, value: value ?? '—', tone })
}

function ScoreLedgerStrip({
  scores,
  overall,
  query,
}: {
  scores: ScoreCard[]
  overall?: number | null
  query: DetailSearchQuery
}) {
  const t = useT()
  const sorted = [...scores].sort((a, b) => a.value - b.value)
  const filtered = sorted.filter((score) =>
    scoreMatches(
      score.label,
      score.kind,
      score.value,
      scoreMetricTone(score.value),
      query,
    ),
  )
  if (filtered.length === 0) return null

  const worst = filtered[0]
  const best = filtered[filtered.length - 1]
  const span = worst && best ? Math.max(0, best.value - worst.value) : null

  return (
    <section className="checkion-report__ledger" aria-labelledby="detail-ledger-heading">
      <header className="checkion-report__band-head">
        <h3 id="detail-ledger-heading" className="checkion-report__band-title">
          <LabelWithTip tipId="detail.ledger">{t('results.detail.ledger')}</LabelWithTip>
        </h3>
        <p className="checkion-report__formula">{DETAIL_SCORE_FORMULAS.ledger}</p>
      </header>
      <table className="checkion-report__table checkion-report__table--ledger" aria-label={t('results.detail.scoreLedger')}>
        <thead>
          <tr>
            <th scope="col">{t('results.detail.colIndex')}</th>
            <th scope="col">{t('results.detail.colCategory')}</th>
            <th scope="col">{t('results.detail.colScore')}</th>
            <th scope="col">{t('results.detail.colMax')}</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((score, index) => (
            <tr key={score.kind} data-tone={scoreTone(score.value)}>
              <td className="checkion-report__idx">
                {String(index + 1).padStart(2, '0')}
              </td>
              <th scope="row">{score.label}</th>
              <td className="checkion-report__num">{score.value}</td>
              <td className="checkion-report__max">{score.max}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="checkion-report__range-line">
        <span className="checkion-report__range-label">{t('results.detail.range')}</span>
        <strong>{span ?? '—'}</strong>
        {worst && best
          ? ` · ${worst.label} ${worst.value} → ${best.label} ${best.value}`
          : t('results.detail.noScores')}
        {overall != null ? t('results.detail.overallLine', { score: overall }) : ''}
      </p>
    </section>
  )
}

/** Compact light-payload report — Chapter 03 Detail. */
export function ResultDetailPanel({ overview }: { overview: ScanOverview }) {
  const t = useT()
  const f = (key: string) => t(`results.detail.fields.${key}`)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const parsedQuery = useMemo(
    () => parseDetailQuery(deferredQuery),
    [deferredQuery],
  )

  const {
    scan,
    scores,
    performance,
    seo,
    ux,
    eco,
    links,
    securityPrivacy,
    freshness,
    generative,
    infra,
    classification,
    passedChecks,
    deviceSiblings,
    screenshotUrl,
  } = overview
  const overall = scan.overallScore
  const stats = scan.issueStats
  const cleared = passedChecks ?? []

  const scanRows: Fact[] = [
    { label: f('url'), value: scan.url },
    { label: f('status'), value: scan.status, tone: scanStatusTone(scan.status) },
    { label: f('mode'), value: scan.mode },
  ]
  pushIf(scanRows, f('device'), scan.device)
  pushIf(scanRows, f('standard'), scan.standard)
  pushIf(
    scanRows, f('runners'),
    scan.runners?.length ? <ChipRow values={scan.runners} /> : null,
    Boolean(scan.runners?.length),
  )
  pushIf(scanRows, f('duration'), fmtDuration(scan.durationMs), scan.durationMs != null)
  pushIf(scanRows, f('group'), scan.groupId)
  if (stats) {
    scanRows.push(
      {
        label: f('issues'),
        value: `${stats.total} · E ${stats.errors} / W ${stats.warnings} / N ${stats.notices}`,
        tone: issueStatsTone(stats.errors, stats.warnings),
      },
      { label: f('passed'), value: stats.passed, tone: stats.passed > 0 ? 'pos' : undefined },
    )
    if (stats.byWcagLevel) {
      const parts = (['A', 'AA', 'AAA'] as const)
        .map((lvl) => {
          const n = stats.byWcagLevel?.[lvl]
          return n != null ? `${lvl} ${n}` : null
        })
        .filter(Boolean) as string[]
      if (parts.length) {
        scanRows.push({
          label: f('wcagLevels'),
          value: parts.join(' · '),
          tone: issueStatsTone(stats.errors, stats.warnings),
        })
      }
    }
  }

  const perfRows: Fact[] = []
  if (performance) {
    perfRows.push(
      {
        label: f('ttfb'),
        value: msLabel(performance.ttfb),
        tone: timingTone(performance.ttfb, 200, 500),
      },
      {
        label: f('fcp'),
        value: msLabel(performance.fcp),
        tone: timingTone(performance.fcp, 1800, 3000),
      },
      {
        label: f('lcp'),
        value: msLabel(performance.lcp),
        tone: timingTone(performance.lcp, 2500, 4000),
      },
      {
        label: f('dom'),
        value: msLabel(performance.domLoad),
        tone: timingTone(performance.domLoad, 2000, 3500),
      },
      {
        label: f('load'),
        value: msLabel(performance.windowLoad),
        tone: timingTone(performance.windowLoad, 3000, 5000),
      },
    )
    pushIf(
      perfRows, f('inp'),
      performance.inp != null ? msLabel(performance.inp) : null,
      performance.inp != null,
      timingTone(performance.inp, 200, 500),
    )
    pushIf(perfRows, f('protocol'), performance.nextHopProtocol)
    pushIf(
      perfRows, f('scripts'),
      performance.scriptTransferKb != null ? `${performance.scriptTransferKb} KB` : null,
      performance.scriptTransferKb != null,
      scriptKbTone(performance.scriptTransferKb),
    )
  }

  const seoRows: Fact[] = []
  if (seo) {
    seoRows.push(
      {
        label: f('title'),
        value: seo.title ?? '—',
        tone: seo.title ? undefined : 'neg',
      },
      {
        label: f('meta'),
        value: seo.metaDescription ?? '—',
        tone: seo.metaDescription ? undefined : 'neg',
      },
      {
        label: f('h1'),
        value: seo.h1 ?? '—',
        tone: seo.h1 ? undefined : 'neg',
      },
      { label: f('titleLen'), value: seo.titleLength, tone: titleLenTone(seo.titleLength) },
      {
        label: f('metaLen'),
        value: seo.metaDescriptionLength,
        tone: metaLenTone(seo.metaDescriptionLength),
      },
      {
        label: f('canonical'),
        value: seo.canonical ?? '—',
        tone: seo.canonical ? 'pos' : 'neg',
      },
      {
        label: f('words'),
        value: seo.wordCount.toLocaleString(),
        tone: wordCountTone(seo.wordCount),
      },
      {
        label: f('signals'),
        value: (
          <ChipRow
            values={[
              seo.skinnyContent ? t('results.skinny') : t('results.dense'),
              seo.hasOpenGraph ? 'OG' : t('results.detail.noOg'),
              seo.hasJsonLd ? 'JSON-LD' : t('results.detail.noJsonLd'),
              seo.robots ?? t('results.detail.robotsDash'),
            ]}
          />
        ),
        tone: seo.skinnyContent
          ? 'neg'
          : seo.hasOpenGraph && seo.hasJsonLd
            ? 'pos'
            : 'low',
      },
    )
    pushIf(seoRows, f('ogTitle'), seo.ogTitle)
    pushIf(seoRows, f('ogDesc'), seo.ogDescription)
    pushIf(seoRows, f('ogImage'), seo.ogImage)
    pushIf(seoRows, f('twitter'), seo.twitterCard)
    pushIf(
      seoRows, f('robotsTxt'),
      seo.robotsTxtPresent == null ? null : yesNo(seo.robotsTxtPresent, t),
      seo.robotsTxtPresent != null,
      goodWhenTrue(seo.robotsTxtPresent),
    )
    pushIf(seoRows, f('sitemap'), seo.sitemapUrl, Boolean(seo.sitemapUrl), seo.sitemapUrl ? 'pos' : undefined)
    pushIf(
      seoRows, f('duplicateWarn'),
      seo.duplicateContentWarning == null ? null : yesNo(seo.duplicateContentWarning, t),
      seo.duplicateContentWarning != null,
      badWhenTrue(seo.duplicateContentWarning),
    )
    if (seo.structuredDataGaps?.length) {
      seoRows.push({
        label: f('schemaGaps'),
        value: seo.structuredDataGaps
          .map((g) => `${g.type}: ${g.missing.join(', ')}`)
          .join(' · '),
        tone: 'low',
      })
    }
    if (seo.topKeywords?.length) {
      seoRows.push({ label: f('keywords'), value: <ChipRow values={seo.topKeywords} /> })
    }
  }

  const uxRows: Fact[] = []
  if (ux) {
    uxRows.push(
      { label: f('score'), value: ux.score, tone: scoreMetricTone(ux.score) },
      { label: f('cls'), value: ux.cls, tone: clsTone(ux.cls) },
      {
        label: f('readability'),
        value: `${ux.readabilityGrade} · ${ux.readabilityScore}`,
        tone: clarityTone(ux.readabilityScore),
      },
      {
        label: f('mobile'),
        value: ux.mobileFriendly ? t('results.detail.friendly') : t('results.detail.mobileIssues'),
        tone: ux.mobileFriendly ? 'pos' : 'neg',
      },
      {
        label: f('tapTargets'),
        value: ux.tapTargetIssueCount,
        tone: countTone(ux.tapTargetIssueCount, 1, 3),
      },
      {
        label: f('skipLink'),
        value: yesNo(ux.hasSkipLink, t),
        tone: goodWhenTrue(ux.hasSkipLink),
      },
      {
        label: f('h1Count'),
        value: ux.headingH1Count,
        tone: h1CountTone(ux.headingH1Count),
      },
      {
        label: f('levels'),
        value: ux.skippedHeadingLevels ? t('results.detail.skipped') : t('results.detail.intact'),
        tone: ux.skippedHeadingLevels ? 'neg' : 'pos',
      },
      {
        label: f('brokenLinks'),
        value: ux.brokenLinkCount,
        tone: countTone(ux.brokenLinkCount, 1, 3),
      },
    )
    pushIf(uxRows, f('skipHref'), ux.skipLinkHref)
    pushIf(
      uxRows, f('dwellMedian'),
      ux.dwellSecondsMedian != null ? `${ux.dwellSecondsMedian} s` : null,
      ux.dwellSecondsMedian != null,
    )
    pushIf(
      uxRows, f('dwellConf'),
      ux.dwellConfidence,
      Boolean(ux.dwellConfidence),
      confidenceTone(ux.dwellConfidence),
    )
    pushIf(
      uxRows, f('preloadHints'),
      ux.resourceHintPreloadCount,
      ux.resourceHintPreloadCount != null,
    )
    pushIf(
      uxRows, f('preconnect'),
      ux.resourceHintPreconnectCount,
      ux.resourceHintPreconnectCount != null,
    )
    pushIf(
      uxRows, f('reducedMotion'),
      ux.reducedMotionInCss == null ? null : yesNo(ux.reducedMotionInCss, t),
      ux.reducedMotionInCss != null,
      goodWhenTrue(ux.reducedMotionInCss),
    )
    pushIf(
      uxRows, f('focusVisibleFails'),
      ux.focusVisibleFailCount,
      ux.focusVisibleFailCount != null,
      countTone(ux.focusVisibleFailCount, 1, 3),
    )
    pushIf(
      uxRows, f('longTasks'),
      ux.longTaskCount,
      ux.longTaskCount != null,
      countTone(ux.longTaskCount, 1, 5),
    )
    pushIf(
      uxRows, f('longTaskMax'),
      ux.longTaskMaxMs != null ? msLabel(ux.longTaskMaxMs) : null,
      ux.longTaskMaxMs != null,
      timingTone(ux.longTaskMaxMs, 50, 100),
    )
    pushIf(
      uxRows, f('formAutocomplete'),
      ux.formMissingAutocomplete,
      ux.formMissingAutocomplete != null,
      countTone(ux.formMissingAutocomplete, 1, 3),
    )
    pushIf(
      uxRows, f('formInputType'),
      ux.formSuspiciousInputType,
      ux.formSuspiciousInputType != null,
      countTone(ux.formSuspiciousInputType, 1, 3),
    )
    pushIf(
      uxRows, f('videosNoCaptions'),
      ux.videosWithoutCaptions,
      ux.videosWithoutCaptions != null,
      countTone(ux.videosWithoutCaptions, 1, 2),
    )
    pushIf(
      uxRows, f('audioNoTranscript'),
      ux.audiosWithoutTranscript,
      ux.audiosWithoutTranscript != null,
      countTone(ux.audiosWithoutTranscript, 1, 2),
    )
    pushIf(
      uxRows, f('imgDimensions'),
      ux.imageMissingDimensions,
      ux.imageMissingDimensions != null,
      countTone(ux.imageMissingDimensions, 1, 5),
    )
    pushIf(
      uxRows, f('imgLazy'),
      ux.imageMissingLazy,
      ux.imageMissingLazy != null,
      countTone(ux.imageMissingLazy, 1, 5),
    )
    pushIf(
      uxRows, f('imgSrcset'),
      ux.imageMissingSrcset,
      ux.imageMissingSrcset != null,
      countTone(ux.imageMissingSrcset, 1, 5),
    )
    pushIf(
      uxRows, f('metaRefresh'),
      ux.metaRefreshPresent == null ? null : yesNo(ux.metaRefreshPresent, t),
      ux.metaRefreshPresent != null,
      badWhenTrue(ux.metaRefreshPresent),
    )
    pushIf(
      uxRows, f('fontDisplay'),
      ux.fontDisplayIssueCount,
      ux.fontDisplayIssueCount != null,
      countTone(ux.fontDisplayIssueCount, 1, 3),
    )
    if (ux.skippedHeadingPairs?.length) {
      uxRows.push({
        label: f('skipPairs'),
        value: ux.skippedHeadingPairs.join(' · '),
        tone: 'neg',
      })
    }
  }

  const ecoRows: Fact[] = []
  if (eco) {
    ecoRows.push(
      { label: f('grade'), value: eco.grade, tone: ecoGradeTone(eco.grade) },
      { label: f('co2'), value: `${eco.co2} g`, tone: co2Tone(eco.co2) },
      {
        label: f('weight'),
        value: `${eco.pageWeightKb} KB`,
        tone: pageWeightTone(eco.pageWeightKb),
      },
      {
        label: f('greenHost'),
        value:
          eco.greenWebHosted == null ? t('results.detail.unknown') : yesNo(eco.greenWebHosted, t),
        tone: eco.greenWebHosted == null ? undefined : goodWhenTrue(eco.greenWebHosted),
      },
    )
    pushIf(ecoRows, f('greenChecked'), eco.greenWebCheckedAt)
    pushIf(ecoRows, f('greenSource'), eco.greenWebSource)
    pushIf(
      ecoRows, f('cleanerThan'),
      eco.cleanerThanPercent != null ? `${eco.cleanerThanPercent}%` : null,
      eco.cleanerThanPercent != null,
      cleanerThanTone(eco.cleanerThanPercent),
    )
  }

  const linkRows: Fact[] = []
  if (links) {
    pushIf(linkRows, f('total'), links.total, links.total != null)
    linkRows.push(
      { label: f('broken'), value: links.broken, tone: countTone(links.broken, 1, 3) },
      { label: f('internal'), value: links.internal },
      { label: f('external'), value: links.external },
      {
        label: f('noNoopener'),
        value: links.missingNoopener,
        tone: countTone(links.missingNoopener, 1, 5),
      },
    )
    pushIf(linkRows, f('pdfs'), links.pdfLinkCount, links.pdfLinkCount != null)
    if (links.brokenSamples?.length) {
      linkRows.push({
        label: f('brokenSample'),
        value: links.brokenSamples
          .map((s) => `${s.status ?? '?'} ${s.url}`)
          .join(' · '),
        tone: 'neg',
      })
    }
    if (links.noopenerSamples?.length) {
      linkRows.push({
        label: f('noopenerSample'),
        value: links.noopenerSamples.map((s) => s.url).join(' · '),
        tone: 'low',
      })
    }
  }

  const shieldRows: Fact[] = []
  if (securityPrivacy) {
    shieldRows.push(
      { label: f('https'), value: yesNo(securityPrivacy.https, t), tone: goodWhenTrue(securityPrivacy.https) },
      { label: f('hsts'), value: yesNo(securityPrivacy.hsts, t), tone: goodWhenTrue(securityPrivacy.hsts) },
      { label: f('csp'), value: yesNo(securityPrivacy.csp, t), tone: goodWhenTrue(securityPrivacy.csp) },
      {
        label: f('privacy'),
        value: yesNo(securityPrivacy.hasPrivacyPolicy, t),
        tone: goodWhenTrue(securityPrivacy.hasPrivacyPolicy),
      },
      {
        label: f('cookies'),
        value: yesNo(securityPrivacy.hasCookieBanner, t),
        tone: goodWhenTrue(securityPrivacy.hasCookieBanner),
      },
      {
        label: f('mixed'),
        value: securityPrivacy.mixedContent ? t('results.detail.yes') : t('results.detail.none'),
        tone: badWhenTrue(securityPrivacy.mixedContent),
      },
    )
    pushIf(
      shieldRows, f('xFrame'),
      securityPrivacy.xFrameOptions == null
        ? null
        : yesNo(securityPrivacy.xFrameOptions, t),
      securityPrivacy.xFrameOptions != null,
      goodWhenTrue(securityPrivacy.xFrameOptions),
    )
    pushIf(
      shieldRows, f('xContentType'),
      securityPrivacy.xContentTypeOptions == null
        ? null
        : yesNo(securityPrivacy.xContentTypeOptions, t),
      securityPrivacy.xContentTypeOptions != null,
      goodWhenTrue(securityPrivacy.xContentTypeOptions),
    )
    pushIf(
      shieldRows, f('referrerPolicy'),
      securityPrivacy.referrerPolicy == null
        ? null
        : yesNo(securityPrivacy.referrerPolicy, t),
      securityPrivacy.referrerPolicy != null,
      goodWhenTrue(securityPrivacy.referrerPolicy),
    )
    pushIf(
      shieldRows, f('permissionsPolicy'),
      securityPrivacy.permissionsPolicy == null
        ? null
        : yesNo(securityPrivacy.permissionsPolicy, t),
      securityPrivacy.permissionsPolicy != null,
      goodWhenTrue(securityPrivacy.permissionsPolicy),
    )
    pushIf(
      shieldRows, f('mixedCount'),
      securityPrivacy.mixedContentCount,
      securityPrivacy.mixedContentCount != null,
      countTone(securityPrivacy.mixedContentCount, 1, 3),
    )
    pushIf(
      shieldRows, f('sriMissing'),
      securityPrivacy.sriMissingCount,
      securityPrivacy.sriMissingCount != null,
      countTone(securityPrivacy.sriMissingCount, 1, 5),
    )
    pushIf(
      shieldRows, f('cookieWarns'),
      securityPrivacy.cookieWarningCount,
      securityPrivacy.cookieWarningCount != null,
      countTone(securityPrivacy.cookieWarningCount, 1, 3),
    )
    pushIf(shieldRows, f('privacyUrl'), securityPrivacy.privacyPolicyUrl)
    pushIf(
      shieldRows, f('tos'),
      securityPrivacy.hasTermsOfService == null
        ? null
        : yesNo(securityPrivacy.hasTermsOfService, t),
      securityPrivacy.hasTermsOfService != null,
      goodWhenTrue(securityPrivacy.hasTermsOfService),
    )
    if (securityPrivacy.cmpHints?.length) {
      shieldRows.push({
        label: f('cmpHints'),
        value: <ChipRow values={securityPrivacy.cmpHints} />,
      })
    }
  }

  const freshnessRows: Fact[] = []
  if (freshness) {
    freshnessRows.push(
      {
        label: f('age'),
        value: freshness.ageDays == null ? '—' : t('results.detail.days', { n: freshness.ageDays }),
        tone: freshnessAgeTone(freshness.ageDays),
      },
      {
        label: f('confidence'),
        value: freshness.confidence,
        tone: confidenceTone(freshness.confidence),
      },
      { label: f('source'), value: freshness.source ?? '—' },
    )
    pushIf(freshnessRows, f('bestAsOf'), freshness.bestAsOfIso)
    if (freshness.sources?.length) {
      freshnessRows.push({
        label: f('sources'),
        value: <ChipRow values={freshness.sources} />,
      })
    }
  }

  const geoRows: Fact[] = []
  if (generative) {
    geoRows.push(
      { label: f('score'), value: generative.score, tone: scoreMetricTone(generative.score) },
      {
        label: f('discover'),
        value: generative.discoverability,
        tone: scoreMetricTone(generative.discoverability),
      },
      {
        label: f('repurpose'),
        value: generative.repurposing,
        tone: scoreMetricTone(generative.repurposing),
      },
      {
        label: f('presence'),
        value: (
          <ChipRow
            values={[
              generative.hasFaqSchema ? t('results.detail.faqSchema') : t('results.detail.noFaq'),
              generative.hasLlmsTxt ? t('results.detail.llmsTxt') : t('results.detail.noLlmsTxt'),
              ...(generative.hasHowToSchema != null
                ? [generative.hasHowToSchema ? t('results.detail.howTo') : t('results.detail.noHowTo')]
                : []),
              ...(generative.hasBreadcrumb != null
                ? [generative.hasBreadcrumb ? t('results.detail.breadcrumb') : t('results.detail.noBreadcrumb')]
                : []),
              ...(generative.hasOrganizationTrust != null
                ? [generative.hasOrganizationTrust ? t('results.detail.orgTrust') : t('results.detail.noOrgTrust')]
                : []),
            ]}
          />
        ),
        tone:
          generative.hasFaqSchema || generative.hasLlmsTxt
            ? 'pos'
            : 'low',
      },
    )
    if (generative.schemaCoverage?.length) {
      geoRows.push({
        label: f('schemas'),
        value: <ChipRow values={generative.schemaCoverage} />,
        tone: 'pos',
      })
    }
    if (generative.llmsTxtSections?.length) {
      geoRows.push({
        label: f('llmsSections'),
        value: <ChipRow values={generative.llmsTxtSections} />,
        tone: 'pos',
      })
    }
    if (generative.aiBotsBlocked?.length) {
      geoRows.push({
        label: f('botsBlocked'),
        value: <ChipRow values={generative.aiBotsBlocked} />,
        tone: 'low',
      })
    }
    pushIf(geoRows, f('faqEntities'), generative.faqEntityCount, generative.faqEntityCount != null)
    pushIf(geoRows, f('tables'), generative.tableCount, generative.tableCount != null)
    pushIf(
      geoRows, f('citations'),
      generative.citationDensity,
      generative.citationDensity != null,
    )
    pushIf(
      geoRows, f('authorBio'),
      generative.hasAuthorBio == null ? null : yesNo(generative.hasAuthorBio, t),
      generative.hasAuthorBio != null,
      goodWhenTrue(generative.hasAuthorBio),
    )
    pushIf(
      geoRows, f('ymyl'),
      generative.isYmyl == null
        ? null
        : `${yesNo(generative.isYmyl, t)}${generative.ymylConfidence ? ` · ${generative.ymylConfidence}` : ''}`,
      generative.isYmyl != null,
    )
  }

  const infraRows: Fact[] = []
  if (infra) {
    pushIf(infraRows, f('ip'), infra.serverIp)
    pushIf(
      infraRows, f('location'),
      [infra.city, infra.country].filter(Boolean).join(', ') || null,
      Boolean(infra.city || infra.country),
    )
    pushIf(infraRows, f('cdn'), infra.cdnProvider)
    pushIf(infraRows, f('htmlLang'), infra.htmlLang)
    pushIf(infraRows, f('hreflang'), infra.hreflangCount, infra.hreflangCount != null)
    if (infra.platforms?.length) {
      infraRows.push({ label: f('platforms'), value: <ChipRow values={infra.platforms} /> })
    }
    if (infra.tracking?.length) {
      infraRows.push({ label: f('tracking'), value: <ChipRow values={infra.tracking} /> })
    }
    pushIf(infraRows, f('server'), infra.hostingServer)
    pushIf(infraRows, f('poweredBy'), infra.hostingPoweredBy)
  }

  const classRows: Fact[] = []
  if (classification) {
    classRows.push(
      { label: f('summary'), value: classification.shortSummary },
      { label: f('tags'), value: <ChipRow values={classification.tags} /> },
      {
        label: f('intensity'),
        value: `${intensityLabel(classification.intensityTier, t)} · ${classification.intensityTier}`,
      },
    )
    if (classification.tagTiers?.length) {
      classRows.push({
        label: f('tagTiers'),
        value: classification.tagTiers.map((t) => `${t.tag}·${t.tier}`).join(' · '),
      })
    }
  }
  if (deviceSiblings?.length) {
    const siblingScores = deviceSiblings
      .map((s) => s.overallScore)
      .filter((v): v is number => v != null)
    classRows.push({
      label: f('devices'),
      value: deviceSiblings
        .map(
          (sib) =>
            `${sib.device} ${sib.overallScore == null ? '—' : sib.overallScore}`,
        )
        .join(' · '),
      tone:
        siblingScores.length > 0
          ? scoreMetricTone(Math.min(...siblingScores))
          : undefined,
    })
  }

  const clearedRows: Fact[] = cleared.map((c) => ({
    label: c.id,
    value: (
      <span className="checkion-report__cleared">
        <span>{c.description}</span>
        {c.help ? <span className="checkion-report__help">{c.help}</span> : null}
      </span>
    ),
  }))

  const bands: Array<{
    id: string
    title: string
    aliases: string[]
    rows: Fact[]
  }> = [
    {
      id: 'report-scan',
      title: t('results.detail.bands.scan'),
      aliases: ['run', 'meta', 'wcag', 'status', 'device', 'issues', 'scan'],
      rows: scanRows,
    },
    {
      id: 'report-performance',
      title: t('results.detail.bands.performance'),
      aliases: ['cwv', 'vitals', 'speed', 'lcp', 'fcp', 'ttfb', 'inp', 'load', 'performance'],
      rows: perfRows,
    },
    {
      id: 'report-seo',
      title: t('results.detail.bands.seo'),
      aliases: ['title', 'meta', 'canonical', 'og', 'schema', 'keywords', 'seo'],
      rows: seoRows,
    },
    {
      id: 'report-ux',
      title: t('results.detail.bands.ux'),
      aliases: ['cls', 'readability', 'cefr', 'mobile', 'heading', 'a11y', 'ux'],
      rows: uxRows,
    },
    {
      id: 'report-eco',
      title: t('results.detail.bands.eco'),
      aliases: ['co2', 'carbon', 'green', 'weight', 'eco'],
      rows: ecoRows,
    },
    {
      id: 'report-links',
      title: t('results.detail.bands.links'),
      aliases: ['broken', 'noopener', 'internal', 'external', 'links'],
      rows: linkRows,
    },
    {
      id: 'report-shield',
      title: t('results.detail.bands.shield'),
      aliases: ['security', 'privacy', 'https', 'hsts', 'csp', 'cookies', 'shield'],
      rows: shieldRows,
    },
    {
      id: 'report-freshness',
      title: t('results.detail.bands.freshness'),
      aliases: ['age', 'stale', 'fresh', 'freshness'],
      rows: freshnessRows,
    },
    {
      id: 'report-geo',
      title: t('results.detail.bands.geo'),
      aliases: ['generative', 'ai', 'llm', 'faq', 'schema', 'geo'],
      rows: geoRows,
    },
    {
      id: 'report-infra',
      title: t('results.detail.bands.infra'),
      aliases: ['hosting', 'cdn', 'ip', 'platform', 'tracking', 'infra'],
      rows: infraRows,
    },
    {
      id: 'report-class',
      title: t('results.detail.bands.class'),
      aliases: ['intensity', 'tags', 'devices', 'siblings', 'class'],
      rows: classRows,
    },
    {
      id: 'report-cleared',
      title: t('results.detail.bands.cleared'),
      aliases: ['passed', 'clean', 'cleared'],
      rows: clearedRows,
    },
  ]

  const filteredBands = bands
    .map((band) => {
      const rows = filterFacts(band.rows, parsedQuery, band.title, band.aliases)
      if (
        !bandVisible(band.title, band.aliases, rows, band.rows, parsedQuery) ||
        rows.length === 0
      ) {
        return null
      }
      return { id: band.id, title: band.title, rows }
    })
    .filter((b): b is { id: string; title: string; rows: Fact[] } => b != null)

  const ledgerVisible = (() => {
    if (!parsedQuery.raw) return scores.length > 0
    return scores.some((score) =>
      scoreMatches(
        score.label,
        score.kind,
        score.value,
        scoreMetricTone(score.value),
        parsedQuery,
      ),
    )
  })()

  const hasResults = ledgerVisible || filteredBands.length > 0

  return (
    <div className="checkion-magazine-body checkion-spread checkion-report">
      <header className="checkion-report__head">
        <p className="checkion-spread__eyebrow">{t('results.detail.eyebrow')}</p>
        <h3 id="detail-chapter" className="checkion-report__title">
          {t('results.detail.title')}
        </h3>
      </header>

      <div className="checkion-report__search">
        <label className="checkion-report__search-label" htmlFor="detail-report-search">
          {t('results.detail.searchLabel')}
        </label>
        <Input
          id="detail-report-search"
          type="search"
          block
          size="md"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('results.detail.searchPlaceholder')}
          autoComplete="off"
          spellCheck={false}
        />
        {parsedQuery.raw ? (
          <p className="checkion-report__search-meta" aria-live="polite">
            {hasResults
              ? t('results.detail.showingMatches', { query: query.trim() })
              : t('results.detail.noMatchesQuery', { query: query.trim() })}
          </p>
        ) : (
          <p className="checkion-report__search-meta">
            {t('results.detail.searchHint')}
          </p>
        )}
      </div>

      {screenshotUrl && !parsedQuery.raw ? (
        <figure className="checkion-report__shot">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={screenshotUrl} alt={t('results.detail.scanCapture')} />
        </figure>
      ) : null}

      {!hasResults ? (
        <EmptyState>{t('results.detail.emptySearch')}</EmptyState>
      ) : (
        <>
          <ScoreLedgerStrip scores={scores} overall={overall} query={parsedQuery} />
          {filteredBands.map((band) => (
            <ReportBand
              key={band.id}
              id={band.id}
              title={band.title}
              formula={formulaForBand(band.id)}
              rows={band.rows}
            />
          ))}
        </>
      )}
    </div>
  )
}
