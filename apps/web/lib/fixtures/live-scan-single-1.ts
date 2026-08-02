import type {
  IssueSummary,
  PassedCheck,
  ScanOverview,
  ScanSummary,
  ScoreCard,
} from '@checkion-v3/contracts'

/** Live import from checkion.projects-a — Dürr Consulting single scan.
 *  Source id: f41239b0-fc31-47ff-8b13-81a4b1ed836a
 *  Captured: 2026-07-31T10:04:26.314Z
 *  Do not put API tokens in this file.
 */

export const LIVE_SOURCE_SCAN_ID = "f41239b0-fc31-47ff-8b13-81a4b1ed836a"

export const LIVE_SCAN_SUMMARY: ScanSummary = {
  id: "scan-single-1",
  projectId: 'proj-demo-1',
  mode: 'single',
  url: "https://www.durr-consulting.com/de/kompetenzen/industrialisierung/automotive-brownfield-integration",
  status: 'completed',
  startedAt: "2026-07-31T10:03:51.599Z",
  completedAt: "2026-07-31T10:04:26.314Z",
  overallScore: 49,
  issueCount: 104,
  groupId: "38da397c-1138-4fdb-9a82-dcddf388fbf6",
  device: "desktop",
  standard: "WCAG2AA",
  runners: ["axe", "htmlcs"],
  durationMs: 34715,
  issueStats: {
    errors: 104,
    warnings: 0,
    notices: 0,
    total: 104,
    passed: 27,
    byWcagLevel: { A: 9, AA: 95, AAA: 0 },
  },
}

export const LIVE_SCORE_CARDS: ScoreCard[] = [
  { kind: 'accessibility', label: 'Accessibility', value: 0, max: 100 },
  { kind: 'seo', label: 'SEO', value: 87, max: 100 },
  { kind: 'best_practices', label: 'Best practices', value: 61, max: 100 },
  { kind: 'performance', label: 'Performance', value: 35, max: 100 },
  { kind: 'ux', label: 'UX lab', value: 10, max: 100 },
  { kind: 'eco', label: 'Eco', value: 98, max: 100 },
  { kind: 'generative', label: 'GEO', value: 54, max: 100 },
]

