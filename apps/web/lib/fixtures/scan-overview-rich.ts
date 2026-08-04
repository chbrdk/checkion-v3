import type {
  IssueSummary,
  PassedCheck,
  ScanOverview,
  ScanSummary,
  ScoreCard,
} from '@checkion-v3/contracts'
import { ISSUE_FIXTURES, SCORE_FIXTURES, SCAN_FIXTURES } from './projects'
import {
  LIVE_OVERVIEW_ENRICHMENT,
  LIVE_PASSED_CHECKS,
  LIVE_SCAN_SUMMARY,
} from './live-scan-single-1'
import { selectTopIssueGroups } from '../issue-groups'

/** Rich magazine snapshots keyed by scan id (v2-shaped, light). */

const PASSED_SAMPLE: PassedCheck[] = [
  {
    id: 'bypass',
    description: 'Page has a bypass mechanism (skip link)',
    help: 'Users can skip repeated navigation',
  },
  {
    id: 'html-has-lang',
    description: 'html element has a lang attribute',
    help: 'Screen readers can select correct language',
  },
  {
    id: 'meta-viewport',
    description: 'Viewport meta does not disable zoom',
    help: 'Users can magnify content',
  },
  {
    id: 'document-title',
    description: 'Document has a non-empty title',
    help: 'Helps orientation in tabs and search',
  },
]

export function buildRichScanOverview(
  scanId: string,
  scanOverride?: ScanSummary | null,
  scoresOverride?: ScoreCard[],
  issuesOverride?: IssueSummary[],
): ScanOverview | null {
  const scan = scanOverride ?? SCAN_FIXTURES.find((s) => s.id === scanId) ?? null
  if (!scan) return null
  const scores = scoresOverride ?? SCORE_FIXTURES[scanId] ?? []
  const issues = issuesOverride ?? ISSUE_FIXTURES[scanId] ?? []
  const base: ScanOverview = {
    scan,
    scores,
    topIssues: selectTopIssueGroups(issues, 5),
    lede:
      scan.status === 'running'
        ? 'Dummy scan still marked running — open other completed results to explore.'
        : scan.mode === 'single'
          ? 'Single-page quality magazine with accessibility, SEO, performance, UX, eco, and GEO headlines from the light overview payload.'
          : 'Deep crawl summary across the domain with aggregated scores and top issues.',
  }

  if (scanId === 'scan-single-1') {
    return {
      ...base,
      ...LIVE_OVERVIEW_ENRICHMENT,
      scan: LIVE_SCAN_SUMMARY,
      scores: enrichScores(scores),
      topIssues: selectTopIssueGroups(issues, 5),
      passedChecks: LIVE_PASSED_CHECKS.length ? LIVE_PASSED_CHECKS : PASSED_SAMPLE,
      deviceSiblings: [
        { id: 'scan-single-1', device: 'desktop', overallScore: LIVE_SCAN_SUMMARY.overallScore },
      ],
    }
  }

  if (scanId === 'scan-single-2') {
    return {
      ...base,
      scan: {
        ...scan,
        device: 'desktop',
        standard: 'WCAG2AA',
        runners: ['axe'],
        durationMs: 12100,
        issueStats: { errors: 1, warnings: 2, notices: 1, total: 4, passed: 38 },
      },
      scores: enrichScores(scores),
      performance: {
        ttfb: 180,
        fcp: 980,
        lcp: 1760,
        domLoad: 1400,
        windowLoad: 2400,
        nextHopProtocol: 'h2',
        scriptTransferKb: 310,
      },
      seo: {
        title: 'Produktkombinationen – Bosch eBike',
        titleLength: 36,
        metaDescription: 'Finden Sie passende Antriebs- und Akkukombinationen.',
        metaDescriptionLength: 52,
        h1: 'Produktkombinationen',
        canonical: 'https://www.bosch-ebike.com/de/service/produktkombinationen',
        robots: 'index,follow',
        wordCount: 920,
        hasOpenGraph: true,
        hasJsonLd: false,
        skinnyContent: false,
      },
      eco: { co2: 0.9, grade: 'A', pageWeightKb: 980, greenWebHosted: true },
      ux: {
        score: 81,
        cls: 0.04,
        readabilityGrade: 'B1',
        readabilityScore: 72,
        mobileFriendly: true,
        brokenLinkCount: 0,
        tapTargetIssueCount: 2,
        hasSkipLink: true,
        headingH1Count: 1,
        skippedHeadingLevels: true,
      },
      links: { internal: 22, external: 4, broken: 0, missingNoopener: 1 },
      securityPrivacy: {
        https: true,
        hsts: true,
        csp: true,
        hasPrivacyPolicy: true,
        hasCookieBanner: true,
        mixedContent: false,
      },
      screenshotUrl: '/fixtures/scans/scan-single-1.svg',
      passedChecks: PASSED_SAMPLE.slice(0, 3),
    }
  }

  // Synthesized / other fixtures: minimal enrichment when completed
  if (scan.status === 'completed') {
    return {
      ...base,
      scores: enrichScores(scores),
      performance: {
        ttfb: 200 + (scan.url.length % 80),
        fcp: 1100,
        lcp: 2200,
        domLoad: 1700,
        windowLoad: 2900,
        nextHopProtocol: 'h2',
        scriptTransferKb: 250,
      },
      seo: {
        title: `Page · ${scan.url}`,
        titleLength: 24,
        metaDescription: 'Synthesized dummy meta description for fixture launches.',
        metaDescriptionLength: 56,
        h1: 'Demo heading',
        canonical: scan.url,
        robots: 'index,follow',
        wordCount: 640,
        hasOpenGraph: false,
        hasJsonLd: false,
        skinnyContent: false,
      },
      eco: { co2: 1.1, grade: 'C', pageWeightKb: 1200, greenWebHosted: null },
      ux: {
        score: scan.overallScore ?? 70,
        cls: 0.1,
        readabilityGrade: 'B2',
        readabilityScore: 60,
        mobileFriendly: true,
        brokenLinkCount: 1,
        tapTargetIssueCount: 3,
        hasSkipLink: false,
        headingH1Count: 1,
        skippedHeadingLevels: false,
      },
      links: { internal: 12, external: 3, broken: 1, missingNoopener: 0 },
      securityPrivacy: {
        https: scan.url.startsWith('https'),
        hsts: false,
        csp: false,
        hasPrivacyPolicy: true,
        hasCookieBanner: false,
        mixedContent: false,
      },
      screenshotUrl: '/fixtures/scans/scan-single-1.svg',
      passedChecks: PASSED_SAMPLE.slice(0, 2),
    }
  }

  return base
}

