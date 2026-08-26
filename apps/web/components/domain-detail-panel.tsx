'use client'

import { useDeferredValue, useMemo, useState, type ReactNode } from 'react'
import { Chip, EmptyState, Input } from '@msqdx/ui'
import type { DomainOverview, ScoreCard } from '@checkion-v3/contracts'
import {
  countTone,
  goodWhenTrue,
  scoreMetricTone,
  timingTone,
  type MetricTone,
} from '../lib/detail-metric-tone'
import {
  bandVisible,
  filterFacts,
  parseDetailQuery,
  scoreMatches,
  type DetailSearchQuery,
  type SearchableFact,
} from '../lib/detail-report-search'
import { domainFormulaForBand } from '../lib/domain-detail-score-formulas'
import { tipIdForDetailBand } from '../lib/help-tips'
import { scoreTone } from '../lib/scan-display'
import { useT } from '../lib/user-prefs'
import { LabelWithTip } from './help-tip'

function msLabel(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)} s`
  return `${Math.round(value)} ms`
}

function yesNo(value: boolean, t: (k: string) => string): string {
  return value ? t('results.detail.yes') : t('results.detail.no')
}

function coveragePct(have: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((100 * have) / total)
}

function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function compactPath(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname === '/' ? '/' : u.pathname.replace(/\/$/, '')
    return path.length > 64 ? `${path.slice(0, 61)}…` : path
  } catch {
    return url.length > 64 ? `${url.slice(0, 61)}…` : url
  }
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

function push(rows: Fact[], label: string, value: ReactNode, tone?: MetricTone) {
  rows.push({ label, value, tone })
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
    <section className="checkion-report__ledger" aria-labelledby="domain-detail-ledger-heading">
      <header className="checkion-report__band-head">
        <h3 id="domain-detail-ledger-heading" className="checkion-report__band-title">
          {t('results.detail.ledger')}
        </h3>
        <p className="checkion-report__formula">{domainFormulaForBand('ledger')}</p>
      </header>
      <table
        className="checkion-report__table checkion-report__table--ledger"
        aria-label={t('results.detail.scoreLedger')}
      >
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
              <td className="checkion-report__idx">{String(index + 1).padStart(2, '0')}</td>
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

export function DomainDetailPanel({ overview }: { overview: DomainOverview }) {
  const t = useT()
  const [rawQuery, setRawQuery] = useState('')
  const deferred = useDeferredValue(rawQuery)
  const query: DetailSearchQuery = useMemo(() => parseDetailQuery(deferred), [deferred])

  const {
    scan,
    scores,
    seoCoverage: seo,
    performance: perf,
    ux,
    eco,
    links,
    securityPrivacy: shield,
    eeat,
    generative: geo,
    infra,
    classification,
    pageSamples,
    systemicIssues,
  } = overview

  const corpusRows: Fact[] = []
  push(corpusRows, 'Root URL', scan.rootUrl)
  push(corpusRows, 'Status', scan.status)
  push(corpusRows, 'Pages scanned', scan.pageCount.toLocaleString())
  push(corpusRows, 'Issue groups', String(scan.issueCount))
  if (scan.industry) push(corpusRows, 'Industry', scan.industry)
  if (scan.issueStats) {
    push(
      corpusRows,
      'Total errors',
      scan.issueStats.errors.toLocaleString(),
      countTone(scan.issueStats.errors, 1, 100),
    )
    push(corpusRows, 'Warnings', scan.issueStats.warnings.toLocaleString())
    if (scan.issueStats.byWcagLevel) {
      push(corpusRows, 'WCAG A', String(scan.issueStats.byWcagLevel.A ?? 0))
      push(corpusRows, 'WCAG AA', String(scan.issueStats.byWcagLevel.AA ?? 0))
    }
  }
  push(corpusRows, 'Started', fmtWhen(scan.startedAt))
  push(corpusRows, 'Completed', fmtWhen(scan.completedAt))

  const perfRows: Fact[] = []
  if (perf) {
    push(perfRows, 'Avg TTFB', msLabel(perf.avgTtfb), timingTone(perf.avgTtfb, 200, 500))
    push(perfRows, 'Avg FCP', msLabel(perf.avgFcp), timingTone(perf.avgFcp, 1800, 3000))
    push(perfRows, 'Avg LCP', msLabel(perf.avgLcp), timingTone(perf.avgLcp, 2500, 4000))
    push(perfRows, 'Avg DOM', msLabel(perf.avgDomLoad), timingTone(perf.avgDomLoad, 2000, 3500))
    push(perfRows, 'Pages measured', perf.pageCount.toLocaleString())
    if (perf.scriptTransferKbAvg != null) {
      push(perfRows, 'Avg script transfer', `${perf.scriptTransferKbAvg} KB`)
    }
  }

  const seoRows: Fact[] = []
  if (seo) {
    const titlePct = coveragePct(seo.withTitle, seo.totalPages)
    const h1Pct = coveragePct(seo.withH1, seo.totalPages)
    const metaPct = coveragePct(seo.withMetaDescription, seo.totalPages)
    const canonicalPct = coveragePct(seo.withCanonical, seo.totalPages)
    push(
      seoRows,
      'Pages with title',
      `${seo.withTitle.toLocaleString()}/${seo.totalPages.toLocaleString()} · ${titlePct}%`,
      scoreMetricTone(titlePct),
    )
    push(
      seoRows,
      'Pages with H1',
      `${seo.withH1.toLocaleString()}/${seo.totalPages.toLocaleString()} · ${h1Pct}%`,
      scoreMetricTone(h1Pct),
    )
    push(
      seoRows,
      'Pages with meta',
      `${seo.withMetaDescription.toLocaleString()}/${seo.totalPages.toLocaleString()} · ${metaPct}%`,
      scoreMetricTone(metaPct),
    )
    push(
      seoRows,
      'Pages with canonical',
      `${seo.withCanonical.toLocaleString()}/${seo.totalPages.toLocaleString()} · ${canonicalPct}%`,
      scoreMetricTone(canonicalPct),
    )
    if (seo.withOgTitle != null) {
      const ogPct = coveragePct(seo.withOgTitle, seo.totalPages)
      push(
        seoRows,
        'Open Graph title',
        `${seo.withOgTitle.toLocaleString()}/${seo.totalPages.toLocaleString()} · ${ogPct}%`,
        scoreMetricTone(ogPct),
      )
    }
    if (seo.withTwitterCard != null) {
      const twPct = coveragePct(seo.withTwitterCard, seo.totalPages)
      push(
        seoRows,
        'Twitter card',
        `${seo.withTwitterCard.toLocaleString()}/${seo.totalPages.toLocaleString()} · ${twPct}%`,
        scoreMetricTone(twPct),
      )
    }
    push(
      seoRows,
      'Canonical mismatches',
      seo.canonicalMismatchCount.toLocaleString(),
      countTone(seo.canonicalMismatchCount, 1, 50),
    )
    push(
      seoRows,
      'Duplicate title groups',
      seo.duplicateTitleGroupCount.toLocaleString(),
      countTone(seo.duplicateTitleGroupCount, 1, 10),
    )
    if (seo.duplicateMetaGroupCount != null) {
      push(seoRows, 'Duplicate meta groups', seo.duplicateMetaGroupCount.toLocaleString())
    }
    if (seo.missingH1Count != null) {
      push(seoRows, 'Missing H1', seo.missingH1Count.toLocaleString(), countTone(seo.missingH1Count, 1, 5))
    }
    if (seo.hreflangXDefaultConflict != null) {
      push(
        seoRows,
        'Hreflang x-default conflict',
        yesNo(seo.hreflangXDefaultConflict, t),
        goodWhenTrue(!seo.hreflangXDefaultConflict),
      )
    }
    if (seo.totalWordsAcrossPages != null) {
      push(seoRows, 'Total words', seo.totalWordsAcrossPages.toLocaleString())
    }
    if (seo.topKeywords?.length) {
      push(seoRows, 'Top keywords', seo.topKeywords.join(', '))
    }
  }

  const uxRows: Fact[] = []
  if (ux) {
    push(uxRows, 'UX score', String(ux.score), scoreMetricTone(ux.score))
    push(uxRows, 'CLS (avg)', String(ux.cls))
    push(uxRows, 'Readability grade', ux.readabilityGrade)
    push(uxRows, 'Readability score', String(ux.readabilityScore))
    if (ux.readabilityBands) {
      push(uxRows, 'Band · easy', ux.readabilityBands.easy.toLocaleString())
      push(uxRows, 'Band · standard', ux.readabilityBands.standard.toLocaleString())
      push(uxRows, 'Band · complex', ux.readabilityBands.complex.toLocaleString())
      push(uxRows, 'Band · very complex', ux.readabilityBands.veryComplex.toLocaleString())
    }
    push(
      uxRows,
      'Pages with multiple H1',
      ux.pagesWithMultipleH1.toLocaleString(),
      countTone(ux.pagesWithMultipleH1, 1, 20),
    )
    push(
      uxRows,
      'Pages with skipped levels',
      ux.pagesWithSkippedLevels.toLocaleString(),
      countTone(ux.pagesWithSkippedLevels, 1, 50),
    )
    push(
      uxRows,
      'Broken links (corpus)',
      ux.brokenLinkCount.toLocaleString(),
      countTone(ux.brokenLinkCount, 1, 20),
    )
    push(uxRows, 'Tap-target issues (sample)', String(ux.tapTargetIssueCount))
    if (ux.dwellSecondsMedian != null) {
      push(uxRows, 'Median dwell', `${ux.dwellSecondsMedian}s`)
    }
  }

  const ecoRows: Fact[] = []
  if (eco) {
    push(ecoRows, 'Avg CO₂', `${eco.avgCo2} g`)
    push(ecoRows, 'Dominant grade', eco.grade)
    push(ecoRows, 'Avg page weight', `${eco.avgPageWeightKb.toLocaleString()} KB`)
    if (eco.gradeDistribution) {
      for (const g of ['A+', 'A', 'B', 'C', 'D', 'E', 'F'] as const) {
        const n = eco.gradeDistribution[g]
        if (n) push(ecoRows, `Grade ${g}`, n.toLocaleString())
      }
    }
  }

  const linkRows: Fact[] = []
  if (links) {
    push(linkRows, 'Total', (links.total ?? links.internal + links.external).toLocaleString())
    push(linkRows, 'Internal', links.internal.toLocaleString())
    push(linkRows, 'External', links.external.toLocaleString())
    push(linkRows, 'Broken', links.broken.toLocaleString(), countTone(links.broken, 1, 20))
  }

  const shieldRows: Fact[] = []
  if (shield) {
    push(shieldRows, 'HTTPS', yesNo(shield.https, t), goodWhenTrue(shield.https))
    push(shieldRows, 'HSTS', yesNo(shield.hsts, t), goodWhenTrue(shield.hsts))
    push(shieldRows, 'CSP (majority)', yesNo(shield.csp, t), goodWhenTrue(shield.csp))
    push(
      shieldRows,
      'Privacy policy',
      yesNo(shield.hasPrivacyPolicy, t),
      goodWhenTrue(shield.hasPrivacyPolicy),
    )
    push(shieldRows, 'Cookie banner', yesNo(shield.hasCookieBanner, t))
    push(shieldRows, 'Mixed content', yesNo(shield.mixedContent, t), goodWhenTrue(!shield.mixedContent))
    if (shield.privacyPolicyUrl) push(shieldRows, 'Privacy URL', shield.privacyPolicyUrl)
    if (shield.cmpHints?.length) push(shieldRows, 'Early script hosts', shield.cmpHints.join(', '))
  }

  const eeatRows: Fact[] = []
  if (eeat) {
    push(eeatRows, 'Contact pages', eeat.trust.pagesWithContact.toLocaleString())
    push(eeatRows, 'Privacy pages', eeat.trust.pagesWithPrivacy.toLocaleString())
    push(eeatRows, 'Impressum pages', eeat.trust.pagesWithImpressum.toLocaleString())
    push(eeatRows, 'About pages', eeat.experience.pagesWithAbout.toLocaleString())
    push(eeatRows, 'Team pages', eeat.experience.pagesWithTeam.toLocaleString())
    push(eeatRows, 'Case-study mentions', eeat.experience.pagesWithCaseStudyMention.toLocaleString())
    push(eeatRows, 'Author bio pages', eeat.expertise.pagesWithAuthorBio.toLocaleString())
    push(eeatRows, 'Avg citations / page', eeat.expertise.avgCitationsPerPage.toFixed(2))
  }

  const geoRows: Fact[] = []
  if (geo) {
    push(geoRows, 'GEO score', String(geo.score), scoreMetricTone(geo.score))
    push(geoRows, 'Discoverability', String(geo.discoverability))
    push(geoRows, 'Repurposing', String(geo.repurposing))
    push(geoRows, 'llms.txt pages', geo.withLlmsTxt.toLocaleString())
    if (geo.withRobotsAllowingAi != null) {
      push(geoRows, 'AI bots allowed (pages)', geo.withRobotsAllowingAi.toLocaleString())
    }
  }

  const infraRows: Fact[] = []
  if (infra) {
    push(infraRows, 'Server IP', infra.serverIp ?? '—')
    push(infraRows, 'City', infra.city ?? '—')
    push(infraRows, 'Country', infra.country ?? '—')
    push(infraRows, 'CDN / host', infra.cdnProvider ?? infra.hostingServer ?? '—')
    push(infraRows, 'html lang', infra.htmlLang ?? '—')
    push(infraRows, 'Hreflang targets', String(infra.hreflangCount ?? 0))
    push(infraRows, 'Platforms', infra.platforms?.join(', ') || '—')
    push(infraRows, 'Tracking hosts', infra.tracking?.join(', ') || '—')
  }

  const classRows: Fact[] = []
  if (classification) {
    push(classRows, 'Summary', classification.shortSummary)
    push(classRows, 'Tags', classification.tags.join(', '))
    push(classRows, 'Intensity tier', String(classification.intensityTier))
  }

  const systemicRows: Fact[] = systemicIssues.slice(0, 12).map((i) => ({
    label: i.title,
    value: `${i.pageCount.toLocaleString()} pages`,
    tone: countTone(i.pageCount, 100, 1000),
  }))

  const sampleRows: Fact[] = (pageSamples ?? []).map((p) => ({
    label: compactPath(p.url),
    value: `${p.score ?? '—'}${p.errors != null ? ` · ${p.errors} err` : ''}`,
  }))

  const bands: Array<{
    id: string
    title: string
    aliases: string[]
    formulaKey: string
    rows: Fact[]
  }> = [
    { id: 'report-corpus', title: 'Corpus', aliases: ['domain', 'pages', 'crawl'], formulaKey: 'corpus', rows: corpusRows },
    { id: 'report-systemic', title: 'Systemic issues', aliases: ['systemic', 'a11y'], formulaKey: 'corpus', rows: systemicRows },
    { id: 'report-performance', title: 'Performance', aliases: ['vitals', 'lcp', 'fcp'], formulaKey: 'performance', rows: perfRows },
    { id: 'report-seo', title: 'SEO coverage', aliases: ['seo', 'canonical', 'title'], formulaKey: 'seo', rows: seoRows },
    { id: 'report-ux', title: 'UX', aliases: ['ux', 'readability', 'cls'], formulaKey: 'ux', rows: uxRows },
    { id: 'report-eco', title: 'Eco', aliases: ['eco', 'co2'], formulaKey: 'eco', rows: ecoRows },
    { id: 'report-links', title: 'Links', aliases: ['links', 'broken'], formulaKey: 'links', rows: linkRows },
    { id: 'report-shield', title: 'Shield', aliases: ['security', 'privacy', 'csp'], formulaKey: 'shield', rows: shieldRows },
    { id: 'report-eeat', title: 'E-E-A-T', aliases: ['eeat', 'trust'], formulaKey: 'eeat', rows: eeatRows },
    { id: 'report-geo', title: 'GEO', aliases: ['geo', 'generative', 'llm'], formulaKey: 'geo', rows: geoRows },
    { id: 'report-infra', title: 'Infra', aliases: ['infra', 'cdn', 'hosting'], formulaKey: 'infra', rows: infraRows },
    { id: 'report-class', title: 'Classification', aliases: ['class', 'themes', 'tags'], formulaKey: 'class', rows: classRows },
    { id: 'report-samples', title: 'Page samples', aliases: ['samples', 'pages'], formulaKey: 'samples', rows: sampleRows },
  ]

  const ledgerVisible = scores.some((s) =>
    scoreMatches(s.label, s.kind, s.value, scoreMetricTone(s.value), query),
  )

  const visibleBands = bands
    .map((band) => {
      const rows = filterFacts(band.rows, query, band.title, band.aliases)
      const visible = bandVisible(band.title, band.aliases, rows, band.rows, query)
      return { ...band, rows, visible }
    })
    .filter((b) => b.visible && b.rows.length > 0)

  const hasResults = ledgerVisible || visibleBands.length > 0

  return (
    <div className="checkion-magazine-body checkion-spread checkion-report">
      <header className="checkion-report__head">
        <p className="checkion-spread__eyebrow">{t('domain.chapter03Detail')}</p>
        <h3 id="domain-detail-chapter" className="checkion-report__title">
          {t('domain.corpusLedger')}
        </h3>
      </header>

      <div className="checkion-report__search">
        <label className="checkion-report__search-label" htmlFor="domain-detail-report-search">
          {t('results.detail.searchLabel')}
        </label>
        <Input
          id="domain-detail-report-search"
          type="search"
          block
          size="md"
          value={rawQuery}
          onChange={(e) => setRawQuery(e.target.value)}
          placeholder={t('domain.searchPlaceholderDetail')}
          autoComplete="off"
          spellCheck={false}
        />
        {query.raw ? (
          <p className="checkion-report__search-meta" aria-live="polite">
            {hasResults
              ? t('results.detail.showingMatches', { query: rawQuery.trim() })
              : t('results.detail.noMatchesQuery', { query: rawQuery.trim() })}
          </p>
        ) : (
          <p className="checkion-report__search-meta">
            {t('results.detail.searchHint')}
          </p>
        )}
      </div>

      {!hasResults ? (
        <EmptyState>{t('results.detail.emptySearch')}</EmptyState>
      ) : (
        <>
          <ScoreLedgerStrip scores={scores} overall={scan.overallScore} query={query} />
          {visibleBands.map((band) => (
            <ReportBand
              key={band.id}
              id={band.id}
              title={band.title}
              formula={domainFormulaForBand(band.formulaKey)}
              rows={band.rows}
            />
          ))}
        </>
      )}

      {scan.tags?.length && !query.raw ? (
        <div className="checkion-chip-row checkion-report__tags">
          {scan.tags.map((tag) => (
            <Chip key={tag} static size="sm">
              {tag}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  )
}
