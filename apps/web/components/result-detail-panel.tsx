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
import { scoreTone } from '../lib/scan-display'

function msLabel(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)} s`
  }
  return `${Math.round(value)} ms`
}

function yesNo(value: boolean): string {
  return value ? 'Yes' : 'No'
}

function intensityLabel(tier: number): string {
  if (tier <= 1) return 'Light'
  if (tier === 2) return 'Moderate'
  if (tier === 3) return 'Dense'
  if (tier === 4) return 'Heavy'
  return 'Extreme'
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
  return (
    <section className="checkion-report__band" aria-labelledby={id}>
      <header className="checkion-report__band-head">
        <h3 id={id} className="checkion-report__band-title">
          {title}
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
  const sorted = [...scores].sort((a, b) => a.value - b.value)
  const filtered = sorted.filter((score) => {
    const tone = scoreTone(score.value)
    return scoreMatches(
      score.label,
      score.kind,
      score.value,
      tone === 'default' ? undefined : tone,
      query,
    )
  })
  if (filtered.length === 0) return null

  const worst = filtered[0]
  const best = filtered[filtered.length - 1]
  const span = worst && best ? Math.max(0, best.value - worst.value) : null

  return (
    <section className="checkion-report__ledger" aria-labelledby="detail-ledger-heading">
      <header className="checkion-report__band-head">
        <h3 id="detail-ledger-heading" className="checkion-report__band-title">
          Ledger
        </h3>
        <p className="checkion-report__formula">{DETAIL_SCORE_FORMULAS.ledger}</p>
      </header>
      <table className="checkion-report__table checkion-report__table--ledger" aria-label="Score ledger">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Category</th>
            <th scope="col">Score</th>
            <th scope="col">Max</th>
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
        <span className="checkion-report__range-label">Range</span>
        <strong>{span ?? '—'}</strong>
        {worst && best
          ? ` · ${worst.label} ${worst.value} → ${best.label} ${best.value}`
          : ' · no scores'}
        {overall != null ? ` · overall ${overall}` : ''}
      </p>
    </section>
  )
}

/** Compact light-payload report — Chapter 03 Detail. */
export function ResultDetailPanel({ overview }: { overview: ScanOverview }) {
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
    { label: 'URL', value: scan.url },
    { label: 'Status', value: scan.status, tone: scanStatusTone(scan.status) },
    { label: 'Mode', value: scan.mode },
  ]
  pushIf(scanRows, 'Device', scan.device)
  pushIf(scanRows, 'Standard', scan.standard)
  pushIf(
    scanRows,
    'Runners',
    scan.runners?.length ? <ChipRow values={scan.runners} /> : null,
    Boolean(scan.runners?.length),
  )
  pushIf(scanRows, 'Duration', fmtDuration(scan.durationMs), scan.durationMs != null)
  pushIf(scanRows, 'Group', scan.groupId)
  if (stats) {
    scanRows.push(
      {
        label: 'Issues',
        value: `${stats.total} · E ${stats.errors} / W ${stats.warnings} / N ${stats.notices}`,
        tone: issueStatsTone(stats.errors, stats.warnings),
      },
      { label: 'Passed', value: stats.passed, tone: stats.passed > 0 ? 'pos' : undefined },
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
          label: 'WCAG levels',
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
        label: 'TTFB',
        value: msLabel(performance.ttfb),
        tone: timingTone(performance.ttfb, 200, 500),
      },
      {
        label: 'FCP',
        value: msLabel(performance.fcp),
        tone: timingTone(performance.fcp, 1800, 3000),
      },
      {
        label: 'LCP',
        value: msLabel(performance.lcp),
        tone: timingTone(performance.lcp, 2500, 4000),
      },
      {
        label: 'DOM',
        value: msLabel(performance.domLoad),
        tone: timingTone(performance.domLoad, 2000, 3500),
      },
      {
        label: 'Load',
        value: msLabel(performance.windowLoad),
        tone: timingTone(performance.windowLoad, 3000, 5000),
      },
    )
    pushIf(
      perfRows,
      'INP',
      performance.inp != null ? msLabel(performance.inp) : null,
      performance.inp != null,
      timingTone(performance.inp, 200, 500),
    )
    pushIf(perfRows, 'Protocol', performance.nextHopProtocol)
    pushIf(
      perfRows,
      'Scripts',
      performance.scriptTransferKb != null ? `${performance.scriptTransferKb} KB` : null,
      performance.scriptTransferKb != null,
      scriptKbTone(performance.scriptTransferKb),
    )
  }

  const seoRows: Fact[] = []
  if (seo) {
    seoRows.push(
      {
        label: 'Title',
        value: seo.title ?? '—',
        tone: seo.title ? undefined : 'neg',
      },
      {
        label: 'Meta',
        value: seo.metaDescription ?? '—',
        tone: seo.metaDescription ? undefined : 'neg',
      },
      {
        label: 'H1',
        value: seo.h1 ?? '—',
        tone: seo.h1 ? undefined : 'neg',
      },
      { label: 'Title len', value: seo.titleLength, tone: titleLenTone(seo.titleLength) },
      {
        label: 'Meta len',
        value: seo.metaDescriptionLength,
        tone: metaLenTone(seo.metaDescriptionLength),
      },
      {
        label: 'Canonical',
        value: seo.canonical ?? '—',
        tone: seo.canonical ? 'pos' : 'neg',
      },
      {
        label: 'Words',
        value: seo.wordCount.toLocaleString('en'),
        tone: wordCountTone(seo.wordCount),
      },
      {
        label: 'Signals',
        value: (
          <ChipRow
            values={[
              seo.skinnyContent ? 'Skinny' : 'Dense',
              seo.hasOpenGraph ? 'OG' : 'No OG',
              seo.hasJsonLd ? 'JSON-LD' : 'No JSON-LD',
              seo.robots ?? 'robots —',
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
    pushIf(seoRows, 'OG title', seo.ogTitle)
    pushIf(seoRows, 'OG desc', seo.ogDescription)
    pushIf(seoRows, 'OG image', seo.ogImage)
    pushIf(seoRows, 'Twitter', seo.twitterCard)
    pushIf(
      seoRows,
      'robots.txt',
      seo.robotsTxtPresent == null ? null : yesNo(seo.robotsTxtPresent),
      seo.robotsTxtPresent != null,
      goodWhenTrue(seo.robotsTxtPresent),
    )
    pushIf(seoRows, 'Sitemap', seo.sitemapUrl, Boolean(seo.sitemapUrl), seo.sitemapUrl ? 'pos' : undefined)
    pushIf(
      seoRows,
      'Duplicate warn',
      seo.duplicateContentWarning == null ? null : yesNo(seo.duplicateContentWarning),
      seo.duplicateContentWarning != null,
      badWhenTrue(seo.duplicateContentWarning),
    )
    if (seo.structuredDataGaps?.length) {
      seoRows.push({
        label: 'Schema gaps',
        value: seo.structuredDataGaps
          .map((g) => `${g.type}: ${g.missing.join(', ')}`)
          .join(' · '),
        tone: 'low',
      })
    }
    if (seo.topKeywords?.length) {
      seoRows.push({ label: 'Keywords', value: <ChipRow values={seo.topKeywords} /> })
    }
  }

  const uxRows: Fact[] = []
  if (ux) {
    uxRows.push(
      { label: 'Score', value: ux.score, tone: scoreMetricTone(ux.score) },
      { label: 'CLS', value: ux.cls, tone: clsTone(ux.cls) },
      {
        label: 'Readability',
        value: `${ux.readabilityGrade} · ${ux.readabilityScore}`,
        tone: clarityTone(ux.readabilityScore),
      },
      {
        label: 'Mobile',
        value: ux.mobileFriendly ? 'Friendly' : 'Issues',
        tone: ux.mobileFriendly ? 'pos' : 'neg',
      },
      {
        label: 'Tap targets',
        value: ux.tapTargetIssueCount,
        tone: countTone(ux.tapTargetIssueCount, 1, 3),
      },
      {
        label: 'Skip link',
        value: yesNo(ux.hasSkipLink),
        tone: goodWhenTrue(ux.hasSkipLink),
      },
      {
        label: 'H1 count',
        value: ux.headingH1Count,
        tone: h1CountTone(ux.headingH1Count),
      },
      {
        label: 'Levels',
        value: ux.skippedHeadingLevels ? 'Skipped' : 'Intact',
        tone: ux.skippedHeadingLevels ? 'neg' : 'pos',
      },
      {
        label: 'Broken links',
        value: ux.brokenLinkCount,
        tone: countTone(ux.brokenLinkCount, 1, 3),
      },
    )
    pushIf(uxRows, 'Skip href', ux.skipLinkHref)
    pushIf(
      uxRows,
      'Dwell median',
      ux.dwellSecondsMedian != null ? `${ux.dwellSecondsMedian} s` : null,
      ux.dwellSecondsMedian != null,
    )
    pushIf(
      uxRows,
      'Dwell conf.',
      ux.dwellConfidence,
      Boolean(ux.dwellConfidence),
      confidenceTone(ux.dwellConfidence),
    )
    pushIf(
      uxRows,
      'Preload hints',
      ux.resourceHintPreloadCount,
      ux.resourceHintPreloadCount != null,
    )
    pushIf(
      uxRows,
      'Preconnect',
      ux.resourceHintPreconnectCount,
      ux.resourceHintPreconnectCount != null,
    )
    pushIf(
      uxRows,
      'Reduced motion',
      ux.reducedMotionInCss == null ? null : yesNo(ux.reducedMotionInCss),
      ux.reducedMotionInCss != null,
      goodWhenTrue(ux.reducedMotionInCss),
    )
    pushIf(
      uxRows,
      'Focus-visible fails',
      ux.focusVisibleFailCount,
      ux.focusVisibleFailCount != null,
      countTone(ux.focusVisibleFailCount, 1, 3),
    )
    pushIf(
      uxRows,
      'Long tasks',
      ux.longTaskCount,
      ux.longTaskCount != null,
      countTone(ux.longTaskCount, 1, 5),
    )
    pushIf(
      uxRows,
      'Long-task max',
      ux.longTaskMaxMs != null ? msLabel(ux.longTaskMaxMs) : null,
      ux.longTaskMaxMs != null,
      timingTone(ux.longTaskMaxMs, 50, 100),
    )
    pushIf(
      uxRows,
      'Form autocomplete',
      ux.formMissingAutocomplete,
      ux.formMissingAutocomplete != null,
      countTone(ux.formMissingAutocomplete, 1, 3),
    )
    pushIf(
      uxRows,
      'Form input type',
      ux.formSuspiciousInputType,
      ux.formSuspiciousInputType != null,
      countTone(ux.formSuspiciousInputType, 1, 3),
    )
    pushIf(
      uxRows,
      'Videos w/o captions',
      ux.videosWithoutCaptions,
      ux.videosWithoutCaptions != null,
      countTone(ux.videosWithoutCaptions, 1, 2),
    )
    pushIf(
      uxRows,
      'Audio w/o transcript',
      ux.audiosWithoutTranscript,
      ux.audiosWithoutTranscript != null,
      countTone(ux.audiosWithoutTranscript, 1, 2),
    )
    pushIf(
      uxRows,
      'Img dimensions',
      ux.imageMissingDimensions,
      ux.imageMissingDimensions != null,
      countTone(ux.imageMissingDimensions, 1, 5),
    )
    pushIf(
      uxRows,
      'Img lazy',
      ux.imageMissingLazy,
      ux.imageMissingLazy != null,
      countTone(ux.imageMissingLazy, 1, 5),
    )
    pushIf(
      uxRows,
      'Img srcset',
      ux.imageMissingSrcset,
      ux.imageMissingSrcset != null,
      countTone(ux.imageMissingSrcset, 1, 5),
    )
    pushIf(
      uxRows,
      'Meta refresh',
      ux.metaRefreshPresent == null ? null : yesNo(ux.metaRefreshPresent),
      ux.metaRefreshPresent != null,
      badWhenTrue(ux.metaRefreshPresent),
    )
    pushIf(
      uxRows,
      'font-display',
      ux.fontDisplayIssueCount,
      ux.fontDisplayIssueCount != null,
      countTone(ux.fontDisplayIssueCount, 1, 3),
    )
    if (ux.skippedHeadingPairs?.length) {
      uxRows.push({
        label: 'Skip pairs',
        value: ux.skippedHeadingPairs.join(' · '),
        tone: 'neg',
      })
    }
  }

  const ecoRows: Fact[] = []
  if (eco) {
    ecoRows.push(
      { label: 'Grade', value: eco.grade, tone: ecoGradeTone(eco.grade) },
      { label: 'CO₂', value: `${eco.co2} g`, tone: co2Tone(eco.co2) },
      {
        label: 'Weight',
        value: `${eco.pageWeightKb} KB`,
        tone: pageWeightTone(eco.pageWeightKb),
      },
      {
        label: 'Green host',
        value:
          eco.greenWebHosted == null ? 'Unknown' : yesNo(eco.greenWebHosted),
        tone: eco.greenWebHosted == null ? undefined : goodWhenTrue(eco.greenWebHosted),
      },
    )
    pushIf(ecoRows, 'Green checked', eco.greenWebCheckedAt)
    pushIf(ecoRows, 'Green source', eco.greenWebSource)
    pushIf(
      ecoRows,
      'Cleaner than',
      eco.cleanerThanPercent != null ? `${eco.cleanerThanPercent}%` : null,
      eco.cleanerThanPercent != null,
      cleanerThanTone(eco.cleanerThanPercent),
    )
  }

  const linkRows: Fact[] = []
  if (links) {
    pushIf(linkRows, 'Total', links.total, links.total != null)
    linkRows.push(
      { label: 'Broken', value: links.broken, tone: countTone(links.broken, 1, 3) },
      { label: 'Internal', value: links.internal },
      { label: 'External', value: links.external },
      {
        label: 'No noopener',
        value: links.missingNoopener,
        tone: countTone(links.missingNoopener, 1, 5),
      },
    )
    pushIf(linkRows, 'PDFs', links.pdfLinkCount, links.pdfLinkCount != null)
    if (links.brokenSamples?.length) {
      linkRows.push({
        label: 'Broken sample',
        value: links.brokenSamples
          .map((s) => `${s.status ?? '?'} ${s.url}`)
          .join(' · '),
        tone: 'neg',
      })
    }
    if (links.noopenerSamples?.length) {
      linkRows.push({
        label: 'Noopener sample',
        value: links.noopenerSamples.map((s) => s.url).join(' · '),
        tone: 'low',
      })
    }
  }

  const shieldRows: Fact[] = []
  if (securityPrivacy) {
    shieldRows.push(
      { label: 'HTTPS', value: yesNo(securityPrivacy.https), tone: goodWhenTrue(securityPrivacy.https) },
      { label: 'HSTS', value: yesNo(securityPrivacy.hsts), tone: goodWhenTrue(securityPrivacy.hsts) },
      { label: 'CSP', value: yesNo(securityPrivacy.csp), tone: goodWhenTrue(securityPrivacy.csp) },
      {
        label: 'Privacy',
        value: yesNo(securityPrivacy.hasPrivacyPolicy),
        tone: goodWhenTrue(securityPrivacy.hasPrivacyPolicy),
      },
      {
        label: 'Cookies',
        value: yesNo(securityPrivacy.hasCookieBanner),
        tone: goodWhenTrue(securityPrivacy.hasCookieBanner),
      },
      {
        label: 'Mixed',
        value: securityPrivacy.mixedContent ? 'Yes' : 'None',
        tone: badWhenTrue(securityPrivacy.mixedContent),
      },
    )
    pushIf(
      shieldRows,
      'X-Frame',
      securityPrivacy.xFrameOptions == null
        ? null
        : yesNo(securityPrivacy.xFrameOptions),
      securityPrivacy.xFrameOptions != null,
      goodWhenTrue(securityPrivacy.xFrameOptions),
    )
    pushIf(
      shieldRows,
      'X-Content-Type',
      securityPrivacy.xContentTypeOptions == null
        ? null
        : yesNo(securityPrivacy.xContentTypeOptions),
      securityPrivacy.xContentTypeOptions != null,
      goodWhenTrue(securityPrivacy.xContentTypeOptions),
    )
    pushIf(
      shieldRows,
      'Referrer-Policy',
      securityPrivacy.referrerPolicy == null
        ? null
        : yesNo(securityPrivacy.referrerPolicy),
      securityPrivacy.referrerPolicy != null,
      goodWhenTrue(securityPrivacy.referrerPolicy),
    )
    pushIf(
      shieldRows,
      'Permissions-Policy',
      securityPrivacy.permissionsPolicy == null
        ? null
        : yesNo(securityPrivacy.permissionsPolicy),
      securityPrivacy.permissionsPolicy != null,
      goodWhenTrue(securityPrivacy.permissionsPolicy),
    )
    pushIf(
      shieldRows,
      'Mixed count',
      securityPrivacy.mixedContentCount,
      securityPrivacy.mixedContentCount != null,
      countTone(securityPrivacy.mixedContentCount, 1, 3),
    )
    pushIf(
      shieldRows,
      'SRI missing',
      securityPrivacy.sriMissingCount,
      securityPrivacy.sriMissingCount != null,
      countTone(securityPrivacy.sriMissingCount, 1, 5),
    )
    pushIf(
      shieldRows,
      'Cookie warns',
      securityPrivacy.cookieWarningCount,
      securityPrivacy.cookieWarningCount != null,
      countTone(securityPrivacy.cookieWarningCount, 1, 3),
    )
    pushIf(shieldRows, 'Privacy URL', securityPrivacy.privacyPolicyUrl)
    pushIf(
      shieldRows,
      'ToS',
      securityPrivacy.hasTermsOfService == null
        ? null
        : yesNo(securityPrivacy.hasTermsOfService),
      securityPrivacy.hasTermsOfService != null,
      goodWhenTrue(securityPrivacy.hasTermsOfService),
    )
    if (securityPrivacy.cmpHints?.length) {
      shieldRows.push({
        label: 'CMP hints',
        value: <ChipRow values={securityPrivacy.cmpHints} />,
      })
    }
  }

  const freshnessRows: Fact[] = []
  if (freshness) {
    freshnessRows.push(
      {
        label: 'Age',
        value: freshness.ageDays == null ? '—' : `${freshness.ageDays} days`,
        tone: freshnessAgeTone(freshness.ageDays),
      },
      {
        label: 'Confidence',
        value: freshness.confidence,
        tone: confidenceTone(freshness.confidence),
      },
      { label: 'Source', value: freshness.source ?? '—' },
    )
    pushIf(freshnessRows, 'Best as-of', freshness.bestAsOfIso)
    if (freshness.sources?.length) {
      freshnessRows.push({
        label: 'Sources',
        value: <ChipRow values={freshness.sources} />,
      })
    }
  }

  const geoRows: Fact[] = []
  if (generative) {
    geoRows.push(
      { label: 'Score', value: generative.score, tone: scoreMetricTone(generative.score) },
      {
        label: 'Discover',
        value: generative.discoverability,
        tone: scoreMetricTone(generative.discoverability),
      },
      {
        label: 'Repurpose',
        value: generative.repurposing,
        tone: scoreMetricTone(generative.repurposing),
      },
      {
        label: 'Presence',
        value: (
          <ChipRow
            values={[
              generative.hasFaqSchema ? 'FAQ schema' : 'No FAQ',
              generative.hasLlmsTxt ? 'llms.txt' : 'No llms.txt',
              ...(generative.hasHowToSchema != null
                ? [generative.hasHowToSchema ? 'HowTo' : 'No HowTo']
                : []),
              ...(generative.hasBreadcrumb != null
                ? [generative.hasBreadcrumb ? 'Breadcrumb' : 'No breadcrumb']
                : []),
              ...(generative.hasOrganizationTrust != null
                ? [generative.hasOrganizationTrust ? 'Org trust' : 'No org trust']
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
        label: 'Schemas',
        value: <ChipRow values={generative.schemaCoverage} />,
        tone: 'pos',
      })
    }
    if (generative.llmsTxtSections?.length) {
      geoRows.push({
        label: 'llms sections',
        value: <ChipRow values={generative.llmsTxtSections} />,
        tone: 'pos',
      })
    }
    if (generative.aiBotsBlocked?.length) {
      geoRows.push({
        label: 'Bots blocked',
        value: <ChipRow values={generative.aiBotsBlocked} />,
        tone: 'low',
      })
    }
    pushIf(geoRows, 'FAQ entities', generative.faqEntityCount, generative.faqEntityCount != null)
    pushIf(geoRows, 'Tables', generative.tableCount, generative.tableCount != null)
    pushIf(
      geoRows,
      'Citations',
      generative.citationDensity,
      generative.citationDensity != null,
    )
    pushIf(
      geoRows,
      'Author bio',
      generative.hasAuthorBio == null ? null : yesNo(generative.hasAuthorBio),
      generative.hasAuthorBio != null,
      goodWhenTrue(generative.hasAuthorBio),
    )
    pushIf(
      geoRows,
      'YMYL',
      generative.isYmyl == null
        ? null
        : `${yesNo(generative.isYmyl)}${generative.ymylConfidence ? ` · ${generative.ymylConfidence}` : ''}`,
      generative.isYmyl != null,
    )
  }

  const infraRows: Fact[] = []
  if (infra) {
    pushIf(infraRows, 'IP', infra.serverIp)
    pushIf(
      infraRows,
      'Location',
      [infra.city, infra.country].filter(Boolean).join(', ') || null,
      Boolean(infra.city || infra.country),
    )
    pushIf(infraRows, 'CDN', infra.cdnProvider)
    pushIf(infraRows, 'html lang', infra.htmlLang)
    pushIf(infraRows, 'hreflang', infra.hreflangCount, infra.hreflangCount != null)
    if (infra.platforms?.length) {
      infraRows.push({ label: 'Platforms', value: <ChipRow values={infra.platforms} /> })
    }
    if (infra.tracking?.length) {
      infraRows.push({ label: 'Tracking', value: <ChipRow values={infra.tracking} /> })
    }
    pushIf(infraRows, 'Server', infra.hostingServer)
    pushIf(infraRows, 'Powered-By', infra.hostingPoweredBy)
  }

  const classRows: Fact[] = []
  if (classification) {
    classRows.push(
      { label: 'Summary', value: classification.shortSummary },
      { label: 'Tags', value: <ChipRow values={classification.tags} /> },
      {
        label: 'Intensity',
        value: `${intensityLabel(classification.intensityTier)} · ${classification.intensityTier}`,
      },
    )
    if (classification.tagTiers?.length) {
      classRows.push({
        label: 'Tag tiers',
        value: classification.tagTiers.map((t) => `${t.tag}·${t.tier}`).join(' · '),
      })
    }
  }
  if (deviceSiblings?.length) {
    const siblingScores = deviceSiblings
      .map((s) => s.overallScore)
      .filter((v): v is number => v != null)
    classRows.push({
      label: 'Devices',
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
      title: 'Scan',
      aliases: ['run', 'meta', 'wcag', 'status', 'device', 'issues'],
      rows: scanRows,
    },
    {
      id: 'report-performance',
      title: 'Performance',
      aliases: ['cwv', 'vitals', 'speed', 'lcp', 'fcp', 'ttfb', 'inp', 'load'],
      rows: perfRows,
    },
    {
      id: 'report-seo',
      title: 'SEO',
      aliases: ['title', 'meta', 'canonical', 'og', 'schema', 'keywords'],
      rows: seoRows,
    },
    {
      id: 'report-ux',
      title: 'UX',
      aliases: ['cls', 'readability', 'cefr', 'mobile', 'heading', 'a11y'],
      rows: uxRows,
    },
    {
      id: 'report-eco',
      title: 'Eco',
      aliases: ['co2', 'carbon', 'green', 'weight'],
      rows: ecoRows,
    },
    {
      id: 'report-links',
      title: 'Links',
      aliases: ['broken', 'noopener', 'internal', 'external'],
      rows: linkRows,
    },
    {
      id: 'report-shield',
      title: 'Shield',
      aliases: ['security', 'privacy', 'https', 'hsts', 'csp', 'cookies'],
      rows: shieldRows,
    },
    {
      id: 'report-freshness',
      title: 'Freshness',
      aliases: ['age', 'stale', 'fresh'],
      rows: freshnessRows,
    },
    {
      id: 'report-geo',
      title: 'GEO',
      aliases: ['generative', 'ai', 'llm', 'faq', 'schema'],
      rows: geoRows,
    },
    {
      id: 'report-infra',
      title: 'Infra',
      aliases: ['hosting', 'cdn', 'ip', 'platform', 'tracking'],
      rows: infraRows,
    },
    {
      id: 'report-class',
      title: 'Class / devices',
      aliases: ['intensity', 'tags', 'devices', 'siblings'],
      rows: classRows,
    },
    {
      id: 'report-cleared',
      title: 'Cleared checks',
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
    return scores.some((score) => {
      const tone = scoreTone(score.value)
      return scoreMatches(
        score.label,
        score.kind,
        score.value,
        tone === 'default' ? undefined : tone,
        parsedQuery,
      )
    })
  })()

  const hasResults = ledgerVisible || filteredBands.length > 0

  return (
    <div className="checkion-magazine-body checkion-spread checkion-report">
      <header className="checkion-report__head">
        <p className="checkion-spread__eyebrow">Detail</p>
        <h3 id="detail-chapter" className="checkion-report__title">
          Full report
        </h3>
      </header>

      <div className="checkion-report__search">
        <label className="checkion-report__search-label" htmlFor="detail-report-search">
          Search report
        </label>
        <Input
          id="detail-report-search"
          type="search"
          block
          size="md"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="LCP, HTTPS, bad, Eco, readability…"
          autoComplete="off"
          spellCheck={false}
        />
        {parsedQuery.raw ? (
          <p className="checkion-report__search-meta" aria-live="polite">
            {hasResults
              ? `Showing matches for “${query.trim()}”`
              : `No matches for “${query.trim()}”`}
          </p>
        ) : (
          <p className="checkion-report__search-meta">
            Labels, values, categories — or try <em>bad</em>, <em>good</em>, <em>LCP</em>
          </p>
        )}
      </div>

      {screenshotUrl && !parsedQuery.raw ? (
        <figure className="checkion-report__shot">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={screenshotUrl} alt="Scan capture" />
        </figure>
      ) : null}

      {!hasResults ? (
        <EmptyState>No matches — try another metric, category, or tone (bad / good / warn).</EmptyState>
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
