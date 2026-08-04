import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  Chip,
  EmptyState,
  Hint,
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
import { getProject } from '../lib/fixtures/project-store'
import { hasAudionCorrelation } from '../lib/scan-correlation'
import { IssuesWorkspace } from './issues-workspace'
import { ResultSectionNav } from './result-section-nav'
import { ScoresPanel } from './scores-panel'
import { WeakestSignalCallout } from './weakest-signal-callout'
import { buildWeakestSignalFallback } from '../lib/weakest-signal-statement'

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

function intensityLabel(tier: number): string {
  if (tier <= 1) return 'Light'
  if (tier === 2) return 'Moderate'
  if (tier === 3) return 'Dense'
  if (tier === 4) return 'Heavy'
  return 'Extreme'
}

function readabilityTone(score: number): 'pos' | 'low' | 'neg' {
  if (score >= 70) return 'pos'
  if (score >= 55) return 'low'
  return 'neg'
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function pathFromUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname === '/' ? '/' : u.pathname
  } catch {
    return url
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

export async function ResultMagazineShell({
  overview,
  actions,
  children,
  variant = 'cover',
  activeSection = 'overview',
  sectionBase = 'results',
}: {
  overview: ScanOverview
  actions?: ReactNode
  children: ReactNode
  /** Full cover for overview; compact folio masthead for issues/detail */
  variant?: 'cover' | 'folio'
  activeSection?: 'overview' | 'issues' | 'detail'
  sectionBase?: 'results' | 'domain'
}) {
  const project = await getProject(overview.scan.projectId)
  const { scan } = overview
  const host = hostFromUrl(scan.url)
  const path = pathFromUrl(scan.url)
  const deck = overview.classification?.shortSummary ?? overview.lede
  const tone = scoreTone(scan.overallScore)

  return (
    <article
      className="checkion-magazine checkion-magazine--scan checkion-magazine--editorial"
      data-variant={variant}
    >
      <div className="checkion-magazine-topbar">
        <nav className="briefing-nav signal-nav" aria-label="Breadcrumb">
          <Link href={paths.routes.results}>Results</Link>
          <span className="briefing-nav-sep" aria-hidden>
            /
          </span>
          <Link href={paths.routes.projectDetail(overview.scan.projectId)}>
            {project?.name ?? overview.scan.projectId}
          </Link>
          <span className="briefing-nav-sep" aria-hidden>
            /
          </span>
          <span>{overview.scan.id}</span>
        </nav>
        {actions ? <div className="checkion-magazine-topbar-actions">{actions}</div> : null}
      </div>

      <header className="checkion-masthead" data-tone={tone} data-variant={variant}>
        <div className="checkion-masthead__hero">
          <div className="checkion-cover__score-col">
            <div
              className="checkion-cover__score"
              aria-label={`Overall score ${scan.overallScore ?? 'none'}`}
            >
              <span className="checkion-cover__score-num">{scan.overallScore ?? '—'}</span>
              <span className="checkion-cover__score-label">overall</span>
            </div>
            <dl className="checkion-cover__metrics" aria-label="Scan metrics">
              <div>
                <dt>Issues</dt>
                <dd>{scan.issueCount}</dd>
              </div>
              {scan.issueStats ? (
                <>
                  <div>
                    <dt>Errors</dt>
                    <dd>{scan.issueStats.errors}</dd>
                  </div>
                  <div>
                    <dt>Warnings</dt>
                    <dd>{scan.issueStats.warnings}</dd>
                  </div>
                  <div>
                    <dt>Passed</dt>
                    <dd>{scan.issueStats.passed}</dd>
                  </div>
                </>
              ) : (
                <>
                  {overview.scores.slice(0, 3).map((s) => (
                    <div key={s.kind}>
                      <dt>{s.label}</dt>
                      <dd>{s.value}</dd>
                    </div>
                  ))}
                </>
              )}
            </dl>
          </div>

          <div className="checkion-cover__copy">
            <p className="checkion-cover__host">{host}</p>
            <Text role="headline" as="h2" className="checkion-cover__title">
              {overview.seo?.h1 ?? (path === '/' ? 'Home' : path)}
            </Text>
            {variant === 'cover' ? (
              <>
                <p className="checkion-cover__deck">{deck}</p>
                {overview.classification?.tags?.length ? (
                  <div className="checkion-chip-row checkion-cover__tags">
                    {overview.classification.tags.map((tag) => (
                      <Chip key={tag} static size="sm">
                        {tag}
                      </Chip>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </header>

      {hasAudionCorrelation(scan) ? (
        <Hint panel>
          From Audion
          {scan.audionRunId ? ` · run ${scan.audionRunId}` : ''}
          {scan.stepUrl && scan.stepUrl !== scan.url ? ` · step ${scan.stepUrl}` : ''}
          {scan.platformProjectId ? ` · Collection ${scan.platformProjectId}` : ''}
          . Results live in CHECKION for this Collection project.
        </Hint>
      ) : null}

      <ResultSectionNav scanId={scan.id} active={activeSection} base={sectionBase} />

      {children}
    </article>
  )
}

export function ResultOverviewPanel({
  overview,
  issuesHref,
}: {
  overview: ScanOverview
  issuesHref?: string
}) {
  const running = overview.scan.status === 'running' || overview.scan.status === 'queued'
  const perf = overview.performance
  const seo = overview.seo
  const eco = overview.eco
  const ux = overview.ux
  const links = overview.links
  const geo = overview.generative
  const sortedScores = [...overview.scores].sort((a, b) => a.value - b.value)
  const shield = overview.securityPrivacy ? shieldStats(overview.securityPrivacy) : null
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
          title="Scan in progress"
          meta={overview.scan.mode}
          level="warn"
          banner="Dummy fixture still marked running — open a completed scan for full scores."
          meters={[
            { id: 'fetch', label: 'Fetch', value: '…', fillPct: 40 },
            { id: 'rules', label: 'Rules', value: '…', fillPct: 18 },
            { id: 'score', label: 'Score', value: '…', fillPct: 5 },
          ]}
        />
      ) : null}

      {/* Opening spread: scoreline + tension callout */}
      <section className="checkion-spread__open" aria-labelledby="scoreline-heading">
        <div className="checkion-spread__open-main">
          <p className="checkion-spread__eyebrow">Scoreline</p>
          <h3 id="scoreline-heading" className="checkion-spread__headline">
            Seven lenses on one page
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
            <p className="checkion-spread__eyebrow">Field notes</p>
            <h3 id="metrics-heading" className="checkion-spread__headline">
              Margins &amp; pace
            </h3>
          </header>

          <div
            className="checkion-metrics-spread__body"
            data-chapters={notesTileCount > 0 && perf ? 'both' : notesTileCount > 0 ? 'notes' : 'vitals'}
            style={{ ['--metric-tile-rows' as string]: String(metricTileRows) }}
          >
            {notesTileCount > 0 ? (
              <div className="checkion-metrics-spread__chapter" data-chapter="notes">
                <p className="checkion-metrics-spread__kicker">Also noted</p>
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
                      <span className="checkion-lab-tile__k">Freshness</span>
                      <span className="checkion-lab-tile__m">
                        {overview.freshness.confidence} confidence
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
                      <span className="checkion-lab-tile__k">Shield</span>
                      <span className="checkion-lab-tile__m">
                        {shield.gaps.length === 0
                          ? 'All clear'
                          : `Missing ${shield.gaps.join(' · ')}`}
                      </span>
                    </div>
                  ) : null}
                  {clearedCount != null ? (
                    <div className="checkion-lab-tile" data-tone="pos">
                      <strong className="checkion-lab-tile__v">{clearedCount}</strong>
                      <span className="checkion-lab-tile__k">Cleared</span>
                      <span className="checkion-lab-tile__m">
                        {overview.passedChecks?.[0]?.description ?? 'checks already clean'}
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
                        {sib.id === overview.scan.id ? 'This scan' : 'Sibling device'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {perf ? (
              <div className="checkion-metrics-spread__chapter" data-chapter="vitals">
                <p className="checkion-metrics-spread__kicker">What slows</p>
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
                        value: perf.ttfb,
                        meta: 'Time to first byte',
                        tone: vitalTone(perf.ttfb, 200, 500),
                      },
                      {
                        key: 'FCP',
                        value: perf.fcp,
                        meta: 'First contentful paint',
                        tone: vitalTone(perf.fcp, 1800, 3000),
                      },
                      {
                        key: 'LCP',
                        value: perf.lcp,
                        meta: 'Largest contentful paint',
                        tone: vitalTone(perf.lcp, 2500, 4000),
                      },
                      {
                        key: 'DOM',
                        value: perf.domLoad,
                        meta: 'DOM content loaded',
                        tone: vitalTone(perf.domLoad, 2000, 3500),
                      },
                      {
                        key: 'Load',
                        value: perf.windowLoad,
                        meta: 'Window load',
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
                        <span className="checkion-lab-tile__k">{vital.key}</span>
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
                      <span className="checkion-lab-tile__k">Scripts</span>
                      <span className="checkion-lab-tile__m">Transfer weight</span>
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
            <aside className="checkion-page-spread__reading" aria-label="Reading profile">
              {ux?.readabilityGrade ? (
                <p
                  className="checkion-page-spread__cefr"
                  data-tone={
                    ux.readabilityScore != null ? readabilityTone(ux.readabilityScore) : undefined
                  }
                >
                  <span className="checkion-page-spread__cefr-copy">
                    <span className="checkion-page-spread__cefr-label">Readability</span>
                    <span className="checkion-page-spread__cefr-meta">
                      CEFR band from page copy (mapped from Flesch–Kincaid)
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
                    <span>Clarity</span>
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
                    <span>Complexity</span>
                    <strong>{intensityLabel(overview.classification.intensityTier)}</strong>
                  </div>
                  <ol
                    className="checkion-page-spread__tiers"
                    aria-label={`Intensity ${overview.classification.intensityTier} of 5`}
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
                  <em>{seo.wordCount.toLocaleString('en')}</em>
                  {' words on the page'}
                  {seo.skinnyContent ? ' — still reading skinny.' : '.'}
                </p>
              ) : null}
            </aside>
          )}

          <div className="checkion-page-spread__story">
            <p className="checkion-spread__eyebrow">On the page</p>
            <h3 id="feature-heading" className="checkion-spread__headline checkion-spread__headline--story">
              {seo?.title ?? overview.classification?.shortSummary ?? 'Untitled document'}
            </h3>
            {seo?.metaDescription ? (
              <p className="checkion-spread__prose">{seo.metaDescription}</p>
            ) : overview.classification?.shortSummary && seo?.title ? (
              <p className="checkion-spread__prose">{overview.classification.shortSummary}</p>
            ) : null}

            <dl className="checkion-page-dossier">
              {seo?.h1 ? (
                <div className="checkion-page-dossier__row checkion-page-dossier__row--chips">
                  <dt>H1</dt>
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
                  <dt>Lengths</dt>
                  <dd>
                    <div className="checkion-chip-row">
                      <Chip static size="sm">
                        Title {seo.titleLength}
                      </Chip>
                      <Chip static size="sm">
                        Meta {seo.metaDescriptionLength}
                      </Chip>
                    </div>
                  </dd>
                </div>
              ) : null}
              {ux ? (
                <div className="checkion-page-dossier__row checkion-page-dossier__row--chips">
                  <dt>Structure</dt>
                  <dd>
                    <div className="checkion-chip-row">
                      <Chip static size="sm">
                        {ux.headingH1Count} H1
                      </Chip>
                      <Chip static size="sm">
                        {ux.skippedHeadingLevels ? 'Skipped levels' : 'Levels intact'}
                      </Chip>
                      {ux.hasSkipLink ? (
                        <Chip static size="sm">
                          Skip link
                        </Chip>
                      ) : null}
                    </div>
                  </dd>
                </div>
              ) : null}
              {seo ? (
                <div className="checkion-page-dossier__row checkion-page-dossier__row--chips">
                  <dt>Signals</dt>
                  <dd>
                    <div className="checkion-chip-row">
                      {(
                        [
                          seo.hasOpenGraph ? 'OG' : null,
                          seo.hasJsonLd ? 'JSON-LD' : null,
                          seo.robots ?? null,
                          seo.skinnyContent ? 'Skinny' : 'Dense',
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
                  <dt>Canonical</dt>
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
                  <dt>Classed</dt>
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
        <section className="checkion-spread__lab" aria-label="UX eco links">
          {ux ? (
            <div className="checkion-lab-tile" data-tone={scoreTone(ux.score)}>
              <span className="checkion-lab-tile__k">UX lab</span>
              <strong className="checkion-lab-tile__v">{ux.score}</strong>
              <span className="checkion-lab-tile__m">
                {[
                  `CLS ${ux.cls}`,
                  ux.mobileFriendly ? 'Mobile' : 'Not mobile',
                  `${ux.tapTargetIssueCount} taps`,
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
              <span className="checkion-lab-tile__k">Eco · {eco.grade}</span>
              <strong className="checkion-lab-tile__v">{eco.co2.toFixed(2)}g</strong>
              <span className="checkion-lab-tile__m">
                {eco.pageWeightKb} KB
                {eco.greenWebHosted === true
                  ? ' · green host'
                  : eco.greenWebHosted === false
                    ? ' · not green'
                    : ''}
              </span>
            </div>
          ) : null}
          {links ? (
            <div
              className="checkion-lab-tile"
              data-tone={links.broken > 0 || links.missingNoopener > 0 ? 'neg' : 'pos'}
            >
              <span className="checkion-lab-tile__k">Links</span>
              <strong className="checkion-lab-tile__v">{links.broken}</strong>
              <span className="checkion-lab-tile__m">
                broken · {links.internal}/{links.external} in/out
                {links.missingNoopener > 0 ? ` · ${links.missingNoopener} noopener` : ''}
              </span>
            </div>
          ) : null}
        </section>
      )}

      {/* GEO chapter — magazine lens, still not a full report */}
      {geo ? (
        <section className="checkion-geo-spread" aria-labelledby="geo-heading" data-tone={scoreTone(geo.score)}>
          <header className="checkion-geo-spread__head">
            <p className="checkion-spread__eyebrow">GEO</p>
            <h3 id="geo-heading" className="checkion-spread__headline">
              How machines find the page
            </h3>
            <p className="checkion-geo-spread__lede">
              {geo.hasLlmsTxt && geo.hasFaqSchema
                ? 'Structured answers and an llms.txt give engines a clear entry.'
                : geo.hasFaqSchema && !geo.hasLlmsTxt
                  ? 'FAQ schema is present, but without llms.txt discoverability stays soft.'
                  : geo.hasLlmsTxt && !geo.hasFaqSchema
                    ? 'llms.txt is in place; FAQ schema would still sharpen answers.'
                    : 'Neither FAQ schema nor llms.txt — engines have little to latch onto.'}
            </p>
          </header>

          <div className="checkion-geo-spread__body">
            <p className="checkion-geo-spread__score" aria-label={`GEO score ${geo.score}`}>
              <span className="checkion-geo-spread__score-num">{geo.score}</span>
              <span className="checkion-geo-spread__score-label">GEO score</span>
            </p>

            <div className="checkion-geo-spread__signals">
              <div className="checkion-geo-spread__meter" data-tone={scoreTone(geo.discoverability)}>
                <div className="checkion-geo-spread__meter-head">
                  <span>Discoverability</span>
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
                  <span>Repurposing</span>
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

              <div className="checkion-chip-row checkion-geo-spread__presence" aria-label="GEO presence">
                <Chip static size="sm">
                  {geo.hasFaqSchema ? 'FAQ schema' : 'No FAQ schema'}
                </Chip>
                <Chip static size="sm">
                  {geo.hasLlmsTxt ? 'llms.txt' : 'No llms.txt'}
                </Chip>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {overview.topIssues[0] ? (
        <blockquote className="checkion-pullquote checkion-pullquote--center">
          <p className="checkion-spread__eyebrow">From the dossier</p>
          <p className="checkion-pullquote__text">{overview.topIssues[0].title}</p>
          <footer>
            {overview.topIssues[0].severity} · ×{overview.topIssues[0].affectedCount}
            {issuesHref ? (
              <>
                {' · '}
                <Link href={issuesHref}>Open issues</Link>
              </>
            ) : null}
          </footer>
        </blockquote>
      ) : null}

      {/* Issues as main drama */}
      <section className="checkion-spread__breaks" aria-labelledby="breaks-heading">
        <div className="checkion-spread__breaks-head">
          <div>
            <p className="checkion-spread__eyebrow">Findings</p>
            <h3 id="breaks-heading" className="checkion-spread__headline">
              What breaks
            </h3>
          </div>
          {issuesHref ? (
            <Link href={issuesHref} className="checkion-band-action">
              All issues →
            </Link>
          ) : null}
        </div>
        <IssueList issues={overview.topIssues} />
      </section>
    </div>
  )
}

export function IssueList({ issues }: { issues: IssueSummary[] }) {
  if (issues.length === 0) {
    return <EmptyState>No issues in this payload.</EmptyState>
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
            issue.affectedCount === 1 ? 'hit' : 'hits'
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
  return (
    <div className="checkion-magazine-body checkion-spread checkion-issues-panel">
      <header className="checkion-issues-panel__head">
        <p className="checkion-spread__eyebrow">Chapter 02 · Issues</p>
        <h3 id="issues-chapter" className="checkion-issues-panel__title">
          Visual inspect
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
  const sorted = [...scores].sort((a, b) => a.value - b.value)
  const worst = sorted[0]
  const best = sorted[sorted.length - 1]
  const span =
    worst && best ? Math.max(0, best.value - worst.value) : null

  return (
    <div className="checkion-magazine-body checkion-spread">
      <section className="checkion-spread__open" aria-labelledby="ledger-heading">
        <div className="checkion-spread__open-main">
          <p className="checkion-spread__eyebrow">Chapter 03</p>
          <h3 id="ledger-heading" className="checkion-spread__headline">
            The ledger
          </h3>
          <p className="checkion-spread__prose">
            Category scores from the light payload — sorted weakest first so the tension reads
            immediately.
          </p>
          <div className="checkion-score-ledger" aria-label="Score ledger">
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
          <p className="checkion-spread__eyebrow">Range</p>
          <p className="checkion-spread__callout-num">{span ?? '—'}</p>
          <p className="checkion-spread__callout-label">points between best &amp; worst</p>
          <p className="checkion-spread__callout-body">
            {worst && best
              ? `${worst.label} at ${worst.value} vs ${best.label} at ${best.value}.`
              : 'No category scores yet.'}
            {overall != null ? ` Overall ${overall}.` : ''}
          </p>
        </aside>
      </section>
    </div>
  )
}