export const LIVE_ISSUES: IssueSummary[] = [
  {
    "id": "live-iss-1",
    "scanId": "scan-single-1",
    "severity": "moderate",
    "ruleId": "aria-required-children",
    "title": "Certain ARIA roles must contain particular children",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Certain ARIA roles must contain particular children",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul",
    "context": "<ul class=\"navigation__list navigation__list--firstlevel\" role=\"menu\">\n\t\t\t\t\t\n\t\n\t\t\n\t\t\t\n\t\t\t\t\t\n\t\t\t\t\t<li ...</ul>",
    "runner": "axe",
    "wcagLevel": "A",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/aria-required-children",
    "boundingBox": {
      "x": 384.0,
      "y": 90.4,
      "width": 1152.0,
      "height": 61.6
    }
  },
  {
    "id": "live-iss-10",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "html > body > div:nth-child(6) > div:nth-child(2) > ul > li:nth-child(3) > a",
    "context": "<a href=\"/de/kompetenzen\" title=\"Kompetenzen\" class=\"active sub\">Kompetenzen</a>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 538.7,
      "y": 805.6,
      "width": 90.7,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-100",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 2.9:1. Recommendation:  change text colour to #747581.",
    "selector": "html > body > footer > div > div:nth-child(4) > div > ul > li:nth-child(3) > a",
    "context": "<a href=\"/de/impressum\" class=\"footerlink footerlink--gray\" target=\"_self\">\n\t\tImpressum\n\t</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 499.2,
      "y": 4869.6,
      "width": 80.4,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-101",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 2.9:1. Recommendation:  change text colour to #747581.",
    "selector": "html > body > footer > div > div:nth-child(4) > div > ul > li:nth-child(5) > a",
    "context": "<a href=\"/de/sitemap\" class=\"footerlink footerlink--gray\" target=\"_self\">\n\t\tSitemap\n\t</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 594.9,
      "y": 4869.6,
      "width": 59.8,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-102",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 2.9:1. Recommendation:  change text colour to #747581.",
    "selector": "html > body > footer > div > div:nth-child(4) > div > ul > li:nth-child(7) > a",
    "context": "<a href=\"https://www.durr-group.com/de/investoren/corporate-governance/compliance\" class=\"footerlink footerlink--gray\" target=\"_blank\">\n\t\tIntegrity Line\n\t</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 670.0,
      "y": 4869.6,
      "width": 105.5,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-103",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 2.9:1. Recommendation:  change text colour to #747581.",
    "selector": "html > body > footer > div > div:nth-child(4) > div > ul > li:nth-child(9) > a",
    "context": "<a href=\"/de/cookies\" class=\"footerlink footerlink--gray\" target=\"_self\">\n\t\tCookies\n\t</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 790.7,
      "y": 4869.6,
      "width": 59.0,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-11",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "html > body > div:nth-child(6) > div:nth-child(2) > ul > li:nth-child(5) > a",
    "context": "<a href=\"/de/kompetenzen/industrialisierung\" title=\"Industrialisierung\" class=\"active sub\">Industrialisierung</a>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 650.2,
      "y": 805.6,
      "width": 113.1,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-12",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "html > body > div:nth-child(6) > div:nth-child(2) > ul > li:nth-child(7)",
    "context": "<li class=\"active current\">\nAutomotive Brownfield Integrat...</li>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 784.2,
      "y": 803.6,
      "width": 224.1,
      "height": 24.0
    }
  },
  {
    "id": "live-iss-13",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "#heading-180691-180700 > div > a",
    "context": "<a class=\"collapsed\" role=\"button\" href=\"#collapse-180691-180700\" data-toggle=\"collapse\" data-parent=\"#accordion-180691\" aria-expanded=\"false\" aria-controls=\"collapse-180691-180700\">\n\t\t\t\t\n\t\t\t\tWorin unterscheidet s...</a>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 384.0,
      "y": 3290.0,
      "width": 1122.0,
      "height": 67.0
    }
  },
  {
    "id": "live-iss-14",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "#heading-180691-180698 > div > a",
    "context": "<a class=\"collapsed\" role=\"button\" href=\"#collapse-180691-180698\" data-toggle=\"collapse\" data-parent=\"#accordion-180691\" aria-expanded=\"false\" aria-controls=\"collapse-180691-180698\">\n\t\t\t\t\n\t\t\t\tWas ist Automotive Br...</a>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 384.0,
      "y": 3359.0,
      "width": 1122.0,
      "height": 67.0
    }
  },
  {
    "id": "live-iss-15",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "#heading-180691-180696 > div > a",
    "context": "<a class=\"collapsed\" role=\"button\" href=\"#collapse-180691-180696\" data-toggle=\"collapse\" data-parent=\"#accordion-180691\" aria-expanded=\"false\" aria-controls=\"collapse-180691-180696\">\n\t\t\t\t\n\t\t\t\tWie minimiert man Sti...</a>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 384.0,
      "y": 3428.0,
      "width": 1122.0,
      "height": 67.0
    }
  },
  {
    "id": "live-iss-16",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "#heading-180691-180694 > div > a",
    "context": "<a class=\"collapsed\" role=\"button\" href=\"#collapse-180691-180694\" data-toggle=\"collapse\" data-parent=\"#accordion-180691\" aria-expanded=\"false\" aria-controls=\"collapse-180691-180694\">\n\t\t\t\t\n\t\t\t\tBegleitet Dürr Consul...</a>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 384.0,
      "y": 3497.0,
      "width": 1122.0,
      "height": 67.0
    }
  },
  {
    "id": "live-iss-17",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "#heading-180691-180692 > div > a",
    "context": "<a class=\"collapsed\" role=\"button\" href=\"#collapse-180691-180692\" data-toggle=\"collapse\" data-parent=\"#accordion-180691\" aria-expanded=\"false\" aria-controls=\"collapse-180691-180692\">\n\t\t\t\t\n\t\t\t\tWelche Ergebnisse kan...</a>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 384.0,
      "y": 3566.0,
      "width": 1122.0,
      "height": 67.0
    }
  },
  {
    "id": "live-iss-18",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "#c166615 > div > div:nth-child(1) > div:nth-child(2) > div:nth-child(2) > div:nth-child(1)",
    "context": "<div>Senior Manager</div>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 717.6,
      "y": 4136.6,
      "width": 283.2,
      "height": 24.0
    }
  },
  {
    "id": "live-iss-19",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "#c166615 > div > div:nth-child(1) > div:nth-child(2) > div:nth-child(2) > div:nth-child(3)",
    "context": "<div class=\"contactbox__department\">Automotive</div>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 717.6,
      "y": 4186.6,
      "width": 283.2,
      "height": 24.0
    }
  },
  {
    "id": "live-iss-2",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(1) > a > span:nth-child(1)",
    "context": "<span>\n\t\t\tUnternehmen\n\t\t</span>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 404.0,
      "y": 111.4,
      "width": 106.2,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-20",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "#c166615 > div > div:nth-child(1) > div:nth-child(2) > div:nth-child(3) > ul > li:nth-child(1) > a",
    "context": "<a href=\"tel:+49 7142 78-1836\">+49 7142 78-1836</a>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 1146.8,
      "y": 4141.6,
      "width": 106.6,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-21",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "#c166615 > div > div:nth-child(1) > div:nth-child(2) > div:nth-child(3) > ul > li:nth-child(2) > a",
    "context": "<a href=\"#\" data-mailto-token=\"jxfiql7zlkpriqfkdXaroo+zlj?prygbzq=Tby%/-Ykcoxdb\" data-mailto-vector=\"-3\">consulting@durr.com</a>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 1146.8,
      "y": 4168.6,
      "width": 138.9,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-22",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "#c166615 > div > div:nth-child(2) > div > span:nth-child(2)",
    "context": "<span>&nbsp;Visitenkarte.vcf</span>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 480.0,
      "y": 4388.6,
      "width": 103.5,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-23",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "html > body > div:nth-child(7) > a:nth-child(1)",
    "context": "<a class=\"pinned__newsletter\" lang=\"en\" target=\"_blank\" href=\"/de/newsletter\"><span class=\"t3js-icon icon ico...</a>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 1687.4,
      "y": 922.0,
      "width": 167.6,
      "height": 50.0
    }
  },
  {
    "id": "live-iss-24",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "html > body > footer > div > div:nth-child(2) > div > div > a:nth-child(1) > span:nth-child(2)",
    "context": "<span class=\"footer__icontext\">facebook</span>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 409.0,
      "y": 4680.6,
      "width": 87.8,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-25",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "html > body > footer > div > div:nth-child(2) > div > div > a:nth-child(2) > span:nth-child(2)",
    "context": "<span class=\"footer__icontext\">youtube</span>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 589.0,
      "y": 4680.6,
      "width": 79.5,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-26",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "html > body > footer > div > div:nth-child(2) > div > div > a:nth-child(3) > span:nth-child(2)",
    "context": "<span class=\"footer__icontext\">linkedin</span>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 769.0,
      "y": 4680.6,
      "width": 79.2,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-27",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "html > body > footer > div > div:nth-child(2) > div > div > a:nth-child(4) > span:nth-child(2)",
    "context": "<span class=\"footer__icontext\">instagram</span>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 949.0,
      "y": 4680.6,
      "width": 94.1,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-28",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "html > body > footer > div > div:nth-child(2) > div > div > a:nth-child(5) > span:nth-child(2)",
    "context": "<span class=\"footer__icontext\">kununu</span>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 409.0,
      "y": 4715.6,
      "width": 74.1,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-29",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "html > body > footer > div > div:nth-child(2) > div > div > a:nth-child(6) > span:nth-child(2)",
    "context": "<span class=\"footer__icontext\">xing</span>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 589.0,
      "y": 4715.6,
      "width": 47.4,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-3",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(2) > a > span:nth-child(1)",
    "context": "<span>\n\t\t\tKompetenzen\n\t\t</span>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 550.2,
      "y": 111.4,
      "width": 103.1,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-30",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "html > body > footer > div > div:nth-child(4) > div > ul > li:nth-child(1) > a",
    "context": "<a href=\"https://www.durr.com/de/datenschutz\" class=\"footerlink footerlink--gray\" target=\"_blank\">\n\t\tDatenschutz\n\t</a>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 384.0,
      "y": 4869.6,
      "width": 99.9,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-31",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "html > body > footer > div > div:nth-child(4) > div > ul > li:nth-child(3) > a",
    "context": "<a href=\"/de/impressum\" class=\"footerlink footerlink--gray\" target=\"_self\">\n\t\tImpressum\n\t</a>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 499.2,
      "y": 4869.6,
      "width": 80.4,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-32",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "html > body > footer > div > div:nth-child(4) > div > ul > li:nth-child(5) > a",
    "context": "<a href=\"/de/sitemap\" class=\"footerlink footerlink--gray\" target=\"_self\">\n\t\tSitemap\n\t</a>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 594.9,
      "y": 4869.6,
      "width": 59.8,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-33",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "html > body > footer > div > div:nth-child(4) > div > ul > li:nth-child(7) > a",
    "context": "<a href=\"https://www.durr-group.com/de/investoren/corporate-governance/compliance\" class=\"footerlink footerlink--gray\" target=\"_blank\">\n\t\tIntegrity Line\n\t</a>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 670.0,
      "y": 4869.6,
      "width": 105.5,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-34",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "html > body > footer > div > div:nth-child(4) > div > ul > li:nth-child(9) > a",
    "context": "<a href=\"/de/cookies\" class=\"footerlink footerlink--gray\" target=\"_self\">\n\t\tCookies\n\t</a>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 790.7,
      "y": 4869.6,
      "width": 59.0,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-35",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "link-name",
    "title": "Links must have discernible text",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Links must have discernible text",
    "selector": "html > body > header > nav > div:nth-child(1) > div > a",
    "context": "<a href=\"/de/\"><span class=\"t3js-icon icon ico...</a>",
    "runner": "axe",
    "wcagLevel": "A",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/link-name",
    "boundingBox": {
      "x": 1448.0,
      "y": 41.0,
      "width": 88.0,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-36",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "link-name",
    "title": "Links must have discernible text",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Links must have discernible text",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(8) > a",
    "context": "<a href=\"#\" target=\"_self\" data-page=\"1\" class=\"navigation__link navigation__link--firstlevel\" tabindex=\"9\">\n\t\t\t\t\t\t\t<span class=\"material-i...</a>",
    "runner": "axe",
    "wcagLevel": "A",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/link-name",
    "boundingBox": {
      "x": 1248.6,
      "y": 106.2,
      "width": 24.0,
      "height": 24.0
    }
  },
  {
    "id": "live-iss-37",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "link-name",
    "title": "Links must have discernible text",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Links must have discernible text",
    "selector": "html > body > footer > div > div:nth-child(5) > a",
    "context": "<a href=\"https://www.durr-group.com\" target=\"_blank\">\n\t\t\t\t\t\t\t\n\t\t\t\t\t\t\t<span class=\"t3...</a>",
    "runner": "axe",
    "wcagLevel": "A",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/link-name",
    "boundingBox": {
      "x": 384.0,
      "y": 4970.6,
      "width": 150.0,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-38",
    "scanId": "scan-single-1",
    "severity": "moderate",
    "ruleId": "listitem",
    "title": "<li> elements must be contained in a <ul> or <ol>",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "<li> elements must be contained in a <ul> or <ol>",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(1)",
    "context": "<li class=\"navigation__item navigation__item--firstlevel megamenu\">\n\t\t\t\t\t\t\n\t\n\t\t\n\n\t\t\n\t\t\n\n\t\t\n\t\t\n\n\t<a...</li>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 384.0,
      "y": 90.4,
      "width": 146.2,
      "height": 61.6
    }
  },
  {
    "id": "live-iss-39",
    "scanId": "scan-single-1",
    "severity": "moderate",
    "ruleId": "listitem",
    "title": "<li> elements must be contained in a <ul> or <ol>",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "<li> elements must be contained in a <ul> or <ol>",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(2)",
    "context": "<li class=\"navigation__item navigation__item--firstlevel  megamenu\">\n\t\t\t\t\t\t\n\t\n\t\t\n\n\t\t\n\t\t\n\n\t\t\n\t\t\n\n\t<a...</li>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 530.2,
      "y": 90.4,
      "width": 143.1,
      "height": 61.6
    }
  },
  {
    "id": "live-iss-4",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(3) > a > span:nth-child(1)",
    "context": "<span>\n\t\t\tMarket Insights\n\t\t</span>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 693.3,
      "y": 111.4,
      "width": 122.6,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-40",
    "scanId": "scan-single-1",
    "severity": "moderate",
    "ruleId": "listitem",
    "title": "<li> elements must be contained in a <ul> or <ol>",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "<li> elements must be contained in a <ul> or <ol>",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(3)",
    "context": "<li class=\"navigation__item navigation__item--firstlevel megamenu\">\n\t\t\t\t\t\t\n\t\n\t\t\n\n\t\t\n\t\t\n\n\t\t\n\t\t\n\n\t<a...</li>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 673.3,
      "y": 90.4,
      "width": 162.6,
      "height": 61.6
    }
  },
  {
    "id": "live-iss-41",
    "scanId": "scan-single-1",
    "severity": "moderate",
    "ruleId": "listitem",
    "title": "<li> elements must be contained in a <ul> or <ol>",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "<li> elements must be contained in a <ul> or <ol>",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(4)",
    "context": "<li class=\"navigation__item navigation__item--firstlevel\">\n\t\t\t\t\t\t\n\t\n\t\t\n\t\t\t\n\t\t\n\n\t\t\n\t\t\n\n\t\t<...</li>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 835.9,
      "y": 90.4,
      "width": 81.5,
      "height": 61.6
    }
  },
  {
    "id": "live-iss-42",
    "scanId": "scan-single-1",
    "severity": "moderate",
    "ruleId": "listitem",
    "title": "<li> elements must be contained in a <ul> or <ol>",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "<li> elements must be contained in a <ul> or <ol>",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(5)",
    "context": "<li class=\"navigation__item navigation__item--firstlevel megamenu\">\n\t\t\t\t\t\t\n\t\n\t\t\n\n\t\t\n\t\t\n\n\t\t\n\t\t\n\n\t<a...</li>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 917.4,
      "y": 90.4,
      "width": 104.1,
      "height": 61.6
    }
  },
  {
    "id": "live-iss-43",
    "scanId": "scan-single-1",
    "severity": "moderate",
    "ruleId": "listitem",
    "title": "<li> elements must be contained in a <ul> or <ol>",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "<li> elements must be contained in a <ul> or <ol>",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(6)",
    "context": "<li class=\"navigation__item navigation__item--firstlevel\">\n\t\t\t\t\t\t\n\t\n\t\t\n\t\t\t\n\t\t\n\n\t\t\n\t\t\n\n\t\t<...</li>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 1021.5,
      "y": 90.4,
      "width": 115.6,
      "height": 61.6
    }
  },
  {
    "id": "live-iss-44",
    "scanId": "scan-single-1",
    "severity": "moderate",
    "ruleId": "listitem",
    "title": "<li> elements must be contained in a <ul> or <ol>",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "<li> elements must be contained in a <ul> or <ol>",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(7)",
    "context": "<li class=\"navigation__item navigation__item--firstlevel megamenu\">\n\t\t\t\t\t\t<a href=\"#\" target=\"_sel...</li>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 1137.1,
      "y": 90.4,
      "width": 111.5,
      "height": 61.6
    }
  },
  {
    "id": "live-iss-45",
    "scanId": "scan-single-1",
    "severity": "moderate",
    "ruleId": "listitem",
    "title": "<li> elements must be contained in a <ul> or <ol>",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "<li> elements must be contained in a <ul> or <ol>",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(8)",
    "context": "<li class=\"navigation__item navigation__item--firstlevel megamenu\">\n\t\t\t\t\t\t<a href=\"#\" target=\"_sel...</li>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 1248.6,
      "y": 106.2,
      "width": 24.0,
      "height": 30.0
    }
  },
  {
    "id": "live-iss-46",
    "scanId": "scan-single-1",
    "severity": "moderate",
    "ruleId": "nested-interactive",
    "title": "Interactive controls must not be nested",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Interactive controls must not be nested",
    "selector": "#heading-180691-180700",
    "context": "<div class=\"panel-heading\" role=\"tab\" id=\"heading-180691-180700\"><div class=\"panel-title\"><a cla...</div>",
    "runner": "axe",
    "wcagLevel": "A",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/nested-interactive",
    "boundingBox": {
      "x": 384.0,
      "y": 3290.0,
      "width": 1152.0,
      "height": 67.0
    }
  },
  {
    "id": "live-iss-47",
    "scanId": "scan-single-1",
    "severity": "moderate",
    "ruleId": "nested-interactive",
    "title": "Interactive controls must not be nested",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Interactive controls must not be nested",
    "selector": "#heading-180691-180698",
    "context": "<div class=\"panel-heading\" role=\"tab\" id=\"heading-180691-180698\"><div class=\"panel-title\"><a cla...</div>",
    "runner": "axe",
    "wcagLevel": "A",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/nested-interactive",
    "boundingBox": {
      "x": 384.0,
      "y": 3359.0,
      "width": 1152.0,
      "height": 67.0
    }
  },
  {
    "id": "live-iss-48",
    "scanId": "scan-single-1",
    "severity": "moderate",
    "ruleId": "nested-interactive",
    "title": "Interactive controls must not be nested",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Interactive controls must not be nested",
    "selector": "#heading-180691-180696",
    "context": "<div class=\"panel-heading\" role=\"tab\" id=\"heading-180691-180696\"><div class=\"panel-title\"><a cla...</div>",
    "runner": "axe",
    "wcagLevel": "A",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/nested-interactive",
    "boundingBox": {
      "x": 384.0,
      "y": 3428.0,
      "width": 1152.0,
      "height": 67.0
    }
  },
  {
    "id": "live-iss-49",
    "scanId": "scan-single-1",
    "severity": "moderate",
    "ruleId": "nested-interactive",
    "title": "Interactive controls must not be nested",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Interactive controls must not be nested",
    "selector": "#heading-180691-180694",
    "context": "<div class=\"panel-heading\" role=\"tab\" id=\"heading-180691-180694\"><div class=\"panel-title\"><a cla...</div>",
    "runner": "axe",
    "wcagLevel": "A",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/nested-interactive",
    "boundingBox": {
      "x": 384.0,
      "y": 3497.0,
      "width": 1152.0,
      "height": 67.0
    }
  },
  {
    "id": "live-iss-5",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(4) > a > span",
    "context": "<span>\n\t\t\tNews\n\t\t</span>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 855.9,
      "y": 111.4,
      "width": 41.5,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-50",
    "scanId": "scan-single-1",
    "severity": "moderate",
    "ruleId": "nested-interactive",
    "title": "Interactive controls must not be nested",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Interactive controls must not be nested",
    "selector": "#heading-180691-180692",
    "context": "<div class=\"panel-heading\" role=\"tab\" id=\"heading-180691-180692\"><div class=\"panel-title\"><a cla...</div>",
    "runner": "axe",
    "wcagLevel": "A",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/nested-interactive",
    "boundingBox": {
      "x": 384.0,
      "y": 3566.0,
      "width": 1152.0,
      "height": 67.0
    }
  },
  {
    "id": "live-iss-51",
    "scanId": "scan-single-1",
    "severity": "moderate",
    "ruleId": "tabindex",
    "title": "Elements should not have tabindex greater than zero",
    "section": "technical",
    "affectedCount": 1,
    "detail": "Elements should not have tabindex greater than zero",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(1) > a",
    "context": "<a href=\"/de/unternehmen\" class=\"navigation__link navigation__link--icon-right navigation__link--firstlevel\" target=\"_self\" title=\"\" tabindex=\"11\" data-page=\"1429\">\n\t\t\n\t\t<span>\n\t\t\tUnternehmen\n\t\t<...</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 384.0,
      "y": 90.4,
      "width": 146.2,
      "height": 61.6
    }
  },
  {
    "id": "live-iss-52",
    "scanId": "scan-single-1",
    "severity": "moderate",
    "ruleId": "tabindex",
    "title": "Elements should not have tabindex greater than zero",
    "section": "technical",
    "affectedCount": 1,
    "detail": "Elements should not have tabindex greater than zero",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(2) > a",
    "context": "<a href=\"/de/kompetenzen\" class=\"navigation__link navigation__link--icon-right navigation__link--firstlevel\" target=\"_self\" title=\"\" tabindex=\"12\" data-page=\"10057\">\n\t\t\n\t\t<span>\n\t\t\tKompetenzen\n\t\t<...</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 530.2,
      "y": 90.4,
      "width": 143.1,
      "height": 61.6
    }
  },
  {
    "id": "live-iss-53",
    "scanId": "scan-single-1",
    "severity": "moderate",
    "ruleId": "tabindex",
    "title": "Elements should not have tabindex greater than zero",
    "section": "technical",
    "affectedCount": 1,
    "detail": "Elements should not have tabindex greater than zero",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(3) > a",
    "context": "<a href=\"/de/market-insights\" class=\"navigation__link navigation__link--icon-right navigation__link--firstlevel\" target=\"_self\" title=\"\" tabindex=\"13\" data-page=\"16526\">\n\t\t\n\t\t<span>\n\t\t\tMarket Insights...</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 673.3,
      "y": 90.4,
      "width": 162.6,
      "height": 61.6
    }
  },
  {
    "id": "live-iss-54",
    "scanId": "scan-single-1",
    "severity": "moderate",
    "ruleId": "tabindex",
    "title": "Elements should not have tabindex greater than zero",
    "section": "technical",
    "affectedCount": 1,
    "detail": "Elements should not have tabindex greater than zero",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(4) > a",
    "context": "<a href=\"https://www.durr.com/de/media/news\" class=\"navigation__link navigation__link--firstlevel\" target=\"_blank\" title=\"\" tabindex=\"14\">\n\t\t\t\n\t\t\t<span>\n\t\t\tNews\n\t\t</span...</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 835.9,
      "y": 90.4,
      "width": 81.5,
      "height": 61.6
    }
  },
  {
    "id": "live-iss-55",
    "scanId": "scan-single-1",
    "severity": "moderate",
    "ruleId": "tabindex",
    "title": "Elements should not have tabindex greater than zero",
    "section": "technical",
    "affectedCount": 1,
    "detail": "Elements should not have tabindex greater than zero",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(5) > a",
    "context": "<a href=\"/de/kontakt\" class=\"navigation__link navigation__link--icon-right navigation__link--firstlevel\" target=\"_self\" title=\"\" tabindex=\"15\" data-page=\"1432\">\n\t\t\n\t\t<span>\n\t\t\tKontakt\n\t\t</spa...</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 917.4,
      "y": 90.4,
      "width": 104.1,
      "height": 61.6
    }
  },
  {
    "id": "live-iss-56",
    "scanId": "scan-single-1",
    "severity": "moderate",
    "ruleId": "tabindex",
    "title": "Elements should not have tabindex greater than zero",
    "section": "technical",
    "affectedCount": 1,
    "detail": "Elements should not have tabindex greater than zero",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(6) > a",
    "context": "<a href=\"https://reframed.durr.com/de/\" class=\"navigation__link navigation__link--firstlevel\" target=\"_blank\" title=\"\" tabindex=\"16\">\n\t\t\t\n\t\t\t<span>\n\t\t\tREFRAMED\n\t\t</...</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 1021.5,
      "y": 90.4,
      "width": 115.6,
      "height": 61.6
    }
  },
  {
    "id": "live-iss-57",
    "scanId": "scan-single-1",
    "severity": "moderate",
    "ruleId": "tabindex",
    "title": "Elements should not have tabindex greater than zero",
    "section": "technical",
    "affectedCount": 1,
    "detail": "Elements should not have tabindex greater than zero",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(7) > a",
    "context": "<a href=\"#\" target=\"_self\" data-page=\"2\" class=\"navigation__link navigation__link--firstlevel\" tabindex=\"10\">\n\t\t\t\t\t\t\t<span class=\"material-i...</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 1137.1,
      "y": 90.4,
      "width": 111.5,
      "height": 61.6
    }
  },
  {
    "id": "live-iss-58",
    "scanId": "scan-single-1",
    "severity": "moderate",
    "ruleId": "tabindex",
    "title": "Elements should not have tabindex greater than zero",
    "section": "technical",
    "affectedCount": 1,
    "detail": "Elements should not have tabindex greater than zero",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(8) > a",
    "context": "<a href=\"#\" target=\"_self\" data-page=\"1\" class=\"navigation__link navigation__link--firstlevel\" tabindex=\"9\">\n\t\t\t\t\t\t\t<span class=\"material-i...</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 1248.6,
      "y": 106.2,
      "width": 24.0,
      "height": 24.0
    }
  },
  {
    "id": "live-iss-6",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(5) > a > span:nth-child(1)",
    "context": "<span>\n\t\t\tKontakt\n\t\t</span>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 937.4,
      "y": 111.4,
      "width": 64.1,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-7",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(6) > a > span",
    "context": "<span>\n\t\t\tREFRAMED\n\t\t</span>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 1041.5,
      "y": 111.4,
      "width": 75.6,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-70",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "NoContent",
    "title": "Anchor element found with a valid href attribute, but no link content has been supplied.",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Anchor element found with a valid href attribute, but no link content has been supplied.",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(8) > a",
    "context": "<a href=\"#\" target=\"_self\" data-page=\"1\" class=\"navigation__link navigation__link--firstlevel\" tabindex=\"9\">\n\t\t\t\t\t\t\t<span class=\"material-i...</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 1248.6,
      "y": 106.2,
      "width": 24.0,
      "height": 24.0
    }
  },
  {
    "id": "live-iss-74",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 2.58:1. Recommendation:  change text colour to #020410.",
    "selector": "html > body > div:nth-child(6) > div:nth-child(2) > ul > li:nth-child(1) > a",
    "context": "<a href=\"/de/\" title=\"Home - DÜRR Consulting | DE\" class=\"active sub\">durr-consulting.com</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 384.0,
      "y": 805.6,
      "width": 133.9,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-75",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 2.58:1. Recommendation:  change text colour to #020410.",
    "selector": "html > body > div:nth-child(6) > div:nth-child(2) > ul > li:nth-child(2) > span",
    "context": "<span class=\"breadcrumb__divider\">&gt;</span>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 520.6,
      "y": 805.6,
      "width": 15.4,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-76",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 2.58:1. Recommendation:  change text colour to #020410.",
    "selector": "html > body > div:nth-child(6) > div:nth-child(2) > ul > li:nth-child(3) > a",
    "context": "<a href=\"/de/kompetenzen\" title=\"Kompetenzen\" class=\"active sub\">Kompetenzen</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 538.7,
      "y": 805.6,
      "width": 90.7,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-77",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 2.58:1. Recommendation:  change text colour to #020410.",
    "selector": "html > body > div:nth-child(6) > div:nth-child(2) > ul > li:nth-child(4) > span",
    "context": "<span class=\"breadcrumb__divider\">&gt;</span>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 632.1,
      "y": 805.6,
      "width": 15.4,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-78",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 2.58:1. Recommendation:  change text colour to #020410.",
    "selector": "html > body > div:nth-child(6) > div:nth-child(2) > ul > li:nth-child(5) > a",
    "context": "<a href=\"/de/kompetenzen/industrialisierung\" title=\"Industrialisierung\" class=\"active sub\">Industrialisierung</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 650.2,
      "y": 805.6,
      "width": 113.1,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-79",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 2.58:1. Recommendation:  change text colour to #020410.",
    "selector": "html > body > div:nth-child(6) > div:nth-child(2) > ul > li:nth-child(6) > span",
    "context": "<span class=\"breadcrumb__divider\">&gt;</span>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 766.0,
      "y": 805.6,
      "width": 15.4,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-8",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "html > body > header > nav > div:nth-child(2) > div > ul > li:nth-child(7) > a > span:nth-child(2)",
    "context": "<span>Suche</span>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 1182.1,
      "y": 111.4,
      "width": 46.5,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-80",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 2.78:1. Recommendation:  change text colour to #001016.",
    "selector": "html > body > div:nth-child(6) > div:nth-child(2) > ul > li:nth-child(7)",
    "context": "<li class=\"active current\">\nAutomotive Brownfield Integrat...</li>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 784.2,
      "y": 803.6,
      "width": 224.1,
      "height": 24.0
    }
  },
  {
    "id": "live-iss-81",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 3.46:1. Recommendation:  change text colour to #000e14.",
    "selector": "#heading-180691-180700 > div > a",
    "context": "<a class=\"collapsed\" role=\"button\" href=\"#collapse-180691-180700\" data-toggle=\"collapse\" data-parent=\"#accordion-180691\" aria-expanded=\"false\" aria-controls=\"collapse-180691-180700\">\n\t\t\t\t\n\t\t\t\tWorin unterscheidet s...</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 384.0,
      "y": 3290.0,
      "width": 1122.0,
      "height": 67.0
    }
  },
  {
    "id": "live-iss-82",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 3.46:1. Recommendation:  change text colour to #000e14.",
    "selector": "#heading-180691-180698 > div > a",
    "context": "<a class=\"collapsed\" role=\"button\" href=\"#collapse-180691-180698\" data-toggle=\"collapse\" data-parent=\"#accordion-180691\" aria-expanded=\"false\" aria-controls=\"collapse-180691-180698\">\n\t\t\t\t\n\t\t\t\tWas ist Automotive Br...</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 384.0,
      "y": 3359.0,
      "width": 1122.0,
      "height": 67.0
    }
  },
  {
    "id": "live-iss-83",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 3.46:1. Recommendation:  change text colour to #000e14.",
    "selector": "#heading-180691-180696 > div > a",
    "context": "<a class=\"collapsed\" role=\"button\" href=\"#collapse-180691-180696\" data-toggle=\"collapse\" data-parent=\"#accordion-180691\" aria-expanded=\"false\" aria-controls=\"collapse-180691-180696\">\n\t\t\t\t\n\t\t\t\tWie minimiert man Sti...</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 384.0,
      "y": 3428.0,
      "width": 1122.0,
      "height": 67.0
    }
  },
  {
    "id": "live-iss-84",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 3.46:1. Recommendation:  change text colour to #000e14.",
    "selector": "#heading-180691-180694 > div > a",
    "context": "<a class=\"collapsed\" role=\"button\" href=\"#collapse-180691-180694\" data-toggle=\"collapse\" data-parent=\"#accordion-180691\" aria-expanded=\"false\" aria-controls=\"collapse-180691-180694\">\n\t\t\t\t\n\t\t\t\tBegleitet Dürr Consul...</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 384.0,
      "y": 3497.0,
      "width": 1122.0,
      "height": 67.0
    }
  },
  {
    "id": "live-iss-85",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 3.46:1. Recommendation:  change text colour to #000e14.",
    "selector": "#heading-180691-180692 > div > a",
    "context": "<a class=\"collapsed\" role=\"button\" href=\"#collapse-180691-180692\" data-toggle=\"collapse\" data-parent=\"#accordion-180691\" aria-expanded=\"false\" aria-controls=\"collapse-180691-180692\">\n\t\t\t\t\n\t\t\t\tWelche Ergebnisse kan...</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 384.0,
      "y": 3566.0,
      "width": 1122.0,
      "height": 67.0
    }
  },
  {
    "id": "live-iss-86",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "1",
    "title": "Img element with empty alt text must have absent or empty title attribute.",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Img element with empty alt text must have absent or empty title attribute.",
    "selector": "#c166615 > div > div:nth-child(1) > div:nth-child(1) > img",
    "context": "<img class=\"img-circle img-responsive\" loading=\"lazy\" src=\"/fileadmin/_processed_/6/7/csm_duerr-bild-susann-kaercher-klein_8de716d755.webp\" width=\"150\" height=\"150\" alt=\"\" title=\"Version 2\">",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 456.0,
      "y": 4112.6,
      "width": 150.0,
      "height": 150.0
    }
  },
  {
    "id": "live-iss-87",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 2.76:1. Recommendation:  change text colour to #747682.",
    "selector": "#c166615 > div > div:nth-child(1) > div:nth-child(2) > div:nth-child(2) > div:nth-child(1)",
    "context": "<div>Senior Manager</div>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 717.6,
      "y": 4136.6,
      "width": 283.2,
      "height": 24.0
    }
  },
  {
    "id": "live-iss-88",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 2.76:1. Recommendation:  change text colour to #747682.",
    "selector": "#c166615 > div > div:nth-child(1) > div:nth-child(2) > div:nth-child(2) > div:nth-child(3)",
    "context": "<div class=\"contactbox__department\">Automotive</div>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 717.6,
      "y": 4186.6,
      "width": 283.2,
      "height": 24.0
    }
  },
  {
    "id": "live-iss-89",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 3.71:1. Recommendation:  change text colour to #007eb5.",
    "selector": "#c166615 > div > div:nth-child(1) > div:nth-child(2) > div:nth-child(3) > ul > li:nth-child(1) > a",
    "context": "<a href=\"tel:+49 7142 78-1836\">+49 7142 78-1836</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 1146.8,
      "y": 4141.6,
      "width": 106.6,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-9",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "color-contrast",
    "title": "Elements must meet minimum color contrast ratio thresholds",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "Elements must meet minimum color contrast ratio thresholds",
    "selector": "html > body > div:nth-child(6) > div:nth-child(2) > ul > li:nth-child(1) > a",
    "context": "<a href=\"/de/\" title=\"Home - DÜRR Consulting | DE\" class=\"active sub\">durr-consulting.com</a>",
    "runner": "axe",
    "wcagLevel": "AA",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
    "boundingBox": {
      "x": 384.0,
      "y": 805.6,
      "width": 133.9,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-90",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 3.71:1. Recommendation:  change text colour to #007eb5.",
    "selector": "#c166615 > div > div:nth-child(1) > div:nth-child(2) > div:nth-child(3) > ul > li:nth-child(2) > a",
    "context": "<a href=\"#\" data-mailto-token=\"jxfiql7zlkpriqfkdXaroo+zlj?prygbzq=Tby%/-Ykcoxdb\" data-mailto-vector=\"-3\">consulting@durr.com</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 1146.8,
      "y": 4168.6,
      "width": 138.9,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-91",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 3.71:1. Recommendation:  change text colour to #007eb5.",
    "selector": "#c166615 > div > div:nth-child(2) > div > span:nth-child(2)",
    "context": "<span>&nbsp;Visitenkarte.vcf</span>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 480.0,
      "y": 4388.6,
      "width": 103.5,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-92",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 3.71:1. Recommendation:  change background to #007eb5.",
    "selector": "html > body > div:nth-child(7) > a:nth-child(1)",
    "context": "<a class=\"pinned__newsletter\" lang=\"en\" target=\"_blank\" href=\"/de/newsletter\"><span class=\"t3js-icon icon ico...</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 1687.4,
      "y": 922.0,
      "width": 167.6,
      "height": 50.0
    }
  },
  {
    "id": "live-iss-93",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 2.76:1. Recommendation:  change text colour to #747682.",
    "selector": "html > body > footer > div > div:nth-child(2) > div > div > a:nth-child(1) > span:nth-child(2)",
    "context": "<span class=\"footer__icontext\">facebook</span>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 409.0,
      "y": 4680.6,
      "width": 87.8,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-94",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 2.76:1. Recommendation:  change text colour to #747682.",
    "selector": "html > body > footer > div > div:nth-child(2) > div > div > a:nth-child(2) > span:nth-child(2)",
    "context": "<span class=\"footer__icontext\">youtube</span>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 589.0,
      "y": 4680.6,
      "width": 79.5,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-95",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 2.76:1. Recommendation:  change text colour to #747682.",
    "selector": "html > body > footer > div > div:nth-child(2) > div > div > a:nth-child(3) > span:nth-child(2)",
    "context": "<span class=\"footer__icontext\">linkedin</span>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 769.0,
      "y": 4680.6,
      "width": 79.2,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-96",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 2.76:1. Recommendation:  change text colour to #747682.",
    "selector": "html > body > footer > div > div:nth-child(2) > div > div > a:nth-child(4) > span:nth-child(2)",
    "context": "<span class=\"footer__icontext\">instagram</span>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 949.0,
      "y": 4680.6,
      "width": 94.1,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-97",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 2.76:1. Recommendation:  change text colour to #747682.",
    "selector": "html > body > footer > div > div:nth-child(2) > div > div > a:nth-child(5) > span:nth-child(2)",
    "context": "<span class=\"footer__icontext\">kununu</span>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 409.0,
      "y": 4715.6,
      "width": 74.1,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-98",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 2.76:1. Recommendation:  change text colour to #747682.",
    "selector": "html > body > footer > div > div:nth-child(2) > div > div > a:nth-child(6) > span:nth-child(2)",
    "context": "<span class=\"footer__icontext\">xing</span>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 589.0,
      "y": 4715.6,
      "width": 47.4,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-99",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 2.9:1. Recommendation:  change text colour to #747581.",
    "selector": "html > body > footer > div > div:nth-child(4) > div > ul > li:nth-child(1) > a",
    "context": "<a href=\"https://www.durr.com/de/datenschutz\" class=\"footerlink footerlink--gray\" target=\"_blank\">\n\t\tDatenschutz\n\t</a>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": {
      "x": 384.0,
      "y": 4869.6,
      "width": 99.9,
      "height": 19.0
    }
  },
  {
    "id": "live-iss-104",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Fail",
    "title": "This element has insufficient contrast at this conformance level. Expected a contrast r…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 3.71:1. Recommendation:  change text colour to #007eb5.",
    "selector": "html > body > footer > div > div:nth-child(5) > a > span > span > svg > desc",
    "context": "<desc>Dürr is one of the world's lead...</desc>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": undefined
  },
  {
    "id": "live-iss-59",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Name",
    "title": "This checkboxinput element does not have a name available to an accessibility API. Vali…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This checkboxinput element does not have a name available to an accessibility API. Valid names are: label element, title , aria-label , aria-labelledby .",
    "selector": "#cookies-all",
    "context": "<input type=\"checkbox\" id=\"cookies-all\" name=\"cookies-all\" value=\"cookies-all\">",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": undefined
  },
  {
    "id": "live-iss-60",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "F68",
    "title": "This form field should be labelled in some way. Use the label element (either with a \"f…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This form field should be labelled in some way. Use the label element (either with a \"for\" attribute or wrapped around the form field), or \"title\", \"aria-label\" or \"aria-labelledby\" attributes as appropriate.",
    "selector": "#cookies-all",
    "context": "<input type=\"checkbox\" id=\"cookies-all\" name=\"cookies-all\" value=\"cookies-all\">",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": undefined
  },
  {
    "id": "live-iss-61",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Name",
    "title": "This checkboxinput element does not have a name available to an accessibility API. Vali…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This checkboxinput element does not have a name available to an accessibility API. Valid names are: label element, title , aria-label , aria-labelledby .",
    "selector": "#cookies-required",
    "context": "<input type=\"checkbox\" class=\"cookiebanner__checkbox\" id=\"cookies-required\" name=\"cookies-required\" value=\"cookies-required\" checked=\"\" disabled=\"\">",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": undefined
  },
  {
    "id": "live-iss-62",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "F68",
    "title": "This form field should be labelled in some way. Use the label element (either with a \"f…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This form field should be labelled in some way. Use the label element (either with a \"for\" attribute or wrapped around the form field), or \"title\", \"aria-label\" or \"aria-labelledby\" attributes as appropriate.",
    "selector": "#cookies-required",
    "context": "<input type=\"checkbox\" class=\"cookiebanner__checkbox\" id=\"cookies-required\" name=\"cookies-required\" value=\"cookies-required\" checked=\"\" disabled=\"\">",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": undefined
  },
  {
    "id": "live-iss-63",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Name",
    "title": "This checkboxinput element does not have a name available to an accessibility API. Vali…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This checkboxinput element does not have a name available to an accessibility API. Valid names are: label element, title , aria-label , aria-labelledby .",
    "selector": "#cookies-functional",
    "context": "<input type=\"checkbox\" class=\"cookiebanner__checkbox\" id=\"cookies-functional\" name=\"cookies-functional\" value=\"cookies-functional\">",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": undefined
  },
  {
    "id": "live-iss-64",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "F68",
    "title": "This form field should be labelled in some way. Use the label element (either with a \"f…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This form field should be labelled in some way. Use the label element (either with a \"for\" attribute or wrapped around the form field), or \"title\", \"aria-label\" or \"aria-labelledby\" attributes as appropriate.",
    "selector": "#cookies-functional",
    "context": "<input type=\"checkbox\" class=\"cookiebanner__checkbox\" id=\"cookies-functional\" name=\"cookies-functional\" value=\"cookies-functional\">",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": undefined
  },
  {
    "id": "live-iss-65",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Name",
    "title": "This checkboxinput element does not have a name available to an accessibility API. Vali…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This checkboxinput element does not have a name available to an accessibility API. Valid names are: label element, title , aria-label , aria-labelledby .",
    "selector": "#cookies-analysis",
    "context": "<input type=\"checkbox\" class=\"cookiebanner__checkbox\" id=\"cookies-analysis\" name=\"cookies-analysis\" value=\"cookies-analysis\">",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": undefined
  },
  {
    "id": "live-iss-66",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "F68",
    "title": "This form field should be labelled in some way. Use the label element (either with a \"f…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This form field should be labelled in some way. Use the label element (either with a \"for\" attribute or wrapped around the form field), or \"title\", \"aria-label\" or \"aria-labelledby\" attributes as appropriate.",
    "selector": "#cookies-analysis",
    "context": "<input type=\"checkbox\" class=\"cookiebanner__checkbox\" id=\"cookies-analysis\" name=\"cookies-analysis\" value=\"cookies-analysis\">",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": undefined
  },
  {
    "id": "live-iss-67",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Name",
    "title": "This checkboxinput element does not have a name available to an accessibility API. Vali…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This checkboxinput element does not have a name available to an accessibility API. Valid names are: label element, title , aria-label , aria-labelledby .",
    "selector": "#cookies-marketing",
    "context": "<input type=\"checkbox\" class=\"cookiebanner__checkbox\" id=\"cookies-marketing\" name=\"cookies-marketing\" value=\"cookies-marketing\">",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": undefined
  },
  {
    "id": "live-iss-68",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "F68",
    "title": "This form field should be labelled in some way. Use the label element (either with a \"f…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This form field should be labelled in some way. Use the label element (either with a \"for\" attribute or wrapped around the form field), or \"title\", \"aria-label\" or \"aria-labelledby\" attributes as appropriate.",
    "selector": "#cookies-marketing",
    "context": "<input type=\"checkbox\" class=\"cookiebanner__checkbox\" id=\"cookies-marketing\" name=\"cookies-marketing\" value=\"cookies-marketing\">",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": undefined
  },
  {
    "id": "live-iss-69",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Name",
    "title": "This button element does not have a name available to an accessibility API. Valid names…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This button element does not have a name available to an accessibility API. Valid names are: title , element content, aria-label , aria-labelledby .",
    "selector": "html > body > header > nav > div:nth-child(2) > button",
    "context": "<button type=\"button\" class=\"navigation__toggle\">\n\t\t\t<span class=\"iconbar\"></spa...</button>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": undefined
  },
  {
    "id": "live-iss-71",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Name",
    "title": "This textinput element does not have a name available to an accessibility API. Valid na…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This textinput element does not have a name available to an accessibility API. Valid names are: label element, title , aria-label , aria-labelledby .",
    "selector": "#searchForm > div > input",
    "context": "<input type=\"text\" value=\"\" class=\"searchform__control form-control\" name=\"tx_solr[q]\" placeholder=\"Suche\">",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": undefined
  },
  {
    "id": "live-iss-72",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "F68",
    "title": "This form field should be labelled in some way. Use the label element (either with a \"f…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This form field should be labelled in some way. Use the label element (either with a \"for\" attribute or wrapped around the form field), or \"title\", \"aria-label\" or \"aria-labelledby\" attributes as appropriate.",
    "selector": "#searchForm > div > input",
    "context": "<input type=\"text\" value=\"\" class=\"searchform__control form-control\" name=\"tx_solr[q]\" placeholder=\"Suche\">",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": undefined
  },
  {
    "id": "live-iss-73",
    "scanId": "scan-single-1",
    "severity": "serious",
    "ruleId": "Name",
    "title": "This button element does not have a name available to an accessibility API. Valid names…",
    "section": "accessibility",
    "affectedCount": 1,
    "detail": "This button element does not have a name available to an accessibility API. Valid names are: title , element content, aria-label , aria-labelledby .",
    "selector": "#searchForm > div > div > button",
    "context": "<button class=\"searchform__button btn-link\" type=\"submit\">\n\t\t\t\t\t\t\t<span class=\"t3js-icon ...</button>",
    "runner": "htmlcs",
    "wcagLevel": "AA",
    "helpUrl": "https://www.w3.org/WAI/WCAG21/quickref/",
    "boundingBox": undefined
  }
]

