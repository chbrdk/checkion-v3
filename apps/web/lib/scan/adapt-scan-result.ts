/**
 * Map CHECKION v2 `ScanResult` → `@checkion-v3/contracts` overview / issues / scores.
 */

import type {
  DomainEcoAggregate,
  DomainEeatAggregate,
  DomainGenerativeAggregate,
  DomainOverview,
  DomainPerformanceAggregate,
  DomainScanLight,
  DomainSeoCoverage,
  DomainSystemicIssue,
  DomainUxAggregate,
  IssueSeverity,
  IssueStats,
  IssueSummary,
  LinkSnapshot,
  ScanOverview,
  ScanSummary,
  ScoreCard,
  ScoreKind,
  SecurityPrivacySnapshot,
  UxSnapshot,
} from '@checkion-v3/contracts'
import type {
  DomainScanResultWithFullPages,
  EeatDomainAggregate,
  Issue,
  ScanResult,
} from './types'
import { synthesizeDomainPageSampleScanId } from '../domain-issue-page-synth'
import { normalizeUxReadability } from '../readability-cefr'
import { apiScanScreenshot } from './constants'
import { selectTopIssueGroups } from '../issue-groups'

function mapSeverity(type: Issue['type']): IssueSeverity {
  if (type === 'error') return 'critical'
  if (type === 'warning') return 'serious'
  return 'minor'
}

function issueSection(code: string): IssueSummary['section'] {
  const lower = code.toLowerCase()
  if (lower.includes('seo') || lower.startsWith('document-title') || lower.includes('meta-')) {
    return 'seo'
  }
  if (lower.includes('tap') || lower.includes('target-size') || lower.includes('skip')) {
    return 'ux'
  }
  return 'accessibility'
}

export function mapScanIssues(result: ScanResult, scanId: string): IssueSummary[] {
  return result.issues.map((issue, idx) => ({
    id: `${scanId}-i${idx}`,
    scanId,
    severity: mapSeverity(issue.type),
    ruleId: issue.code,
    title: issue.message.slice(0, 200) || issue.code,
    section: issueSection(issue.code),
    affectedCount: 1,
    detail: issue.message,
    selector: issue.selector || undefined,
    context: issue.context || undefined,
    runner: issue.runner,
    wcagLevel: issue.wcagLevel,
    helpUrl: issue.helpUrl ?? null,
    boundingBox: issue.boundingBox,
  }))
}

function score(kind: ScoreKind, label: string, value: number | null | undefined): ScoreCard {
  return {
    kind,
    label,
    value: Math.max(0, Math.min(100, Math.round(value ?? 0))),
    max: 100,
  }
}

export function mapScanScores(result: ScanResult): ScoreCard[] {
  const accessibility = Math.max(
    0,
    100 - result.stats.errors * 8 - result.stats.warnings * 3 - result.stats.notices,
  )
  return [
    score('accessibility', 'Accessibility', accessibility),
    score('seo', 'SEO', result.seo ? estimateSeoScore(result) : result.score),
    score('performance', 'Performance', estimatePerfScore(result)),
    score('best_practices', 'Best practices', result.score),
    score('ux', 'UX', result.ux?.score ?? result.score),
    score('eco', 'Eco', ecoGradeToScore(result.eco?.grade)),
    score('generative', 'GEO', result.generative?.score ?? 50),
  ]
}

function ecoGradeToScore(grade: ScanResult['eco']['grade'] | undefined): number {
  const map: Record<string, number> = {
    'A+': 98,
    A: 90,
    B: 78,
    C: 65,
    D: 50,
    E: 35,
    F: 20,
  }
  return map[grade ?? 'C'] ?? 60
}

function estimateSeoScore(result: ScanResult): number {
  const seo = result.seo
  if (!seo) return result.score
  let s = 70
  if (seo.title) s += 5
  if (seo.metaDescription) s += 5
  if (seo.h1) s += 5
  if (seo.ogTitle) s += 3
  if ((seo.keywordAnalysis?.topKeywords.length ?? 0) > 0) s += 4
  if (seo.skinnyContent) s -= 15
  if (seo.duplicateContentWarning) s -= 10
  return Math.max(0, Math.min(100, s))
}

