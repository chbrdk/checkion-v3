'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  Chip,
  Hint,
  RankedList,
  RankedRow,
  StatusMeterPanel,
  Text,
} from '@msqdx/ui'
import type {
  DomainOverview,
  ScoreCard,
  SecurityPrivacySnapshot,
} from '@checkion-v3/contracts'
import { paths } from '../lib/paths'
import { scoreTone, worstScore } from '../lib/scan-display'
import { DistributionDonut } from './distribution-donut'
import { DomainSeoReading } from './domain-seo-reading'
import { DomainTrustGeoReading } from './domain-trust-geo-reading'
import { ScoresPanel } from './scores-panel'
import { LabelWithTip } from './help-tip'
import { buildSeoReadingFallback } from '../lib/domain-seo-reading'
import { buildTrustGeoReadingFallback } from '../lib/domain-trust-reading'
import { useT } from '../lib/user-prefs'

function msLabel(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)} s`
  return `${Math.round(value)} ms`
}

function coveragePct(have: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((100 * have) / total)
}

/** Read-only fill bar — magazine tone, not an interactive slider. */
function ReadoutMeter({
  label,
  valueLabel,
  pct,
}: {
  label: ReactNode
  valueLabel: ReactNode
  pct: number
}) {
  const fill = Math.max(0, Math.min(100, pct))
  const tone = scoreTone(fill)
  return (
    <li className="checkion-domain-meter" data-tone={tone}>
      <div className="checkion-domain-meter__head">
        <span>{label}</span>
        <strong>{valueLabel}</strong>
      </div>
      <div className="checkion-domain-meter__track" aria-hidden>
        <span style={{ width: `${Math.max(fill > 0 ? 4 : 0, fill)}%` }} />
      </div>
    </li>
  )
}

function ReadoutMeterList({
  children,
  'aria-label': ariaLabel,
}: {
  children: ReactNode
  'aria-label'?: string
}) {
  return (
    <ul className="checkion-domain-meter-list" aria-label={ariaLabel}>
      {children}
    </ul>
  )
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

function shieldStats(snap: SecurityPrivacySnapshot): {
  ok: number
  total: number
  gaps: string[]
} {
  const items: Array<{ ok: boolean; gap: string }> = [
    { ok: snap.https, gap: 'HTTPS' },
    { ok: snap.hsts, gap: 'HSTS' },
    { ok: snap.csp, gap: 'CSP' },
    { ok: snap.hasPrivacyPolicy, gap: 'Privacy' },
    { ok: snap.hasCookieBanner, gap: 'Cookies' },
    { ok: !snap.mixedContent, gap: 'Mix' },
  ]
  return {
    ok: items.filter((i) => i.ok).length,
    total: items.length,
    gaps: items.filter((i) => !i.ok).map((i) => i.gap),
  }
}

function corpusBanner(overview: DomainOverview): string {
  const systemic = overview.systemicIssues[0]
  const worst = worstScore(overview.scores)
  if (systemic) {
    return `${systemic.title} — on ${systemic.pageCount.toLocaleString()} pages.`
  }
  if (worst) {
    return `${worst.label} is the weakest corpus lens at ${worst.value}/100.`
  }
  return overview.lede
}

function corpusLevel(scores: ScoreCard[]): 'ok' | 'warn' | 'critical' {
  const floor = Math.min(...scores.map((s) => s.value), 100)
  if (floor < 40) return 'critical'
  if (floor < 70) return 'warn'
  return 'ok'
}

export function DomainOverviewPanel({
  overview,
  issuesHref,
}: {
  overview: DomainOverview
  issuesHref?: string
}) {
  const t = useT()
  const sortedScores = [...overview.scores].sort((a, b) => a.value - b.value)
  const seo = overview.seoCoverage
  const perf = overview.performance
  const ux = overview.ux
  const eco = overview.eco
  const geo = overview.generative
  const eeat = overview.eeat
  const links = overview.links
  const shield = overview.securityPrivacy ? shieldStats(overview.securityPrivacy) : null
  const issueStats = overview.scan.issueStats
  const issuesPath = issuesHref ?? paths.routes.domainSection(overview.scan.id, 'issues')
  const systemicTop = overview.systemicIssues.slice(0, 8)
  const maxSystemic = Math.max(1, ...systemicTop.map((i) => i.pageCount))
  const weakMeters = sortedScores.slice(0, 3).map((s) => ({
    id: s.kind,
    label: s.label,
    value: `${s.value}`,
    fillPct: Math.max(0, Math.min(100, s.value)),
    meta: scoreTone(s.value) === 'neg' ? 'Pulls the corpus down' : undefined,
  }))

  const notesTiles = [
    links
      ? {
          key: 'links',
          tone: links.broken > 0 ? ('neg' as const) : ('pos' as const),
          value: (links.total ?? links.internal + links.external).toLocaleString(),
          unit: undefined as string | undefined,
          label: 'Links',
          meta: `${links.internal.toLocaleString()} in · ${links.external.toLocaleString()} out · ${links.broken.toLocaleString()} broken`,
        }
      : null,
    shield
      ? {
          key: 'shield',
          tone:
            shield.gaps.length === 0
              ? ('pos' as const)
              : shield.gaps.length === 1
                ? ('low' as const)
                : ('neg' as const),
          value: String(shield.ok),
          unit: `/${shield.total}`,
          label: 'Shield',
          meta: shield.gaps.length === 0 ? 'All clear' : `Missing ${shield.gaps.join(' · ')}`,
        }
      : null,
    issueStats
      ? {
          key: 'errors',
          tone: 'neg' as const,
          value: issueStats.errors.toLocaleString(),
          unit: undefined as string | undefined,
          label: 'Error findings',
          meta: `${issueStats.total.toLocaleString()} total across ${overview.scan.pageCount.toLocaleString()} pages`,
        }
      : null,
    ux
      ? {
          key: 'tap',
          tone: ux.tapTargetIssueCount > 0 ? ('low' as const) : ('pos' as const),
          value: ux.tapTargetIssueCount.toLocaleString(),
          unit: undefined as string | undefined,
          label: 'Tap targets',
          meta: `${ux.pagesWithSkippedLevels.toLocaleString()} pages with skipped headings`,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string
    tone: 'pos' | 'low' | 'neg'
    value: string
    unit?: string
    label: string
    meta: string
  }>

  const vitalTiles = perf
    ? (
        [
          { key: 'TTFB', value: msLabel(perf.avgTtfb), meta: 'avg' },
          { key: 'FCP', value: msLabel(perf.avgFcp), meta: 'avg' },
          { key: 'LCP', value: msLabel(perf.avgLcp), meta: 'avg' },
          { key: 'DOM', value: msLabel(perf.avgDomLoad), meta: 'avg' },
          perf.scriptTransferKbAvg != null
            ? {
                key: 'Script',
                value: String(Math.round(perf.scriptTransferKbAvg)),
                unit: 'KB',
                meta: 'avg transfer',
              }
            : null,
          {
            key: 'Pages',
            value: perf.pageCount.toLocaleString(),
            meta: 'measured',
          },
        ] as Array<{
          key: string
          value: string
          unit?: string
          meta: string
        } | null>
      ).filter(Boolean)
    : []

  const notesTileCount = notesTiles.length
  const vitalsTileCount = vitalTiles.length
  const metricTileRows = Math.max(
    Math.ceil(notesTileCount / 3),
    Math.ceil(vitalsTileCount / 3),
    1,
  )

  const readabilityItems = ux?.readabilityBands
    ? [
        { id: 'easy', label: 'Easy', value: ux.readabilityBands.easy },
        { id: 'standard', label: 'Standard', value: ux.readabilityBands.standard },
        { id: 'complex', label: 'Complex', value: ux.readabilityBands.complex },
        { id: 'very', label: 'Very complex', value: ux.readabilityBands.veryComplex },
      ]
    : []

  const ecoGrades = eco?.gradeDistribution
    ? (['A+', 'A', 'B', 'C', 'D', 'E', 'F'] as const)
        .map((g) => ({ id: g, label: g, value: eco.gradeDistribution?.[g] ?? 0 }))
        .filter((g) => g.value > 0)
    : []

  const wcagSlices = issueStats?.byWcagLevel
    ? (
        [
          { id: 'A', label: 'WCAG A', value: issueStats.byWcagLevel.A ?? 0 },
          { id: 'AA', label: 'WCAG AA', value: issueStats.byWcagLevel.AA ?? 0 },
          { id: 'AAA', label: 'WCAG AAA', value: issueStats.byWcagLevel.AAA ?? 0 },
        ] as const
      ).filter((s) => s.value > 0)
    : []

  const linkSlices = links
    ? [
        { id: 'internal', label: 'Internal', value: links.internal },
        { id: 'external', label: 'External', value: links.external },
        { id: 'broken', label: 'Broken', value: links.broken },
      ].filter((s) => s.value > 0)
    : []

  const sampleMaxScore = Math.max(
    1,
    ...(overview.pageSamples ?? []).map((p) => p.score ?? 0),
  )

  const hasDistributions =
    readabilityItems.length > 0 || ecoGrades.length > 0 || wcagSlices.length > 0 || linkSlices.length > 0

  return (
    <div className="checkion-magazine-body checkion-spread checkion-domain-overview">
      <section className="checkion-spread__open" aria-labelledby="domain-scoreline-heading">
        <div className="checkion-spread__open-main">
          <p className="checkion-spread__eyebrow">{t('domain.scorelineEyebrow')}</p>
          <h3 id="domain-scoreline-heading" className="checkion-spread__headline">
            {t('domain.scorelineHeadline')}
          </h3>
          <ScoresPanel scores={sortedScores as ScoreCard[]} />
        </div>
      </section>

      <StatusMeterPanel
        className="checkion-domain-corpus-signal"
        title={t('domain.corpusSignal')}
        meta={`${overview.scan.pageCount.toLocaleString()} pages`}
        level={corpusLevel(overview.scores)}
        banner={corpusBanner(overview)}
        meters={weakMeters}
      />

      {systemicTop.length > 0 ? (
        <section className="checkion-domain-chapter" aria-labelledby="systemic-heading">
          <header className="checkion-domain-chapter__head">
            <p className="checkion-spread__eyebrow">{t('domain.systemicEyebrow')}</p>
            <h3 id="systemic-heading" className="checkion-spread__headline">
              {t('domain.systemicHeadline')}
            </h3>
            <Hint>{t('domain.systemicHint')}</Hint>
          </header>
          <RankedList
            className="checkion-domain-systemic-rank"
            hint={<Text role="meta">Top {systemicTop.length} · open Issues for the full list</Text>}
          >
            {systemicTop.map((issue, i) => (
              <RankedRow
                key={`${issue.id}-${issue.title}`}
                index={i + 1}
                label={
                  <span className="checkion-domain-rank-label">
                    {issue.severity ? (
                      <Chip static size="sm">
                        {issue.severity}
                      </Chip>
                    ) : null}
                    <span>{issue.title}</span>
                  </span>
                }
                value={`${issue.pageCount.toLocaleString()} pages`}
                barPct={Math.max(8, Math.round((100 * issue.pageCount) / maxSystemic))}
              />
            ))}
          </RankedList>
          <p className="checkion-domain-chapter__foot">
            <Link href={issuesPath} className="checkion-domain-callout__link">
              {t('domain.openSystemic')}
            </Link>
          </p>
        </section>
      ) : null}

      {(notesTileCount > 0 || vitalsTileCount > 0) && (
        <section className="checkion-metrics-spread" aria-labelledby="domain-margins-heading">
          <header className="checkion-metrics-spread__head">
            <p className="checkion-spread__eyebrow">Field notes</p>
            <h3 id="domain-margins-heading" className="checkion-spread__headline">
              {t('domain.marginsHeadline')}
            </h3>
          </header>
          <div
            className="checkion-metrics-spread__body"
            data-chapters={
              notesTileCount > 0 && vitalsTileCount > 0
                ? 'both'
                : notesTileCount > 0
                  ? 'notes'
                  : 'vitals'
            }
            style={{ ['--metric-tile-rows' as string]: String(metricTileRows) }}
          >
            {notesTileCount > 0 ? (
              <div className="checkion-metrics-spread__chapter" data-chapter="notes">
                <p className="checkion-metrics-spread__kicker">Also noted</p>
                <div
                  className="checkion-spread__lab checkion-spread__lab--notes checkion-metrics-spread__tiles"
                  style={{ ['--notes-cols' as string]: String(Math.min(notesTileCount, 3)) }}
                >
                  {notesTiles.map((tile) => (
                    <div key={tile.key} className="checkion-lab-tile" data-tone={tile.tone}>
                      <strong className="checkion-lab-tile__v">
                        {tile.value}
                        {tile.unit ? <span className="checkion-lab-tile__unit">{tile.unit}</span> : null}
                      </strong>
                      <span className="checkion-lab-tile__k">{tile.label}</span>
                      <span className="checkion-lab-tile__m">{tile.meta}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {vitalsTileCount > 0 ? (
              <div className="checkion-metrics-spread__chapter" data-chapter="vitals">
                <p className="checkion-metrics-spread__kicker">Avg lab timings</p>
                <div
                  className="checkion-spread__lab checkion-spread__lab--notes checkion-metrics-spread__tiles"
                  style={{ ['--notes-cols' as string]: String(Math.min(vitalsTileCount, 3)) }}
                >
                  {vitalTiles.map((tile) =>
                    tile ? (
                      <div key={tile.key} className="checkion-lab-tile">
                        <strong className="checkion-lab-tile__v">
                          {tile.value}
                          {tile.unit ? (
                            <span className="checkion-lab-tile__unit">{tile.unit}</span>
                          ) : null}
                        </strong>
                        <span className="checkion-lab-tile__k">{tile.key}</span>
                        <span className="checkion-lab-tile__m">{tile.meta}</span>
                      </div>
                    ) : null,
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {seo ? (
        <section
          className="checkion-domain-chapter checkion-domain-seo"
          aria-labelledby="seo-heading"
        >
          <div className="checkion-domain-seo__layout">
            <div className="checkion-domain-seo__lede">
              <DomainSeoReading
                domainId={overview.scan.id}
                fallback={buildSeoReadingFallback(overview)}
              />
            </div>
            <div className="checkion-domain-seo__meters">
              <ReadoutMeterList aria-label="SEO coverage meters">
                {(
                  [
                    { id: 'title', label: 'Title', have: seo.withTitle },
                    { id: 'h1', label: 'H1', have: seo.withH1 },
                    { id: 'meta', label: 'Meta description', have: seo.withMetaDescription },
                    { id: 'canonical', label: 'Canonical', have: seo.withCanonical },
                    seo.withOgTitle != null
                      ? { id: 'og', label: 'Open Graph title', have: seo.withOgTitle }
                      : null,
                    seo.withTwitterCard != null
                      ? { id: 'tw', label: 'Twitter card', have: seo.withTwitterCard }
                      : null,
                  ] as Array<{ id: string; label: string; have: number } | null>
                )
                  .filter(Boolean)
                  .map((row) => {
                    const pct = coveragePct(row!.have, seo.totalPages)
                    return (
                      <ReadoutMeter
                        key={row!.id}
                        label={
                          row!.id === 'title' ? (
                            <LabelWithTip tipId="domain.seo_coverage">{row!.label}</LabelWithTip>
                          ) : (
                            row!.label
                          )
                        }
                        pct={pct}
                        valueLabel={`${row!.have.toLocaleString()}/${seo.totalPages.toLocaleString()} · ${pct}%`}
                      />
                    )
                  })}
              </ReadoutMeterList>
            </div>
          </div>
        </section>
      ) : null}

      {hasDistributions ? (
        <section className="checkion-domain-chapter" aria-labelledby="dist-heading">
          <header className="checkion-domain-chapter__head">
            <p className="checkion-spread__eyebrow">Distributions</p>
            <h3 id="dist-heading" className="checkion-spread__headline">
              <LabelWithTip tipId="domain.distribution">Share across the corpus</LabelWithTip>
            </h3>
            <Hint>Donuts for composition — rankings stay as bars above.</Hint>
          </header>
          <div className="checkion-domain-grid checkion-domain-grid--dist">
            {readabilityItems.length > 0 ? (
              <div className="checkion-domain-card checkion-domain-card--flush">
                <h4>Readability</h4>
                {ux ? (
                  <Text role="meta">
                    Corpus grade {ux.readabilityGrade}
                    {ux.dwellSecondsMedian != null
                      ? ` · median dwell ${ux.dwellSecondsMedian}s`
                      : ''}
                  </Text>
                ) : null}
                <DistributionDonut
                  aria-label="Readability band share"
                  slices={readabilityItems}
                  centerValue={ux?.readabilityScore}
                  centerLabel="score"
                />
              </div>
            ) : null}
            {ecoGrades.length > 0 && eco ? (
              <div className="checkion-domain-card checkion-domain-card--flush">
                <h4>Eco grades</h4>
                <Text role="meta">
                  Dominant {eco.grade} · avg {eco.avgCo2} g CO₂
                </Text>
                <DistributionDonut
                  aria-label="Eco grade share"
                  slices={ecoGrades}
                  centerValue={eco.grade}
                  centerLabel="mode"
                />
              </div>
            ) : null}
            {linkSlices.length > 0 && links ? (
              <div className="checkion-domain-card checkion-domain-card--flush">
                <h4>Link mix</h4>
                <Text role="meta">
                  {(links.total ?? links.internal + links.external).toLocaleString()} total
                </Text>
                <DistributionDonut
                  aria-label="Internal, external and broken links"
                  slices={linkSlices}
                  centerValue={links.broken.toLocaleString()}
                  centerLabel="broken"
                />
              </div>
            ) : null}
            {wcagSlices.length > 0 ? (
              <div className="checkion-domain-card checkion-domain-card--flush">
                <h4>WCAG findings</h4>
                <Text role="meta">
                  {(issueStats?.errors ?? 0).toLocaleString()} error findings by level
                </Text>
                <DistributionDonut
                  aria-label="WCAG finding levels"
                  slices={[...wcagSlices]}
                  centerValue="AA"
                  centerLabel="heavy"
                />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {(eeat || geo || overview.classification || overview.infra) && (
        <section className="checkion-domain-chapter" aria-labelledby="trust-heading">
          <header className="checkion-domain-chapter__head">
            <p className="checkion-spread__eyebrow">Trust · GEO · Themes</p>
            <h3 id="trust-heading" className="checkion-spread__headline">
              How the domain presents itself
            </h3>
            {eeat || geo ? (
              <DomainTrustGeoReading
                domainId={overview.scan.id}
                fallback={buildTrustGeoReadingFallback(overview)}
              />
            ) : null}
          </header>
          <div className="checkion-domain-grid">
            {eeat ? (
              <div className="checkion-domain-card">
                <h4>
                  <LabelWithTip tipId="domain.eeat">E-E-A-T coverage</LabelWithTip>
                </h4>
                <ReadoutMeterList aria-label="E-E-A-T page coverage">
                  {(
                    [
                      { id: 'contact', label: 'Contact', have: eeat.trust.pagesWithContact },
                      { id: 'privacy', label: 'Privacy', have: eeat.trust.pagesWithPrivacy },
                      { id: 'impressum', label: 'Impressum', have: eeat.trust.pagesWithImpressum },
                      { id: 'about', label: 'About', have: eeat.experience.pagesWithAbout },
                      { id: 'team', label: 'Team', have: eeat.experience.pagesWithTeam },
                    ] as const
                  ).map((row) => {
                    const pct = coveragePct(row.have, eeat.totalPages)
                    return (
                      <ReadoutMeter
                        key={row.id}
                        label={row.label}
                        pct={pct}
                        valueLabel={`${row.have.toLocaleString()} · ${pct}%`}
                      />
                    )
                  })}
                </ReadoutMeterList>
                <Text role="meta">
                  Avg citations / page {eeat.expertise.avgCitationsPerPage.toFixed(2)}
                </Text>
              </div>
            ) : null}
            {geo ? (
              <div className="checkion-domain-card">
                <h4>GEO aggregate</h4>
                <ReadoutMeterList aria-label="GEO scores">
                  <ReadoutMeter
                    label={<LabelWithTip tipId="geo.score">Score</LabelWithTip>}
                    pct={geo.score}
                    valueLabel={`${geo.score}`}
                  />
                  <ReadoutMeter
                    label={<LabelWithTip tipId="geo.discoverability">Discoverability</LabelWithTip>}
                    pct={geo.discoverability}
                    valueLabel={`${geo.discoverability}`}
                  />
                  <ReadoutMeter
                    label={<LabelWithTip tipId="geo.repurposing">Repurposing</LabelWithTip>}
                    pct={geo.repurposing}
                    valueLabel={`${geo.repurposing}`}
                  />
                </ReadoutMeterList>
                <dl className="checkion-domain-facts">
                  <div>
                    <dt>llms.txt pages</dt>
                    <dd>{geo.withLlmsTxt.toLocaleString()}</dd>
                  </div>
                  {geo.withRobotsAllowingAi != null ? (
                    <div>
                      <dt>AI-allowing robots</dt>
                      <dd>{geo.withRobotsAllowingAi.toLocaleString()}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ) : null}
            {overview.infra || overview.classification ? (
              <div className="checkion-domain-card">
                <h4>Infra &amp; themes</h4>
                {overview.infra ? (
                  <dl className="checkion-domain-facts">
                    <div>
                      <dt>Host</dt>
                      <dd>
                        {overview.infra.hostingServer ?? overview.infra.cdnProvider ?? '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>Location</dt>
                      <dd>
                        {[overview.infra.city, overview.infra.country].filter(Boolean).join(', ') ||
                          '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>Platforms</dt>
                      <dd>{overview.infra.platforms?.join(', ') || '—'}</dd>
                    </div>
                  </dl>
                ) : null}
                {overview.classification?.tags?.length ? (
                  <div className="checkion-chip-row">
                    {overview.classification.tags.slice(0, 6).map((t) => (
                      <Chip key={t} static size="sm">
                        {t}
                      </Chip>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      )}

      {overview.pageSamples && overview.pageSamples.length > 0 ? (
        <section className="checkion-domain-chapter" aria-labelledby="samples-heading">
          <header className="checkion-domain-chapter__head">
            <p className="checkion-spread__eyebrow">{t('domain.samplesEyebrow')}</p>
            <h3 id="samples-heading" className="checkion-spread__headline">
              {t('domain.samplesHeadline')}
            </h3>
            <Text role="meta">{t('domain.samplesMeta')}</Text>
          </header>
          <RankedList>
            {overview.pageSamples.slice(0, 8).map((page, i) => (
              <RankedRow
                key={page.scanId ?? page.url}
                index={i + 1}
                label={compactPath(page.url)}
                secondary={page.url}
                href={
                  page.scanId
                    ? paths.routes.resultSection(page.scanId, 'overview')
                    : undefined
                }
                linkComponent={Link}
                value={
                  page.score != null
                    ? `${page.score}${page.errors != null ? ` · ${page.errors} err` : ''}`
                    : '—'
                }
                barPct={
                  page.score != null
                    ? Math.max(4, Math.round((100 * page.score) / sampleMaxScore))
                    : undefined
                }
              />
            ))}
          </RankedList>
        </section>
      ) : null}
    </div>
  )
}
