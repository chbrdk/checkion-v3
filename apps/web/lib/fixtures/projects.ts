import type {
  DomainScanLight,
  IssueSummary,
  ProjectDetail,
  ProjectSummary,
  ScanOverview,
  ScanSummary,
  ScoreCard,
} from '@checkion-v3/contracts'
import {
  LIVE_ISSUES,
  LIVE_SCAN_SUMMARY,
  LIVE_SCORE_CARDS,
} from './live-scan-single-1'
import {
  LIVE_DOMAIN_ISSUES,
  LIVE_DOMAIN_SCAN,
  LIVE_DOMAIN_SCORES,
} from './live-scan-domain-1'
import { selectTopIssueGroups } from '../issue-groups'

/** Demo corpus — local fixtures; scan-single-1 + domain-1 are live imports from projects-a. */

export const PROJECT_FIXTURES: ProjectDetail[] = [
  {
    id: 'proj-demo-1',
    name: 'Dürr Consulting',
    domain: 'www.durr-consulting.com',
    status: 'active',
    platformProjectId: 'plx-collection-demo-1',
    capabilityStatus: 'in_sync',
    lastScanAt: '2026-07-31T10:04:26.314Z',
    scanCount: 5,
    description:
      'Live fixture project — single + deep imports from checkion.projects-a (Consulting page + durr.com domain crawl).',
    recentScanIds: ['scan-single-1', 'scan-single-2', 'scan-deep-1'],
  },
  {
    id: 'proj-demo-2',
    name: 'MSQDX Docs',
    domain: 'docs.msqdx.example',
    status: 'pending_sync',
    platformProjectId: 'plx-collection-demo-2',
    capabilityStatus: 'pending',
    lastScanAt: '2026-07-15T14:00:00.000Z',
    scanCount: 1,
    description: 'Docs site capability — sync still pending in dummy federation.',
    recentScanIds: ['scan-single-3'],
  },
  {
    id: 'proj-demo-3',
    name: 'Playground Shop',
    domain: 'shop.plygrnd.example',
    status: 'active',
    platformProjectId: 'plx-collection-demo-3',
    capabilityStatus: 'in_sync',
    lastScanAt: '2026-07-25T16:20:00.000Z',
    scanCount: 3,
    description: 'E-commerce demo collection for checkout and PDP quality.',
    recentScanIds: ['scan-single-4', 'scan-deep-2'],
  },
]

export function toProjectSummary(p: ProjectDetail): ProjectSummary {
  const { description: _d, recentScanIds: _r, ...summary } = p
  return summary
}

export const SCAN_FIXTURES: ScanSummary[] = [
  LIVE_SCAN_SUMMARY,
  {
    id: 'scan-single-2',
    projectId: 'proj-demo-1',
    mode: 'single',
    url: 'https://www.durr-consulting.com/de/',
    status: 'completed',
    startedAt: '2026-07-22T11:00:00.000Z',
    completedAt: '2026-07-22T11:04:00.000Z',
    overallScore: 85,
    issueCount: 4,
  },
  {
    id: 'scan-deep-1',
    projectId: 'proj-demo-1',
    mode: 'deep',
    url: 'https://www.durr.com',
    status: 'completed',
    startedAt: '2026-07-30T12:00:00.000Z',
    completedAt: '2026-07-31T00:29:48.824Z',
    overallScore: 43,
    issueCount: LIVE_DOMAIN_ISSUES.length,
  },
  {
    id: 'scan-single-3',
    projectId: 'proj-demo-2',
    mode: 'single',
    url: 'https://docs.msqdx.example/',
    status: 'completed',
    startedAt: '2026-07-15T13:50:00.000Z',
    completedAt: '2026-07-15T14:00:00.000Z',
    overallScore: 91,
    issueCount: 2,
  },
  {
    id: 'scan-single-4',
    projectId: 'proj-demo-3',
    mode: 'single',
    url: 'https://shop.plygrnd.example/cart',
    status: 'completed',
    startedAt: '2026-07-25T16:10:00.000Z',
    completedAt: '2026-07-25T16:20:00.000Z',
    overallScore: 66,
    issueCount: 9,
  },
  {
    id: 'scan-deep-2',
    projectId: 'proj-demo-3',
    mode: 'deep',
    url: 'https://shop.plygrnd.example/',
    status: 'completed',
    startedAt: '2026-07-18T09:00:00.000Z',
    completedAt: '2026-07-18T10:45:00.000Z',
    overallScore: 62,
    issueCount: 22,
  },
  {
    id: 'scan-running-1',
    projectId: 'proj-demo-3',
    mode: 'single',
    url: 'https://shop.plygrnd.example/checkout',
    status: 'running',
    startedAt: '2026-07-31T08:00:00.000Z',
    completedAt: null,
    overallScore: null,
    issueCount: 0,
  },
]