function estimatePerfScore(result: ScanResult): number {
  const p = result.performance
  if (!p) return result.score
  let s = 90
  if (p.lcp > 4000) s -= 25
  else if (p.lcp > 2500) s -= 12
  if (p.fcp > 3000) s -= 10
  if (p.ttfb > 800) s -= 10
  return Math.max(0, Math.min(100, s))
}

function mapIssueStats(result: ScanResult): IssueStats {
  return {
    errors: result.stats.errors,
    warnings: result.stats.warnings,
    notices: result.stats.notices,
    total: result.stats.total,
    passed: result.passes?.length ?? 0,
  }
}

export function mapScanSummary(
  result: ScanResult,
  input: { id: string; projectId: string; mode: 'single' | 'deep' },
): ScanSummary {
  return {
    id: input.id,
    projectId: input.projectId,
    mode: input.mode,
    url: result.url,
    status: 'completed',
    startedAt: result.timestamp,
    completedAt: new Date().toISOString(),
    overallScore: Math.round(result.ux?.score ?? result.score),
    issueCount: result.stats.total,
    groupId: result.groupId ?? null,
    device: result.device,
    standard: result.standard,
    runners: result.runners,
    durationMs: result.durationMs,
    issueStats: mapIssueStats(result),
  }
}

export function adaptScanResultToContracts(
  result: ScanResult,
  input: { id: string; projectId: string; mode: 'single' | 'deep' },
): { scan: ScanSummary; issues: IssueSummary[]; scores: ScoreCard[]; overview: ScanOverview } {
  const scan = mapScanSummary(result, input)
  const issues = mapScanIssues(result, input.id)
  const scores = mapScanScores(result)
  const overview = buildOverviewFromResult(result, scan, issues, scores)
  return { scan, issues, scores, overview }
}

function mapUx(result: ScanResult): UxSnapshot | undefined {
  const ux = result.ux
  if (!ux) return undefined
  const raw: UxSnapshot = {
    score: ux.score,
    cls: ux.cls ?? 0,
    readabilityGrade: ux.readability?.grade ?? '',
    readabilityScore: ux.readability?.score ?? 0,
    mobileFriendly: Boolean(ux.viewport?.isMobileFriendly ?? true),
    brokenLinkCount: ux.brokenLinks?.length ?? result.links?.broken?.length ?? 0,
    tapTargetIssueCount: ux.tapTargets?.issues?.length ?? ux.tapTargets?.details?.length ?? 0,
    hasSkipLink: Boolean(ux.hasSkipLink),
    headingH1Count: ux.headingHierarchy?.h1Count ?? (result.seo?.h1 ? 1 : 0),
    skippedHeadingLevels: Boolean(ux.headingHierarchy?.skippedLevels?.length),
    skipLinkHref: ux.skipLinkHref ?? null,
    dwellSecondsMedian: ux.dwellEstimate?.secondsMedian ?? null,
    dwellConfidence: ux.dwellEstimate?.confidence ?? null,
    resourceHintPreloadCount: ux.resourceHints?.preload?.length,
    resourceHintPreconnectCount: ux.resourceHints?.preconnect?.length,
    reducedMotionInCss: ux.reducedMotionInCss,
    focusVisibleFailCount: ux.focusVisibleFailCount,
    longTaskCount: ux.longTasks?.count,
    longTaskMaxMs: ux.longTasks?.maxDurationMs,
    formMissingAutocomplete: ux.formAccessibility?.missingAutocomplete,
    formSuspiciousInputType: ux.formAccessibility?.suspiciousInputType,
    videosWithoutCaptions: ux.mediaAccessibility?.videosWithoutCaptions,
    audiosWithoutTranscript: ux.mediaAccessibility?.audiosWithoutTranscript,
    imageMissingDimensions: ux.imageIssues?.missingDimensions,
    imageMissingLazy: ux.imageIssues?.missingLazy,
    imageMissingSrcset: ux.imageIssues?.missingSrcset,
    metaRefreshPresent: ux.metaRefreshPresent,
    fontDisplayIssueCount: ux.fontDisplayIssues?.withoutFontDisplay,
    skippedHeadingPairs: ux.headingHierarchy?.skippedLevels?.map((s) => `${s.from}→${s.to}`),
  }
  return normalizeUxReadability(raw)
}