export const LIVE_PASSED_CHECKS: PassedCheck[] = [
  {
    "id": "aria-allowed-attr",
    "description": "Ensure an element's role supports its ARIA attributes",
    "help": "Elements must only use supported ARIA attributes"
  },
  {
    "id": "aria-conditional-attr",
    "description": "Ensure ARIA attributes are used as described in the specification of the element's role",
    "help": "ARIA attributes must be used as specified for the element's role"
  },
  {
    "id": "aria-deprecated-role",
    "description": "Ensure elements do not use deprecated roles",
    "help": "Deprecated ARIA roles must not be used"
  },
  {
    "id": "aria-hidden-body",
    "description": "Ensure aria-hidden=\"true\" is not present on the document body.",
    "help": "aria-hidden=\"true\" must not be present on the document body"
  },
  {
    "id": "aria-hidden-focus",
    "description": "Ensure aria-hidden elements are not focusable nor contain focusable elements",
    "help": "ARIA hidden element must not be focusable or contain focusable elements"
  },
  {
    "id": "aria-prohibited-attr",
    "description": "Ensure ARIA attributes are not prohibited for an element's role",
    "help": "Elements must only use permitted ARIA attributes"
  },
  {
    "id": "aria-required-attr",
    "description": "Ensure elements with ARIA roles have all required ARIA attributes",
    "help": "Required ARIA attributes must be provided"
  },
  {
    "id": "aria-required-children",
    "description": "Ensure elements with an ARIA role that require child roles contain them",
    "help": "Certain ARIA roles must contain particular children"
  },
  {
    "id": "aria-required-parent",
    "description": "Ensure elements with an ARIA role that require parent roles are contained by them",
    "help": "Certain ARIA roles must be contained by particular parents"
  },
  {
    "id": "aria-roles",
    "description": "Ensure all elements with a role attribute use a valid value",
    "help": "ARIA roles used must conform to valid values"
  },
  {
    "id": "aria-tab-name",
    "description": "Ensure every ARIA tab node has an accessible name",
    "help": "ARIA tab nodes must have an accessible name"
  },
  {
    "id": "aria-valid-attr-value",
    "description": "Ensure all ARIA attributes have valid values",
    "help": "ARIA attributes must conform to valid values"
  }
]