export const DOMAIN_SCAN_FIXTURES: DomainScanLight[] = [
  LIVE_DOMAIN_SCAN,
  {
    id: 'domain-2',
    projectId: 'proj-demo-3',
    rootUrl: 'https://shop.plygrnd.example/',
    status: 'completed',
    pageCount: 86,
    overallScore: 62,
    issueCount: 22,
    startedAt: '2026-07-18T09:00:00.000Z',
    completedAt: '2026-07-18T10:45:00.000Z',
  },
]

const DEFAULT_SCORES = (a: number, s: number, b: number, p: number): ScoreCard[] => [
  { kind: 'accessibility', label: 'Accessibility', value: a, max: 100 },
  { kind: 'seo', label: 'SEO', value: s, max: 100 },
  { kind: 'best_practices', label: 'Best practices', value: b, max: 100 },
  { kind: 'performance', label: 'Performance', value: p, max: 100 },
]

export const SCORE_FIXTURES: Record<string, ScoreCard[]> = {
  'scan-single-1': LIVE_SCORE_CARDS,
  'scan-single-2': DEFAULT_SCORES(90, 84, 92, 71),
  'scan-deep-1': LIVE_DOMAIN_SCORES,
  'scan-single-3': DEFAULT_SCORES(96, 88, 94, 82),
  'scan-single-4': DEFAULT_SCORES(58, 72, 70, 55),
  'scan-deep-2': DEFAULT_SCORES(54, 68, 66, 49),
  'domain-1': LIVE_DOMAIN_SCORES,
  'domain-2': DEFAULT_SCORES(54, 68, 66, 49),
}

function issue(
  id: string,
  scanId: string,
  severity: IssueSummary['severity'],
  ruleId: string,
  title: string,
  section: IssueSummary['section'],
  affectedCount: number,
  detail?: string,
  selector?: string,
): IssueSummary {
  return { id, scanId, severity, ruleId, title, section, affectedCount, detail, selector }
}