export function buildOverviewFromResult(
  result: ScanResult,
  scan: ScanSummary,
  issues: IssueSummary[],
  scores: ScoreCard[],
): ScanOverview {
  const seo = result.seo
  const gen = result.generative
  const security = result.security
  const privacy = result.privacy

  return {
    scan,
    scores,
    topIssues: selectTopIssueGroups(issues, 8),
    lede: `Live scan of ${result.url} — ${result.stats.errors} errors, ${result.stats.warnings} warnings (${result.durationMs}ms).`,
    performance: result.performance
      ? {
          ttfb: result.performance.ttfb,
          fcp: result.performance.fcp,
          lcp: result.performance.lcp,
          domLoad: result.performance.domLoad,
          windowLoad: result.performance.windowLoad,
          inp: result.performance.inp ?? null,
          nextHopProtocol: result.performance.nextHopProtocol ?? null,
          scriptTransferKb: result.performance.scriptTransferBytesApprox
            ? Math.round(result.performance.scriptTransferBytesApprox / 1024)
            : null,
        }
      : undefined,
    seo: seo
      ? {
          title: seo.title ?? null,
          titleLength: seo.title?.length ?? 0,
          metaDescription: seo.metaDescription ?? null,
          metaDescriptionLength: seo.metaDescription?.length ?? 0,
          h1: seo.h1 ?? null,
          canonical: seo.canonical ?? null,
          robots: null,
          wordCount: seo.bodyWordCount ?? seo.keywordAnalysis?.totalWords ?? 0,
          hasOpenGraph: Boolean(seo.ogTitle || seo.ogDescription || seo.ogImage),
          hasJsonLd: Boolean(
            (seo.structuredDataRequiredFields?.length ?? 0) > 0 ||
              (gen?.technical.schemaCoverage?.length ?? 0) > 0,
          ),
          skinnyContent: Boolean(seo.skinnyContent),
          ogTitle: seo.ogTitle ?? null,
          ogDescription: seo.ogDescription ?? null,
          ogImage: seo.ogImage ?? null,
          twitterCard: seo.twitterCard ?? null,
          robotsTxtPresent: seo.robotsTxtPresent,
          sitemapUrl: seo.sitemapUrl ?? null,
          duplicateContentWarning: seo.duplicateContentWarning,
          structuredDataGaps: seo.structuredDataRequiredFields,
          topKeywords: seo.keywordAnalysis?.topKeywords?.map((k) => k.keyword),
        }
      : undefined,
    eco: result.eco
      ? {
          co2: result.eco.co2,
          grade: result.eco.grade,
          pageWeightKb: Math.round((result.eco.pageWeight ?? 0) / 1024),
          greenWebHosted: result.eco.greenWebHosted ?? null,
          greenWebCheckedAt: result.eco.greenWebCheckedAt ?? null,
          greenWebSource: result.eco.greenWebSource ?? null,
        }
      : undefined,
    ux: mapUx(result),
    links: result.links
      ? {
          internal: result.links.internal ?? 0,
          external: result.links.external ?? 0,
          broken: result.links.broken?.length ?? 0,
          missingNoopener: result.links.missingNoopener?.length ?? 0,
          total: result.links.total,
          pdfLinkCount: result.links.pdfLinks?.length,
          brokenSamples: result.links.broken?.slice(0, 8).map((b) => ({
            url: b.url,
            text: b.text,
            status: b.statusCode,
          })),
        }
      : undefined,
    securityPrivacy:
      security || privacy
        ? {
            https: Boolean(result.url.startsWith('https')),
            hsts: Boolean(security?.strictTransportSecurity?.present),
            csp: Boolean(security?.contentSecurityPolicy?.present),
            hasPrivacyPolicy: Boolean(privacy?.hasPrivacyPolicy),
            hasCookieBanner: Boolean(privacy?.hasCookieBanner),
            mixedContent: Boolean(security?.mixedContentUrls?.length),
            xFrameOptions: security?.xFrameOptions?.present,
            xContentTypeOptions: security?.xContentTypeOptions?.present,
            referrerPolicy: security?.referrerPolicy?.present,
            permissionsPolicy: security?.permissionsPolicy?.present,
            mixedContentCount: security?.mixedContentUrls?.length,
            sriMissingCount: security?.sriMissing?.length,
            cookieWarningCount: security?.cookieWarnings?.length,
            privacyPolicyUrl: privacy?.privacyPolicyUrl ?? null,
            hasTermsOfService: privacy?.hasTermsOfService,
            cmpHints: result.consentSignals?.cmpDomHints,
          }
        : undefined,
    freshness: result.contentFreshness
      ? {
          ageDays: result.contentFreshness.ageDays ?? null,
          confidence:
            result.contentFreshness.confidence === 'unknown'
              ? 'low'
              : result.contentFreshness.confidence,
          source: result.contentFreshness.bestAsOfSource ?? null,
          bestAsOfIso: result.contentFreshness.bestAsOfIso ?? null,
        }
      : undefined,
    generative: gen
      ? {
          score: gen.score ?? 0,
          discoverability: gen.dimensions?.discoverability ?? 0,
          repurposing: gen.dimensions?.repurposing ?? 0,
          hasLlmsTxt: Boolean(gen.technical.hasLlmsTxt),
          hasFaqSchema: Boolean(gen.repurposingSignals?.hasFaqPageSchema),
          hasHowToSchema: gen.repurposingSignals?.hasHowToSchema,
          hasBreadcrumb: gen.repurposingSignals?.hasBreadcrumbList,
          hasOrganizationTrust: gen.repurposingSignals?.organizationOrWebSiteWithTrust,
          schemaCoverage: gen.technical.schemaCoverage,
          llmsTxtSections: gen.technical.llmsTxtSections,
          aiBotsBlocked: gen.technical.aiBotStatus
            ?.filter((b) => b.status === 'blocked')
            .map((b) => b.bot),
          faqEntityCount: gen.content.faqCount,
          tableCount: gen.content.tableCount,
          citationDensity: gen.content.citationDensity,
          hasAuthorBio: gen.expertise.hasAuthorBio,
          isYmyl: result.ymyl?.isYmyl,
          ymylConfidence: result.ymyl?.confidence ?? null,
        }
      : undefined,
    infra: result.technicalInsights
      ? {
          htmlLang: null,
          platforms: [],
          tracking: result.technicalInsights.thirdPartyDomains?.slice(0, 12),
        }
      : undefined,
    classification: result.pageClassification
      ? {
          shortSummary: result.pageClassification.shortSummary ?? '',
          tags: result.pageClassification.tagTiers?.map((t) => t.tag) ?? [],
          intensityTier: Math.max(
            1,
            ...((result.pageClassification.tagTiers?.map((t) => t.tier) as number[]) ?? [1]),
          ),
          tagTiers: result.pageClassification.tagTiers,
        }
      : undefined,
    screenshotUrl: result.screenshot ? apiScanScreenshot(scan.id) : null,
    passedChecks: (result.passes ?? []).slice(0, 20).map((p) => ({
      id: p.id,
      description: p.description,
      help: p.help,
    })),
    deviceSiblings: [
      {
        id: scan.id,
        device: scan.device ?? 'desktop',
        overallScore: scan.overallScore,
      },
    ],
  }
}