function enrichScores(scores: ScoreCard[]): ScoreCard[] {
  const byKind = new Map(scores.map((s) => [s.kind, s]))
  const ensure = (kind: ScoreCard['kind'], label: string, value: number) => {
    if (!byKind.has(kind)) byKind.set(kind, { kind, label, value, max: 100 })
  }
  ensure('ux', 'UX lab', 74)
  ensure('eco', 'Eco', 72)
  ensure('generative', 'GEO', 61)
  return Array.from(byKind.values())
}

/** Merge richer issue inspect fields for scan-single-* (keeps live bounding boxes). */
export function enrichIssueInspect(issues: IssueSummary[]): IssueSummary[] {
  const viewport = { w: 1920, h: 5053 }
  return issues.map((issue, index) => {
    if (issue.scanId !== 'scan-single-1' && !issue.scanId.startsWith('scan-single-')) {
      return issue
    }
    const col = index % 3
    const row = Math.floor(index / 3)
    const staggeredBox = {
      x: 80 + col * 380 + (index % 2) * 24,
      y: 120 + row * 160,
      width: 220 + (index % 3) * 40,
      height: 48 + (index % 2) * 20,
    }
    // Keep in viewport
    staggeredBox.x = Math.min(staggeredBox.x, viewport.w - staggeredBox.width - 24)
    staggeredBox.y = Math.min(staggeredBox.y, viewport.h - staggeredBox.height - 24)

    if (issue.context && issue.wcagLevel && issue.boundingBox) {
      return issue
    }
    return {
      ...issue,
      runner: issue.runner ?? 'axe',
      wcagLevel: issue.wcagLevel ?? (issue.severity === 'critical' || issue.severity === 'serious' ? 'AA' : 'A'),
      helpUrl:
        issue.helpUrl ??
        `https://dequeuniversity.com/rules/axe/4.8/${issue.ruleId}`,
      context:
        issue.context ??
        `<${issue.section === 'seo' ? 'meta' : 'button'} data-rule="${issue.ruleId}">…</${
          issue.section === 'seo' ? 'meta' : 'button'
        }>`,
      boundingBox: issue.boundingBox ?? staggeredBox,
    }
  })
}