export const ISSUE_FIXTURES: Record<string, IssueSummary[]> = {
  'scan-single-1': LIVE_ISSUES,
  'scan-single-2': [
    issue('iss-s2-1', 'scan-single-2', 'serious', 'aria-required-attr', 'ARIA widget missing required attributes', 'accessibility', 2),
    issue('iss-s2-2', 'scan-single-2', 'moderate', 'heading-order', 'Skipped heading level on configurator', 'accessibility', 1),
    issue('iss-s2-3', 'scan-single-2', 'moderate', 'canonical', 'Self-referencing canonical missing', 'seo', 1),
    issue('iss-s2-4', 'scan-single-2', 'minor', 'tabindex', 'Positive tabindex on filter chips', 'accessibility', 3),
  ],
  'scan-deep-1': [
    issue('iss-d1', 'scan-deep-1', 'critical', 'heading-order', 'Broken heading order across product pages', 'accessibility', 18),
    issue('iss-d2', 'scan-deep-1', 'serious', 'canonical', 'Missing or conflicting canonical URLs', 'seo', 11),
    issue('iss-d3', 'scan-deep-1', 'serious', 'image-alt', 'Product images without alt text', 'accessibility', 24),
    issue('iss-d4', 'scan-deep-1', 'moderate', 'meta-description', 'Thin or duplicate meta descriptions', 'seo', 15),
    issue('iss-d5', 'scan-deep-1', 'moderate', 'link-name', 'Generic “mehr erfahren” link text', 'content', 31),
    issue('iss-d6', 'scan-deep-1', 'critical', 'color-contrast', 'Footer links fail contrast', 'accessibility', 9),
    issue('iss-d7', 'scan-deep-1', 'minor', 'landmark-one-main', 'Pages without main landmark', 'accessibility', 4),
    issue('iss-d8', 'scan-deep-1', 'serious', 'frame-title', 'Embedded videos missing title', 'accessibility', 6),
    issue('iss-d9', 'scan-deep-1', 'moderate', 'list', 'Visual lists not marked up as lists', 'content', 8),
    issue('iss-d10', 'scan-deep-1', 'minor', 'bypass', 'Skip link target missing', 'accessibility', 2),
    issue('iss-d11', 'scan-deep-1', 'serious', 'hreflang', 'Incomplete hreflang map', 'seo', 7),
    issue('iss-d12', 'scan-deep-1', 'moderate', 'robots-txt', 'Disallow patterns blocking assets', 'technical', 1),
    issue('iss-d13', 'scan-deep-1', 'minor', 'favicon', 'Missing apple-touch-icon', 'technical', 1),
    issue('iss-d14', 'scan-deep-1', 'moderate', 'open-graph', 'OG image aspect inconsistent', 'seo', 5),
  ],
  'scan-single-3': [
    issue('iss-docs-1', 'scan-single-3', 'moderate', 'link-in-text-block', 'Adjacent links with same name', 'content', 2),
    issue('iss-docs-2', 'scan-single-3', 'minor', 'meta-viewport', 'Initial-scale slightly off', 'technical', 1),
  ],
  'scan-single-4': [
    issue('iss-cart-1', 'scan-single-4', 'critical', 'label', 'Quantity input unlabeled', 'accessibility', 1),
    issue('iss-cart-2', 'scan-single-4', 'critical', 'color-contrast', 'Discount badge fails contrast', 'accessibility', 2),
    issue('iss-cart-3', 'scan-single-4', 'serious', 'button-name', 'Icon-only remove button', 'accessibility', 3),
    issue('iss-cart-4', 'scan-single-4', 'serious', 'focus-order', 'Focus jumps after coupon apply', 'accessibility', 1),
    issue('iss-cart-5', 'scan-single-4', 'moderate', 'meta-description', 'Cart page noindex but indexed', 'seo', 1),
    issue('iss-cart-6', 'scan-single-4', 'moderate', 'duplicate-id', 'Duplicate id on promo strip', 'technical', 2),
    issue('iss-cart-7', 'scan-single-4', 'minor', 'region', 'Aside without accessible name', 'accessibility', 1),
    issue('iss-cart-8', 'scan-single-4', 'serious', 'aria-valid-attr-value', 'Invalid aria-expanded value', 'accessibility', 1),
    issue('iss-cart-9', 'scan-single-4', 'minor', 'html-has-lang', 'lang set on body only', 'content', 1),
  ],
  'scan-deep-2': [
    issue('iss-shop-1', 'scan-deep-2', 'critical', 'color-contrast', 'Primary CTA contrast failures on PDPs', 'accessibility', 28),
    issue('iss-shop-2', 'scan-deep-2', 'critical', 'label', 'Filter inputs without labels', 'accessibility', 14),
    issue('iss-shop-3', 'scan-deep-2', 'serious', 'image-alt', 'Gallery thumbnails missing alt', 'accessibility', 40),
    issue('iss-shop-4', 'scan-deep-2', 'serious', 'canonical', 'Facet URLs without canonical', 'seo', 22),
    issue('iss-shop-5', 'scan-deep-2', 'serious', 'document-title', 'Category titles not unique', 'seo', 12),
    issue('iss-shop-6', 'scan-deep-2', 'moderate', 'list', 'Spec tables as plain text', 'content', 19),
    issue('iss-shop-7', 'scan-deep-2', 'moderate', 'link-name', '“Buy now” repeated without context', 'content', 33),
    issue('iss-shop-8', 'scan-deep-2', 'moderate', 'meta-description', 'Template meta too short', 'seo', 17),
    issue('iss-shop-9', 'scan-deep-2', 'serious', 'keyboard', 'Color swatches not keyboard operable', 'accessibility', 8),
    issue('iss-shop-10', 'scan-deep-2', 'minor', 'favicon', 'Inconsistent favicon sizes', 'technical', 1),
    issue('iss-shop-11', 'scan-deep-2', 'moderate', 'open-graph', 'Missing OG on category pages', 'seo', 11),
    issue('iss-shop-12', 'scan-deep-2', 'serious', 'frame-title', 'Payment iframe untitled', 'accessibility', 3),
    issue('iss-shop-13', 'scan-deep-2', 'minor', 'bypass', 'Skip link hidden visually only', 'accessibility', 1),
    issue('iss-shop-14', 'scan-deep-2', 'moderate', 'heading-order', 'H1 missing on brand pages', 'accessibility', 6),
    issue('iss-shop-15', 'scan-deep-2', 'serious', 'hreflang', 'Shop locales incomplete', 'seo', 4),
    issue('iss-shop-16', 'scan-deep-2', 'critical', 'aria-hidden-focus', 'Focusable inside aria-hidden drawer', 'accessibility', 5),
    issue('iss-shop-17', 'scan-deep-2', 'moderate', 'robots-txt', 'Staging paths crawlable', 'technical', 1),
    issue('iss-shop-18', 'scan-deep-2', 'minor', 'viewport', 'user-scalable=no on mobile checkout', 'technical', 1),
    issue('iss-shop-19', 'scan-deep-2', 'serious', 'button-name', 'Wishlist heart unlabeled', 'accessibility', 9),
    issue('iss-shop-20', 'scan-deep-2', 'moderate', 'definition-list', 'Specs not in dl markup', 'content', 7),
    issue('iss-shop-21', 'scan-deep-2', 'minor', 'meta-refresh', 'Legacy redirect meta on old URLs', 'technical', 2),
    issue('iss-shop-22', 'scan-deep-2', 'moderate', 'landmark-banner', 'Multiple banners without labels', 'accessibility', 3),
  ],
  'domain-1': LIVE_DOMAIN_ISSUES,
  'domain-2': [],
}