function severityFromSystemic(pageCount: number, totalPages: number): IssueSeverity {
  const ratio = totalPages > 0 ? pageCount / totalPages : 0
  if (ratio >= 0.8) return 'critical'
  if (ratio >= 0.5) return 'serious'
  return 'moderate'
}

function mean(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function duplicateGroupCount(values: Array<string | null | undefined>): number {
  const counts = new Map<string, number>()
  for (const raw of values) {
    const key = (raw ?? '').trim().toLowerCase()
    if (!key) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  let groups = 0
  for (const n of counts.values()) {
    if (n > 1) groups += 1
  }
  return groups
}

function canonicalMismatches(pages: ScanResult[]): number {
  let n = 0
  for (const page of pages) {
    const canonical = page.seo?.canonical
    if (!canonical) continue
    try {
      const pageUrl = new URL(page.url)
      const canUrl = new URL(canonical, page.url)
      const norm = (u: URL) => `${u.origin}${u.pathname.replace(/\/$/, '') || '/'}`
      if (norm(pageUrl) !== norm(canUrl)) n += 1
    } catch {
      n += 1
    }
  }
  return n
}

function topKeywordsAcrossPages(pages: ScanResult[], limit = 8): string[] {
  const freq = new Map<string, number>()
  for (const page of pages) {
    for (const row of page.seo?.keywordAnalysis?.topKeywords ?? []) {
      const key = row.keyword.trim().toLowerCase()
      if (!key) continue
      freq.set(key, (freq.get(key) ?? 0) + (row.count ?? 1))
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k)
}

/** Map spider E-E-A-T shape → contracts magazine aggregate. */
export function mapDomainEeatAggregate(
  eeat: EeatDomainAggregate | undefined,
  totalPages: number,
): DomainEeatAggregate | undefined {
  if (!eeat) return undefined
  return {
    totalPages: eeat.trust.totalPages || totalPages,
    trust: {
      pagesWithContact: eeat.trust.pagesWithContact,
      pagesWithPrivacy: eeat.trust.pagesWithPrivacy,
      pagesWithImpressum: eeat.trust.pagesWithImpressum,
    },
    expertise: {
      pagesWithAuthorBio: eeat.expertise.pagesWithAuthorBio,
      pagesWithArticleAuthor: eeat.expertise.pagesWithArticleAuthor,
      avgCitationsPerPage: eeat.expertise.avgCitationsPerPage,
    },
    experience: {
      pagesWithTeam: eeat.experience.pagesWithTeam,
      pagesWithAbout: eeat.experience.pagesWithAbout,
      pagesWithCaseStudyMention: eeat.experience.pagesWithCaseStudyMention,
    },
  }
}

export function buildDomainSeoCoverage(pages: ScanResult[]): DomainSeoCoverage | undefined {
  if (!pages.length) return undefined
  if (!pages.some((p) => p.seo)) return undefined
  const totalPages = pages.length
  return {
    totalPages,
    withTitle: pages.filter((p) => Boolean(p.seo?.title?.trim())).length,
    withH1: pages.filter((p) => Boolean(p.seo?.h1?.trim())).length,
    withMetaDescription: pages.filter((p) => Boolean(p.seo?.metaDescription?.trim())).length,
    withCanonical: pages.filter((p) => Boolean(p.seo?.canonical?.trim())).length,
    withOgTitle: pages.filter((p) => Boolean(p.seo?.ogTitle?.trim())).length,
    withOgImage: pages.filter((p) => Boolean(p.seo?.ogImage?.trim())).length,
    withTwitterCard: pages.filter((p) => Boolean(p.seo?.twitterCard?.trim())).length,
    canonicalMismatchCount: canonicalMismatches(pages),
    duplicateTitleGroupCount: duplicateGroupCount(pages.map((p) => p.seo?.title)),
    duplicateMetaGroupCount: duplicateGroupCount(pages.map((p) => p.seo?.metaDescription)),
    missingH1Count: pages.filter((p) => !p.seo?.h1?.trim()).length,
    totalWordsAcrossPages: pages.reduce(
      (sum, p) => sum + (p.seo?.bodyWordCount ?? p.seo?.keywordAnalysis?.totalWords ?? 0),
      0,
    ),
    topKeywords: topKeywordsAcrossPages(pages),
  }
}

export function buildDomainGenerativeAggregate(
  pages: ScanResult[],
): DomainGenerativeAggregate | undefined {
  const withGen = pages.filter((p) => p.generative)
  if (!withGen.length) return undefined
  const pageCount = pages.length
  return {
    score: Math.round(mean(withGen.map((p) => p.generative!.score))),
    discoverability: Math.round(
      mean(withGen.map((p) => p.generative!.dimensions?.discoverability ?? p.generative!.score)),
    ),
    repurposing: Math.round(
      mean(withGen.map((p) => p.generative!.dimensions?.repurposing ?? p.generative!.score)),
    ),
    withLlmsTxt: withGen.filter((p) => p.generative!.technical.hasLlmsTxt).length,
    withRobotsAllowingAi: withGen.filter((p) => p.generative!.technical.hasRobotsAllowingAI).length,
    pageCount,
    citationDensity: mean(withGen.map((p) => p.generative!.content.citationDensity ?? 0)),
  }
}

function buildDomainPerformance(pages: ScanResult[]): DomainPerformanceAggregate | undefined {
  const withPerf = pages.filter((p) => p.performance)
  if (!withPerf.length) return undefined
  return {
    avgTtfb: Math.round(mean(withPerf.map((p) => p.performance!.ttfb))),
    avgFcp: Math.round(mean(withPerf.map((p) => p.performance!.fcp))),
    avgLcp: Math.round(mean(withPerf.map((p) => p.performance!.lcp))),
    avgDomLoad: Math.round(mean(withPerf.map((p) => p.performance!.domLoad))),
    pageCount: withPerf.length,
    scriptTransferKbAvg: (() => {
      const vals = withPerf
        .map((p) => p.performance!.scriptTransferBytesApprox)
        .filter((v): v is number => typeof v === 'number' && v > 0)
        .map((b) => b / 1024)
      return vals.length ? Math.round(mean(vals)) : null
    })(),
  }
}

function buildDomainUx(pages: ScanResult[]): DomainUxAggregate | undefined {
  const withUx = pages.filter((p) => p.ux)
  if (!withUx.length) return undefined
  const bands = { easy: 0, standard: 0, complex: 0, veryComplex: 0 }
  for (const p of withUx) {
    const grade = (p.ux!.readability.grade || '').toLowerCase()
    if (grade.includes('easy')) bands.easy += 1
    else if (grade.includes('very complex') || grade.includes('academic')) bands.veryComplex += 1
    else if (grade.includes('complex') || grade.includes('college')) bands.complex += 1
    else bands.standard += 1
  }
  const modalBand = (Object.entries(bands) as Array<[keyof typeof bands, number]>).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0]
  const gradeLabel =
    modalBand === 'easy'
      ? 'Easy (6th Grade)'
      : modalBand === 'complex'
        ? 'Complex (College)'
        : modalBand === 'veryComplex'
          ? 'Very Complex (Academic)'
          : 'Standard (High School)'
  const dwells = withUx
    .map((p) => p.ux!.dwellEstimate?.secondsMedian)
    .filter((v): v is number => typeof v === 'number')
  return {
    score: Math.round(mean(withUx.map((p) => p.ux!.score))),
    cls: Number(mean(withUx.map((p) => p.ux!.cls)).toFixed(3)),
    readabilityGrade: gradeLabel,
    readabilityScore: Number(mean(withUx.map((p) => p.ux!.readability.score)).toFixed(1)),
    readabilityBands: bands,
    dwellSecondsMedian: dwells.length ? Math.round(mean(dwells)) : null,
    brokenLinkCount: pages.reduce((sum, p) => sum + (p.links?.broken?.length ?? 0), 0),
    tapTargetIssueCount: withUx.reduce((sum, p) => sum + (p.ux!.tapTargets?.issues?.length ?? 0), 0),
    pagesWithMultipleH1: pages.filter(
      (p) => p.generative?.repurposingSignals?.hasSingleH1 === false,
    ).length,
    pagesWithSkippedLevels: 0,
    pageCount: withUx.length,
  }
}

function buildDomainEco(pages: ScanResult[]): DomainEcoAggregate | undefined {
  const withEco = pages.filter((p) => p.eco)
  if (!withEco.length) return undefined
  const gradeDistribution: DomainEcoAggregate['gradeDistribution'] = {}
  for (const p of withEco) {
    const g = p.eco!.grade
    gradeDistribution![g] = (gradeDistribution![g] ?? 0) + 1
  }
  const modal = (Object.entries(gradeDistribution!) as Array<[DomainEcoAggregate['grade'], number]>).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0]
  return {
    avgCo2: Number(mean(withEco.map((p) => p.eco!.co2)).toFixed(2)),
    grade: modal ?? 'C',
    avgPageWeightKb: Math.round(
      mean(withEco.map((p) => (p.eco!.pageWeight ?? 0) / 1024)),
    ),
    gradeDistribution,
    pageCount: withEco.length,
  }
}

function buildDomainLinks(pages: ScanResult[]): LinkSnapshot | undefined {
  const withLinks = pages.filter((p) => p.links)
  if (!withLinks.length) return undefined
  const brokenSamples = withLinks
    .flatMap((p) => p.links!.broken ?? [])
    .slice(0, 8)
    .map((b) => ({ url: b.url, text: b.text, status: b.statusCode }))
  return {
    internal: withLinks.reduce((sum, p) => sum + (p.links!.internal ?? 0), 0),
    external: withLinks.reduce((sum, p) => sum + (p.links!.external ?? 0), 0),
    broken: withLinks.reduce((sum, p) => sum + (p.links!.broken?.length ?? 0), 0),
    missingNoopener: withLinks.reduce((sum, p) => sum + (p.links!.missingNoopener?.length ?? 0), 0),
    total: withLinks.reduce((sum, p) => sum + (p.links!.total ?? 0), 0),
    brokenSamples: brokenSamples.length ? brokenSamples : undefined,
  }
}

function buildDomainSecurityPrivacy(pages: ScanResult[]): SecurityPrivacySnapshot | undefined {
  if (!pages.length) return undefined
  const anyHttps = pages.some((p) => p.url.startsWith('https'))
  const withSec = pages.filter((p) => p.security || p.privacy)
  if (!withSec.length && !anyHttps) return undefined
  return {
    https: anyHttps,
    hsts: withSec.some((p) => p.security?.strictTransportSecurity?.present),
    csp: withSec.some((p) => p.security?.contentSecurityPolicy?.present),
    hasPrivacyPolicy: withSec.some((p) => p.privacy?.hasPrivacyPolicy),
    hasCookieBanner: withSec.some((p) => p.privacy?.hasCookieBanner),
    mixedContent: withSec.some((p) => Boolean(p.security?.mixedContentUrls?.length)),
    xFrameOptions: withSec.some((p) => p.security?.xFrameOptions?.present),
    permissionsPolicy: withSec.some((p) => p.security?.permissionsPolicy?.present),
    privacyPolicyUrl: withSec.find((p) => p.privacy?.privacyPolicyUrl)?.privacy?.privacyPolicyUrl ?? null,
    hasTermsOfService: withSec.some((p) => p.privacy?.hasTermsOfService),
  }
}

/** Corpus chapters for the deep-scan magazine Overview. */
export function buildDomainOverviewAggregates(
  pages: ScanResult[],
  domainResult: DomainScanResultWithFullPages,
): Pick<
  DomainOverview,
  | 'seoCoverage'
  | 'eeat'
  | 'generative'
  | 'performance'
  | 'ux'
  | 'eco'
  | 'links'
  | 'securityPrivacy'
> {
  return {
    seoCoverage: buildDomainSeoCoverage(pages),
    eeat: mapDomainEeatAggregate(domainResult.eeat, pages.length),
    generative: buildDomainGenerativeAggregate(pages),
    performance: buildDomainPerformance(pages),
    ux: buildDomainUx(pages),
    eco: buildDomainEco(pages),
    links: buildDomainLinks(pages),
    securityPrivacy: buildDomainSecurityPrivacy(pages),
  }
}

export function adaptDomainResultToContracts(
  domainResult: DomainScanResultWithFullPages,
  input: {
    id: string
    projectId: string
    rootUrl: string
    startedAt: string
    status?: DomainScanLight['status']
  },
): {
  domain: DomainScanLight
  issues: IssueSummary[]
  scores: ScoreCard[]
  overview: DomainOverview
  pageScans: Array<ReturnType<typeof adaptScanResultToContracts>>
} {
  const pages = domainResult.pages
  const pageScans = pages.map((page, idx) =>
    adaptScanResultToContracts(page, {
      id: `${input.id}-p${idx}`,
      projectId: input.projectId,
      mode: 'single',
    }),
  )

  const systemic: DomainSystemicIssue[] = (domainResult.systemicIssues ?? []).map((s) => ({
    id: s.issueId,
    title: s.title,
    pageCount: s.count,
    severity: severityFromSystemic(s.count, pages.length),
    ruleId: s.issueId,
  }))

  const issues: IssueSummary[] = systemic.map((s, idx) => {
    const samplePages =
      domainResult.systemicIssues?.find((x) => x.issueId === s.id)?.pages?.slice(0, 40) ?? []
    return {
      id: `${input.id}-sys-${idx}`,
      scanId: input.id,
      severity: s.severity ?? 'serious',
      ruleId: s.ruleId ?? s.id,
      title: s.title,
      section: 'accessibility',
      affectedCount: s.pageCount,
      affectedPages: samplePages,
      detail: `Systemic across ${s.pageCount} pages`,
    }
  })

  if (!issues.length && pageScans.length) {
    const first = pageScans[0]!
    for (const issue of first.issues.slice(0, 12)) {
      issues.push({
        ...issue,
        id: `${input.id}-${issue.id}`,
        scanId: input.id,
        affectedCount: Math.max(1, Math.round(pages.length / 3)),
      })
    }
  }

  const avgScore =
    pages.length > 0
      ? Math.round(pages.reduce((acc, p) => acc + (p.ux?.score ?? p.score), 0) / pages.length)
      : domainResult.score

  const scores: ScoreCard[] =
    pageScans[0]?.scores.map((card) => {
      const values = pageScans.map(
        (ps) => ps.scores.find((s) => s.kind === card.kind)?.value ?? card.value,
      )
      const avg = Math.round(values.reduce((a, b) => a + b, 0) / Math.max(1, values.length))
      return { ...card, value: avg }
    }) ?? [score('accessibility', 'Accessibility', avgScore)]

  const completedAt = new Date().toISOString()
  const terminalStatus = input.status ?? 'completed'
  const domain: DomainScanLight = {
    id: input.id,
    projectId: input.projectId,
    rootUrl: input.rootUrl,
    status: terminalStatus,
    pageCount: pages.length || domainResult.totalPages,
    overallScore: Math.round(avgScore),
    issueCount: issues.length,
    startedAt: input.startedAt,
    completedAt,
    issueStats: {
      errors: pages.reduce((a, p) => a + p.stats.errors, 0),
      warnings: pages.reduce((a, p) => a + p.stats.warnings, 0),
      notices: pages.reduce((a, p) => a + p.stats.notices, 0),
      total: pages.reduce((a, p) => a + p.stats.total, 0),
      passed: pages.reduce((a, p) => a + (p.passes?.length ?? 0), 0),
    },
  }

  const aggregates = buildDomainOverviewAggregates(pages, domainResult)

  const overview: DomainOverview = {
    scan: domain,
    scores,
    lede: `Deep scan of ${input.rootUrl} — ${domain.pageCount} pages, ${issues.length} systemic groups.`,
    systemicIssues: systemic,
    pageSamples: pages.slice(0, 20).map((p, idx) => ({
      url: p.url,
      score: Math.round(p.ux?.score ?? p.score),
      errors: p.stats.errors,
      warnings: p.stats.warnings,
      scanId: synthesizeDomainPageSampleScanId(input.id, idx),
    })),
    ...aggregates,
  }

  return { domain, issues, scores, overview, pageScans }
}
