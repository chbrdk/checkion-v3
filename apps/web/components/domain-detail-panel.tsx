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
import { domainFormulaLocalePath } from '../lib/domain-detail-score-formulas'
import { tipIdForDetailBand } from '../lib/help-tips'
import type { Translator } from '../lib/i18n'
import { scoreTone } from '../lib/scan-display'
import { useT } from '../lib/user-prefs'
import { LabelWithTip } from './help-tip'

function msLabel(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)} s`
  return `${Math.round(value)} ms`
}

function yesNo(value: boolean, t: Translator): string {
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

function formulaText(id: string, t: Translator): string | undefined {
  const path = domainFormulaLocalePath(id)
  return path ? t(path) : undefined
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
        <p className="checkion-report__formula">{formulaText('ledger', t)}</p>
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

/** Domain magazine Chapter 03 — Corpus ledger detail report. */
export function DomainDetailPanel({ overview }: { overview: DomainOverview }) {
  const t = useT()
  const f = (key: string, params?: Record<string, string | number>) =>
    t(`domain.detail.fields.${key}`, params)
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
  push(corpusRows, f('rootUrl'), scan.rootUrl)
  push(corpusRows, f('status'), scan.status)
  push(corpusRows, f('pagesScanned'), scan.pageCount.toLocaleString())
  push(corpusRows, f('issueGroups'), String(scan.issueCount))
  if (scan.industry) push(corpusRows, f('industry'), scan.industry)
  if (scan.issueStats) {
    push(
      corpusRows,
      f('totalErrors'),
      scan.issueStats.errors.toLocaleString(),
      countTone(scan.issueStats.errors, 1, 100),
    )
    push(corpusRows, f('warnings'), scan.issueStats.warnings.toLocaleString())
    if (scan.issueStats.byWcagLevel) {
      push(corpusRows, f('wcagA'), String(scan.issueStats.byWcagLevel.A ?? 0))
      push(corpusRows, f('wcagAA'), String(scan.issueStats.byWcagLevel.AA ?? 0))
    }
  }
  push(corpusRows, f('started'), fmtWhen(scan.startedAt))
  push(corpusRows, f('completed'), fmtWhen(scan.completedAt))

  const perfRows: Fact[] = []
  if (perf) {
    push(perfRows, f('avgTtfb'), msLabel(perf.avgTtfb), timingTone(perf.avgTtfb, 200, 500))
    push(perfRows, f('avgFcp'), msLabel(perf.avgFcp), timingTone(perf.avgFcp, 1800, 3000))
    push(perfRows, f('avgLcp'), msLabel(perf.avgLcp), timingTone(perf.avgLcp, 2500, 4000))
    push(perfRows, f('avgDom'), msLabel(perf.avgDomLoad), timingTone(perf.avgDomLoad, 2000, 3500))
    push(perfRows, f('pagesMeasured'), perf.pageCount.toLocaleString())
    if (perf.scriptTransferKbAvg != null) {
      push(perfRows, f('avgScriptTransfer'), `${perf.scriptTransferKbAvg} KB`)
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
      f('pagesWithTitle'),
      `${seo.withTitle.toLocaleString()}/${seo.totalPages.toLocaleString()} · ${titlePct}%`,
      scoreMetricTone(titlePct),
    )
    push(
      seoRows,
      f('pagesWithH1'),
      `${seo.withH1.toLocaleString()}/${seo.totalPages.toLocaleString()} · ${h1Pct}%`,
      scoreMetricTone(h1Pct),
    )
    push(
      seoRows,
      f('pagesWithMeta'),
      `${seo.withMetaDescription.toLocaleString()}/${seo.totalPages.toLocaleString()} · ${metaPct}%`,
      scoreMetricTone(metaPct),
    )
    push(
      seoRows,
      f('pagesWithCanonical'),
      `${seo.withCanonical.toLocaleString()}/${seo.totalPages.toLocaleString()} · ${canonicalPct}%`,
      scoreMetricTone(canonicalPct),
    )
    if (seo.withOgTitle != null) {
      const ogPct = coveragePct(seo.withOgTitle, seo.totalPages)
      push(
        seoRows,
        f('openGraphTitle'),
        `${seo.withOgTitle.toLocaleString()}/${seo.totalPages.toLocaleString()} · ${ogPct}%`,
        scoreMetricTone(ogPct),
      )
    }
    if (seo.withTwitterCard != null) {
      const twPct = coveragePct(seo.withTwitterCard, seo.totalPages)
      push(
        seoRows,
        f('twitterCard'),
        `${seo.withTwitterCard.toLocaleString()}/${seo.totalPages.toLocaleString()} · ${twPct}%`,
        scoreMetricTone(twPct),
      )
    }
    push(
      seoRows,
      f('canonicalMismatches'),
      seo.canonicalMismatchCount.toLocaleString(),
      countTone(seo.canonicalMismatchCount, 1, 50),
    )
    push(
      seoRows,
      f('duplicateTitleGroups'),
      seo.duplicateTitleGroupCount.toLocaleString(),
      countTone(seo.duplicateTitleGroupCount, 1, 10),
    )
    if (seo.duplicateMetaGroupCount != null) {
      push(seoRows, f('duplicateMetaGroups'), seo.duplicateMetaGroupCount.toLocaleString())
    }
    if (seo.missingH1Count != null) {
      push(seoRows, f('missingH1'), seo.missingH1Count.toLocaleString(), countTone(seo.missingH1Count, 1, 5))
    }
    if (seo.hreflangXDefaultConflict != null) {
      push(
        seoRows,
        f('hreflangXDefaultConflict'),
        yesNo(seo.hreflangXDefaultConflict, t),
        goodWhenTrue(!seo.hreflangXDefaultConflict),
      )
    }
    if (seo.totalWordsAcrossPages != null) {
      push(seoRows, f('totalWords'), seo.totalWordsAcrossPages.toLocaleString())
    }
    if (seo.topKeywords?.length) {
      push(seoRows, f('topKeywords'), seo.topKeywords.join(', '))
    }
  }

  const uxRows: Fact[] = []
  if (ux) {
    push(uxRows, f('uxScore'), String(ux.score), scoreMetricTone(ux.score))
    push(uxRows, f('clsAvg'), String(ux.cls))
    push(uxRows, f('readabilityGrade'), ux.readabilityGrade)
    push(uxRows, f('readabilityScore'), String(ux.readabilityScore))
    if (ux.readabilityBands) {
      push(uxRows, f('bandEasy'), ux.readabilityBands.easy.toLocaleString())
      push(uxRows, f('bandStandard'), ux.readabilityBands.standard.toLocaleString())
      push(uxRows, f('bandComplex'), ux.readabilityBands.complex.toLocaleString())
      push(uxRows, f('bandVeryComplex'), ux.readabilityBands.veryComplex.toLocaleString())
    }
    push(
      uxRows,
      f('pagesWithMultipleH1'),
      ux.pagesWithMultipleH1.toLocaleString(),
      countTone(ux.pagesWithMultipleH1, 1, 20),
    )
    push(
      uxRows,
      f('pagesWithSkippedLevels'),
      ux.pagesWithSkippedLevels.toLocaleString(),
      countTone(ux.pagesWithSkippedLevels, 1, 50),
    )
    push(
      uxRows,
      f('brokenLinksCorpus'),
      ux.brokenLinkCount.toLocaleString(),
      countTone(ux.brokenLinkCount, 1, 20),
    )
    push(uxRows, f('tapTargetIssuesSample'), String(ux.tapTargetIssueCount))
    if (ux.dwellSecondsMedian != null) {
      push(uxRows, f('medianDwell'), `${ux.dwellSecondsMedian}s`)
    }
  }

  const ecoRows: Fact[] = []
  if (eco) {
    push(ecoRows, f('avgCo2'), `${eco.avgCo2} g`)
    push(ecoRows, f('dominantGrade'), eco.grade)
    push(ecoRows, f('avgPageWeight'), `${eco.avgPageWeightKb.toLocaleString()} KB`)
    if (eco.gradeDistribution) {
      for (const g of ['A+', 'A', 'B', 'C', 'D', 'E', 'F'] as const) {
        const n = eco.gradeDistribution[g]
        if (n) push(ecoRows, f('gradeNamed', { g }), n.toLocaleString())
      }
    }
  }

  const linkRows: Fact[] = []
  if (links) {
    push(linkRows, f('total'), (links.total ?? links.internal + links.external).toLocaleString())
    push(linkRows, f('internal'), links.internal.toLocaleString())
    push(linkRows, f('external'), links.external.toLocaleString())
    push(linkRows, f('broken'), links.broken.toLocaleString(), countTone(links.broken, 1, 20))
  }

  const shieldRows: Fact[] = []
  if (shield) {
    push(shieldRows, f('https'), yesNo(shield.https, t), goodWhenTrue(shield.https))
    push(shieldRows, f('hsts'), yesNo(shield.hsts, t), goodWhenTrue(shield.hsts))
    push(shieldRows, f('cspMajority'), yesNo(shield.csp, t), goodWhenTrue(shield.csp))
    push(
      shieldRows,
      f('privacyPolicy'),
      yesNo(shield.hasPrivacyPolicy, t),
      goodWhenTrue(shield.hasPrivacyPolicy),
    )
    push(shieldRows, f('cookieBanner'), yesNo(shield.hasCookieBanner, t))
    push(shieldRows, f('mixedContent'), yesNo(shield.mixedContent, t), goodWhenTrue(!shield.mixedContent))
    if (shield.privacyPolicyUrl) push(shieldRows, f('privacyUrl'), shield.privacyPolicyUrl)
    if (shield.cmpHints?.length) push(shieldRows, f('earlyScriptHosts'), shield.cmpHints.join(', '))
  }

  const eeatRows: Fact[] = []
  if (eeat) {
    push(eeatRows, f('contactPages'), eeat.trust.pagesWithContact.toLocaleString())
    push(eeatRows, f('privacyPages'), eeat.trust.pagesWithPrivacy.toLocaleString())
    push(eeatRows, f('impressumPages'), eeat.trust.pagesWithImpressum.toLocaleString())
    push(eeatRows, f('aboutPages'), eeat.experience.pagesWithAbout.toLocaleString())
    push(eeatRows, f('teamPages'), eeat.experience.pagesWithTeam.toLocaleString())
    push(eeatRows, f('caseStudyMentions'), eeat.experience.pagesWithCaseStudyMention.toLocaleString())
    push(eeatRows, f('authorBioPages'), eeat.expertise.pagesWithAuthorBio.toLocaleString())
    push(eeatRows, f('avgCitationsPerPage'), eeat.expertise.avgCitationsPerPage.toFixed(2))
  }

  const geoRows: Fact[] = []
  if (geo) {
    push(geoRows, f('geoScore'), String(geo.score), scoreMetricTone(geo.score))
    push(geoRows, f('discoverability'), String(geo.discoverability))
    push(geoRows, f('repurposing'), String(geo.repurposing))
    push(geoRows, f('llmsTxtPages'), geo.withLlmsTxt.toLocaleString())
    if (geo.withRobotsAllowingAi != null) {
      push(geoRows, f('aiBotsAllowedPages'), geo.withRobotsAllowingAi.toLocaleString())
    }
  }

  const infraRows: Fact[] = []
  if (infra) {
    push(infraRows, f('serverIp'), infra.serverIp ?? '—')
    push(infraRows, f('city'), infra.city ?? '—')
    push(infraRows, f('country'), infra.country ?? '—')
    push(infraRows, f('cdnHost'), infra.cdnProvider ?? infra.hostingServer ?? '—')
    push(infraRows, f('htmlLang'), infra.htmlLang ?? '—')
    push(infraRows, f('hreflangTargets'), String(infra.hreflangCount ?? 0))
    push(infraRows, f('platforms'), infra.platforms?.join(', ') || '—')
    push(infraRows, f('trackingHosts'), infra.tracking?.join(', ') || '—')
  }

  const classRows: Fact[] = []
  if (classification) {
    push(classRows, f('summary'), classification.shortSummary)
    push(classRows, f('tags'), classification.tags.join(', '))
    push(classRows, f('intensityTier'), String(classification.intensityTier))
  }

  const systemicRows: Fact[] = systemicIssues.slice(0, 12).map((issue) => ({
    label: issue.title,
    value: t('domain.pagesUnit', { n: issue.pageCount.toLocaleString() }),
    tone: countTone(issue.pageCount, 100, 1000),
  }))

  const sampleRows: Fact[] = (pageSamples ?? []).map((page) => ({
    label: compactPath(page.url),
    value:
      page.errors != null
        ? t('domain.errAbbrev', { score: page.score ?? '—', errors: page.errors })
        : String(page.score ?? '—'),
  }))

  const bands: Array<{
    id: string
    title: string
    aliases: string[]
    formulaKey: string
    rows: Fact[]
  }> = [
    {
      id: 'report-corpus',
      title: t('domain.detail.bands.corpus'),
      aliases: ['domain', 'pages', 'crawl'],
      formulaKey: 'corpus',
      rows: corpusRows,
    },
    {
      id: 'report-systemic',
      title: t('domain.detail.bands.systemic'),
      aliases: ['systemic', 'a11y'],
      formulaKey: 'corpus',
      rows: systemicRows,
    },
    {
      id: 'report-performance',
      title: t('domain.detail.bands.performance'),
      aliases: ['vitals', 'lcp', 'fcp'],
      formulaKey: 'performance',
      rows: perfRows,
    },
    {
      id: 'report-seo',
      title: t('domain.detail.bands.seo'),
      aliases: ['seo', 'canonical', 'title'],
      formulaKey: 'seo',
      rows: seoRows,
    },
    {
      id: 'report-ux',
      title: t('domain.detail.bands.ux'),
      aliases: ['ux', 'readability', 'cls'],
      formulaKey: 'ux',
      rows: uxRows,
    },
    {
      id: 'report-eco',
      title: t('domain.detail.bands.eco'),
      aliases: ['eco', 'co2'],
      formulaKey: 'eco',
      rows: ecoRows,
    },
    {
      id: 'report-links',
      title: t('domain.detail.bands.links'),
      aliases: ['links', 'broken'],
      formulaKey: 'links',
      rows: linkRows,
    },
    {
      id: 'report-shield',
      title: t('domain.detail.bands.shield'),
      aliases: ['security', 'privacy', 'csp'],
      formulaKey: 'shield',
      rows: shieldRows,
    },
    {
      id: 'report-eeat',
      title: t('domain.detail.bands.eeat'),
      aliases: ['eeat', 'trust'],
      formulaKey: 'eeat',
      rows: eeatRows,
    },
    {
      id: 'report-geo',
      title: t('domain.detail.bands.geo'),
      aliases: ['geo', 'generative', 'llm'],
      formulaKey: 'geo',
      rows: geoRows,
    },
    {
      id: 'report-infra',
      title: t('domain.detail.bands.infra'),
      aliases: ['infra', 'cdn', 'hosting'],
      formulaKey: 'infra',
      rows: infraRows,
    },
    {
      id: 'report-class',
      title: t('domain.detail.bands.class'),
      aliases: ['class', 'themes', 'tags'],
      formulaKey: 'class',
      rows: classRows,
    },
    {
      id: 'report-samples',
      title: t('domain.detail.bands.samples'),
      aliases: ['samples', 'pages'],
      formulaKey: 'samples',
      rows: sampleRows,
    },
  ]

  const ledgerVisible = scores.some((score) =>
    scoreMatches(score.label, score.kind, score.value, scoreMetricTone(score.value), query),
  )

  const visibleBands = bands
    .map((band) => {
      const rows = filterFacts(band.rows, query, band.title, band.aliases)
      const visible = bandVisible(band.title, band.aliases, rows, band.rows, query)
      return { ...band, rows, visible }
    })
    .filter((band) => band.visible && band.rows.length > 0)

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
          onChange={(event) => setRawQuery(event.target.value)}
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
          <p className="checkion-report__search-meta">{t('domain.detail.searchHint')}</p>
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
              formula={formulaText(band.formulaKey, t)}
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