// domain-2 mirrors its deep-scan sibling for light payload demos
ISSUE_FIXTURES['domain-2'] = ISSUE_FIXTURES['scan-deep-2'].map((i, idx) => ({
  ...i,
  id: `dom2-${idx}`,
  scanId: 'domain-2',
}))

/** Deterministic dummy payload for newly launched scans (instant complete). */
export function synthesizeCompletedScan(input: {
  id: string
  projectId: string
  mode: 'single' | 'deep'
  url: string
  platformProjectId?: string
  audionRunId?: string
  stepUrl?: string
}): { scan: ScanSummary; scores: ScoreCard[]; issues: IssueSummary[] } {
  const seed = input.url.length + (input.mode === 'deep' ? 17 : 3)
  const accessibility = 55 + (seed % 40)
  const seo = 50 + ((seed * 3) % 45)
  const best = 60 + ((seed * 5) % 35)
  const perf = 45 + ((seed * 7) % 40)
  const overall = Math.round((accessibility + seo + best + perf) / 4)
  const issues: IssueSummary[] = [
    issue(
      `${input.id}-i1`,
      input.id,
      'critical',
      'color-contrast',
      `Contrast issue on ${input.url}`,
      'accessibility',
      2 + (seed % 5),
      'Synthesized dummy contrast finding for newly launched scans.',
      'button.primary',
    ),
    issue(
      `${input.id}-i2`,
      input.id,
      'serious',
      'image-alt',
      'Dummy alt-text findings',
      'accessibility',
      1 + (seed % 8),
      'Synthesized alt-text gap for demo launches.',
    ),
    issue(
      `${input.id}-i3`,
      input.id,
      'moderate',
      'meta-description',
      'Dummy SEO meta finding',
      'seo',
      1,
      'Synthesized meta description note.',
    ),
    issue(
      `${input.id}-i4`,
      input.id,
      'minor',
      'document-title',
      'Dummy title polish',
      'seo',
      1,
    ),
  ]
  if (input.mode === 'deep') {
    issues.push(
      issue(`${input.id}-i5`, input.id, 'serious', 'canonical', 'Dummy canonical conflicts across pages', 'seo', 6 + (seed % 10)),
      issue(`${input.id}-i6`, input.id, 'moderate', 'heading-order', 'Dummy heading-order cluster', 'accessibility', 4 + (seed % 12)),
    )
  }
  const now = new Date().toISOString()
  return {
    scan: {
      id: input.id,
      projectId: input.projectId,
      mode: input.mode,
      url: input.url,
      status: 'completed',
      startedAt: now,
      completedAt: now,
      overallScore: overall,
      issueCount: issues.length,
      ...(input.platformProjectId ? { platformProjectId: input.platformProjectId } : {}),
      ...(input.audionRunId ? { audionRunId: input.audionRunId } : {}),
      ...(input.stepUrl ? { stepUrl: input.stepUrl } : {}),
    },
    scores: DEFAULT_SCORES(accessibility, seo, best, perf),
    issues,
  }
}

export function buildScanOverview(scanId: string): ScanOverview | null {
  const scan = SCAN_FIXTURES.find((s) => s.id === scanId)
  if (!scan) return null
  const scores = SCORE_FIXTURES[scanId] ?? []
  const issues = ISSUE_FIXTURES[scanId] ?? []
  return {
    scan,
    scores,
    topIssues: selectTopIssueGroups(issues, 5),
    lede:
      scan.status === 'running'
        ? 'Dummy scan still marked running — open other completed results to explore.'
        : scan.mode === 'single'
          ? 'Single-page quality snapshot with accessibility and SEO highlights.'
          : 'Deep scan summary across the domain with aggregated scores and top issues.',
  }
}