export const LIVE_OVERVIEW_ENRICHMENT: Omit<ScanOverview, 'scan' | 'scores' | 'topIssues'> & { lede: string } = {
  "lede": "Live single-page scan of https://www.durr-consulting.com/de/kompetenzen/industrialisierung/automotive-brownfield-integration — 104 accessibility findings, overall 49/100 (accessibility 0, UX 10).",
  "performance": {
    "ttfb": 3645,
    "fcp": 3924,
    "lcp": 4060,
    "domLoad": 3974,
    "windowLoad": 4039,
    "inp": undefined,
    "nextHopProtocol": "h2",
    "scriptTransferKb": 42
  },
  "seo": {
    "title": "Automotive Brownfield Integration - DÜRR Consulting",
    "titleLength": 51,
    "metaDescription": "Dürr is one of the world's leading mechanical and plant engineering firms with outstanding automation expertise. Products, systems and services offered by Dürr enable highly efficient manufacturing processes in different industries. Business with automobile manufacturers and their suppliers accounts for approximately 55% of Dürr's sales. Other market segments include, for example, the mechanical engineering, chemical and pharmaceutical industries and the woodworking industry.",
    "metaDescriptionLength": 480,
    "h1": "Automotive Brownfield Integration",
    "canonical": "https://www.durr-consulting.com/de/kompetenzen/industrialisierung/automotive-brownfield-integration",
    "robots": null,
    "wordCount": 702,
    "hasOpenGraph": false,
    "hasJsonLd": true,
    "skinnyContent": false,
    "ogTitle": undefined,
    "ogDescription": undefined,
    "ogImage": undefined,
    "twitterCard": "summary",
    "robotsTxtPresent": true,
    "sitemapUrl": undefined,
    "duplicateContentWarning": false,
    "topKeywords": [
      "brownfield",
      "integration",
      "consulting",
      "sop",
      "bestehende",
      "fahrzeugarchitekturen"
    ]
  },
  "eco": {
    "co2": 0.082,
    "grade": "A+",
    "pageWeightKb": 322,
    "greenWebHosted": undefined
  },
  "ux": {
    "score": 10,
    "cls": 0.001,
    "readabilityGrade": "Very Complex (Academic)",
    "readabilityScore": 20,
    "mobileFriendly": false,
    "brokenLinkCount": 23,
    "tapTargetIssueCount": 21,
    "hasSkipLink": false,
    "headingH1Count": 1,
    "skippedHeadingLevels": false,
    "skipLinkHref": undefined,
    "dwellSecondsMedian": 288,
    "dwellConfidence": "high",
    "resourceHintPreloadCount": 0,
    "resourceHintPreconnectCount": 0,
    "reducedMotionInCss": false,
    "focusVisibleFailCount": 52,
    "formMissingAutocomplete": 6,
    "imageMissingDimensions": 0,
    "imageMissingLazy": 0,
    "imageMissingSrcset": 9,
    "metaRefreshPresent": false,
    "videosWithoutCaptions": 0,
    "audiosWithoutTranscript": 0
  },
  "links": {
    "internal": 20,
    "external": 13,
    "broken": 23,
    "missingNoopener": 13,
    "total": 33,
    "brokenSamples": [
      {
        "url": "https://www.durr-consulting.com/de/impressum",
        "text": "Impressum",
        "status": undefined
      },
      {
        "url": "https://www.durr-consulting.com/de/kompetenzen/industrialisierung/automotive-brownfield-integration#",
        "text": "consulting@durr.com",
        "status": undefined
      },
      {
        "url": "https://www.durr-consulting.com/de/",
        "text": "durr-consulting.com",
        "status": undefined
      },
      {
        "url": "https://www.durr-consulting.com/de/unternehmen",
        "text": "Unternehmen",
        "status": undefined
      }
    ],
    "noopenerSamples": [
      {
        "url": "https://www.durr.com/de/datenschutz#cookiepolicy",
        "text": "Datenschutzerklärung",
        "status": undefined
      },
      {
        "url": "https://www.durr.com/de/datenschutz",
        "text": "Datenschutz",
        "status": undefined
      },
      {
        "url": "https://www.durr.com/de/media/news",
        "text": "News",
        "status": undefined
      },
      {
        "url": "https://reframed.durr.com/de/",
        "text": "REFRAMED",
        "status": undefined
      }
    ]
  },
  "securityPrivacy": {
    "https": true,
    "hsts": true,
    "csp": false,
    "hasPrivacyPolicy": true,
    "hasCookieBanner": true,
    "mixedContent": false,
    "xFrameOptions": false,
    "xContentTypeOptions": true,
    "referrerPolicy": false,
    "permissionsPolicy": true,
    "sriMissingCount": 10,
    "cookieWarningCount": 0,
    "privacyPolicyUrl": "https://www.durr.com/de/datenschutz#cookiepolicy",
    "hasTermsOfService": false,
    "cmpHints": []
  },
  "freshness": {
    "ageDays": null,
    "confidence": "low",
    "source": null,
    "bestAsOfIso": undefined,
    "sources": undefined
  },
  "generative": {
    "score": 54,
    "discoverability": 77,
    "repurposing": 30,
    "hasLlmsTxt": false,
    "hasFaqSchema": false,
    "hasHowToSchema": false,
    "hasBreadcrumb": true,
    "hasOrganizationTrust": true,
    "schemaCoverage": [
      "BreadcrumbList",
      "Organization"
    ],
    "faqEntityCount": 0,
    "isYmyl": false,
    "ymylConfidence": "low"
  },
  "infra": {
    "serverIp": "185.85.1.35",
    "city": "Munich",
    "country": "DE",
    "cdnProvider": "myracloud",
    "htmlLang": "de",
    "hreflangCount": 3,
    "platforms": [
      "TYPO3"
    ],
    "tracking": [],
    "hostingServer": "myracloud",
    "hostingPoweredBy": undefined
  },
  "classification": {
    "shortSummary": "DÜRR Consulting offers specialized expertise in integrating new vehicle architectures into existing automotive production facilities while managing ongoing operations, space constraints, and timelines.",
    "tags": [
      "Automotive brownfield integration",
      "New vehicle architecture implementation",
      "Existing production facility modernization",
      "Manufacturing process optimization",
      "Production ramp-up and SOP timing",
      "Consulting services for automotive OEMs",
      "Integration of IT/OT systems in factories",
      "Space and layout constraints management"
    ],
    "intensityTier": 5,
    "tagTiers": [
      {
        "tag": "Automotive brownfield integration",
        "tier": 5
      },
      {
        "tag": "New vehicle architecture implementation",
        "tier": 5
      },
      {
        "tag": "Existing production facility modernization",
        "tier": 5
      },
      {
        "tag": "Manufacturing process optimization",
        "tier": 5
      },
      {
        "tag": "Production ramp-up and SOP timing",
        "tier": 5
      },
      {
        "tag": "Consulting services for automotive OEMs",
        "tier": 4
      },
      {
        "tag": "Integration of IT/OT systems in factories",
        "tier": 4
      },
      {
        "tag": "Space and layout constraints management",
        "tier": 4
      },
      {
        "tag": "Production flexibility and resilience",
        "tier": 4
      },
      {
        "tag": "Risk mitigation in factory transitions",
        "tier": 4
      },
      {
        "tag": "Supply chain and supplier collaboration",
        "tier": 3
      },
      {
        "tag": "Cost efficiency in brownfield projects",
        "tier": 3
      }
    ]
  },
  "screenshotUrl": "/fixtures/scans/scan-single-1.jpg",
  "visualLayers": {
    "saliencyHeatmapUrl": "/fixtures/scans/scan-single-1-heatmap.svg",
    "regions": [
      {
        "id": "20a0e578-7e09-4b44-aa90-ae9ed7e3ef11",
        "label": "Automotive Brownfield Integration",
        "x": 384.0,
        "y": 882.0,
        "width": 1152.0,
        "height": 53.0,
        "saliencyProminence": 0.49
      },
      {
        "id": "07bcbecc-b473-4b53-869b-a9439510cdf4",
        "label": "Neue Fahrzeugarchitekturen terminsicher, s",
        "x": 384.0,
        "y": 970.0,
        "width": 1152.0,
        "height": 84.0,
        "saliencyProminence": 0.42
      },
      {
        "id": "f3ad8c1e-eabd-4d22-8b9e-2f64fe942e96",
        "label": "<div class=\"alertbox alertbox--warning ale",
        "x": 0.0,
        "y": 0.0,
        "width": 1920.0,
        "height": 152.0,
        "saliencyProminence": 0.38
      },
      {
        "id": "99e8fdbc-62bc-4177-9e7a-0f1066bf4c9d",
        "label": "Dürr - Leading in Production EfficiencyDür",
        "x": 372.0,
        "y": 0.0,
        "width": 1176.0,
        "height": 152.0,
        "saliencyProminence": 0.37
      },
      {
        "id": "06eca36a-bd12-4494-b2e4-b0d21979e5ae",
        "label": "Automotive Brownfield Integration",
        "x": 384.0,
        "y": 882.0,
        "width": 1152.0,
        "height": 53.0,
        "saliencyProminence": 0.37
      },
      {
        "id": "bf2d1744-32e9-44d1-9be6-a546700686f3",
        "label": "Neue Fahrzeugarchitekturen terminsicher, s",
        "x": 384.0,
        "y": 970.0,
        "width": 1152.0,
        "height": 84.0,
        "saliencyProminence": 0.36
      },
      {
        "id": "2bec3aea-eac4-46d9-9b3b-47fd686a0d8c",
        "label": "Unser Fokus:",
        "x": 384.0,
        "y": 1883.0,
        "width": 564.0,
        "height": 33.0,
        "saliencyProminence": 0.22
      },
      {
        "id": "abc8cdf5-087f-486d-8528-054fe5838736",
        "label": "Unser Fokus:",
        "x": 384.0,
        "y": 1883.0,
        "width": 564.0,
        "height": 33.0,
        "saliencyProminence": 0.22
      },
      {
        "id": "d333d8c0-658a-46ac-a172-f3bc771da4b9",
        "label": "Unser Ansatz:",
        "x": 972.0,
        "y": 1883.0,
        "width": 564.0,
        "height": 33.0,
        "saliencyProminence": 0.22
      },
      {
        "id": "ddeb743e-7458-4ac9-bb39-41e4c06a7541",
        "label": "Unser Ansatz:",
        "x": 972.0,
        "y": 1883.0,
        "width": 564.0,
        "height": 33.0,
        "saliencyProminence": 0.21
      },
      {
        "id": "36b36ce6-eb52-47ce-85d7-602c92f831db",
        "label": "Unsere Leistungen:",
        "x": 384.0,
        "y": 2277.0,
        "width": 1152.0,
        "height": 33.0,
        "saliencyProminence": 0.21
      },
      {
        "id": "0743fb29-504b-44f5-87ae-e77c82781fee",
        "label": "Unsere Leistungen:",
        "x": 384.0,
        "y": 2277.0,
        "width": 1152.0,
        "height": 33.0,
        "saliencyProminence": 0.21
      },
      {
        "id": "3b168ff0-99ef-4f5a-b6ba-d76db8f3b4d4",
        "label": "Fragen an das Consulting Team:",
        "x": 384.0,
        "y": 3243.0,
        "width": 1152.0,
        "height": 33.0,
        "saliencyProminence": 0.19
      },
      {
        "id": "659a4cbf-7523-4a0f-809b-e545c60c5cbb",
        "label": "Fragen an das Consulting Team:",
        "x": 384.0,
        "y": 3243.0,
        "width": 1152.0,
        "height": 33.0,
        "saliencyProminence": 0.19
      }
    ],
    "scanpath": [
      {
        "x": 960.0,
        "y": 908.5
      },
      {
        "x": 960.0,
        "y": 1012.0
      },
      {
        "x": 960.0,
        "y": 76.0
      },
      {
        "x": 960.0,
        "y": 76.0
      },
      {
        "x": 960.0,
        "y": 908.5
      },
      {
        "x": 960.0,
        "y": 1012.0
      }
    ]
  }
}

export const LIVE_OVERALL_SCORE = 49
export const LIVE_A11Y_SCORE = 0
