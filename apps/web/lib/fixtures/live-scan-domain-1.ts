import type {
  DomainOverview,
  DomainScanLight,
  IssueSummary,
  ScoreCard,
} from '@checkion-v3/contracts'

/** Live import from checkion.projects-a — Dürr AG deep (domain) scan.
 *  Source id: a25503c0-dd77-472d-b4c0-5c7da36e9f86
 *  Captured: 2026-07-31T00:29:48.824Z
 *  DomainOverview = corpus summary of all page scans (not ScanOverview).
 *  Do not put API tokens in this file.
 */

export const LIVE_DOMAIN_SOURCE_ID = "a25503c0-dd77-472d-b4c0-5c7da36e9f86"

export const LIVE_DOMAIN_SCAN: DomainScanLight = {
  id: "domain-1",
  projectId: "proj-demo-1",
  rootUrl: "https://www.durr.com",
  status: "completed",
  pageCount: 3317,
  overallScore: 43,
  issueCount: 23,
  startedAt: "2026-07-30T12:00:00.000Z",
  completedAt: "2026-07-31T00:29:48.824Z",
  industry: "manufacturing_industrial",
  tags: [
    "paint-application-technology",
    "automotive-manufacturing-solutions",
    "final-assembly-solutions",
    "dxq-digital-intelligence-platform",
    "paint-shop-application-technology",
    "paint-application-systems",
    "final-assembly-systems",
    "paint-supply-systems",
    "manufacturing-automation",
    "manufacturing-efficiency",
    "automotive-manufacturing",
    "manufacturing-process-optimization"
  ],
  issueStats: {
    errors: 339675,
    warnings: 0,
    notices: 0,
    total: 339675,
    passed: 0,
    byWcagLevel: {
      A: 16656,
      AA: 267170,
      AAA: 0
    }
  }
}

export const LIVE_DOMAIN_SCORES: ScoreCard[] = [
  {
    kind: "accessibility",
    label: "Accessibility",
    value: 0,
    max: 100
  },
  {
    kind: "seo",
    label: "SEO",
    value: 89,
    max: 100
  },
  {
    kind: "best_practices",
    label: "Best practices",
    value: 88,
    max: 100
  },
  {
    kind: "performance",
    label: "Performance",
    value: 100,
    max: 100
  },
  {
    kind: "ux",
    label: "UX lab",
    value: 43,
    max: 100
  },
  {
    kind: "eco",
    label: "Eco",
    value: 90,
    max: 100
  },
  {
    kind: "generative",
    label: "GEO",
    value: 51,
    max: 100
  }
]

export const LIVE_DOMAIN_ISSUES: IssueSummary[] = [
  {
    id: "live-d-iss-1",
    scanId: "domain-1",
    severity: "critical",
    ruleId: "link-name",
    title: "Links must have discernible text",
    section: "accessibility",
    affectedCount: 3105,
    detail: "Links must have discernible text (https://dequeuniversity.com/rules/axe/4.11/link-name?application=axeAPI)",
    runner: "axe",
    wcagLevel: "A",
    helpUrl: "https://dequeuniversity.com/rules/axe/4.10/link-name"
  },
  {
    id: "live-d-iss-2",
    scanId: "domain-1",
    severity: "critical",
    ruleId: "color-contrast",
    title: "Elements must meet minimum color contrast ratio thresholds",
    section: "accessibility",
    affectedCount: 3105,
    detail: "Elements must meet minimum color contrast ratio thresholds (https://dequeuniversity.com/rules/axe/4.11/color-contrast?application=axeAPI)",
    runner: "axe",
    wcagLevel: "AA",
    helpUrl: "https://dequeuniversity.com/rules/axe/4.10/color-contrast"
  },
  {
    id: "live-d-iss-3",
    scanId: "domain-1",
    severity: "critical",
    ruleId: "NoContent",
    title: "Anchor element found with a valid href attribute, but no link content has been supplied.",
    section: "accessibility",
    affectedCount: 3105,
    detail: "Anchor element found with a valid href attribute, but no link content has been supplied.",
    runner: "htmlcs",
    wcagLevel: "AA",
    helpUrl: "https://www.w3.org/WAI/WCAG21/quickref/"
  },
  {
    id: "live-d-iss-4",
    scanId: "domain-1",
    severity: "critical",
    ruleId: "listitem",
    title: "<li> elements must be contained in a <ul> or <ol>",
    section: "accessibility",
    affectedCount: 3105,
    detail: "<li> elements must be contained in a <ul> or <ol> (https://dequeuniversity.com/rules/axe/4.11/listitem?application=axeAPI)",
    runner: "htmlcs",
    wcagLevel: "Unknown",
    helpUrl: "https://www.w3.org/WAI/WCAG21/quickref/"
  },
  {
    id: "live-d-iss-5",
    scanId: "domain-1",
    severity: "critical",
    ruleId: "Fail",
    title: "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5…",
    section: "accessibility",
    affectedCount: 3102,
    detail: "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5:1, but text in this element has a contrast ratio of 2.76:1. Recommendation:  change text colour to #747682.",
    runner: "htmlcs",
    wcagLevel: "AA",
    helpUrl: "https://www.w3.org/WAI/WCAG21/quickref/"
  },
  {
    id: "live-d-iss-6",
    scanId: "domain-1",
    severity: "critical",
    ruleId: "tabindex",
    title: "Elements should not have tabindex greater than zero",
    section: "accessibility",
    affectedCount: 3102,
    detail: "Elements should not have tabindex greater than zero (https://dequeuniversity.com/rules/axe/4.11/tabindex?application=axeAPI)",
    runner: "htmlcs",
    wcagLevel: "Unknown",
    helpUrl: "https://www.w3.org/WAI/WCAG21/quickref/"
  },
  {
    id: "live-d-iss-7",
    scanId: "domain-1",
    severity: "critical",
    ruleId: "aria-required-children",
    title: "Certain ARIA roles must contain particular children",
    section: "accessibility",
    affectedCount: 3102,
    detail: "Certain ARIA roles must contain particular children (https://dequeuniversity.com/rules/axe/4.11/aria-required-children?application=axeAPI)",
    runner: "axe",
    wcagLevel: "A",
    helpUrl: "https://dequeuniversity.com/rules/axe/4.10/aria-required-children"
  },
  {
    id: "live-d-iss-8",
    scanId: "domain-1",
    severity: "critical",
    ruleId: "F68",
    title: "This form field should be labelled in some way. Use the label element (either with a \"for\" attribute or wra…",
    section: "accessibility",
    affectedCount: 3102,
    detail: "This form field should be labelled in some way. Use the label element (either with a \"for\" attribute or wrapped around the form field), or \"title\", \"aria-label\" or \"aria-labelledby\" attributes as appropriate.",
    runner: "htmlcs",
    wcagLevel: "AA",
    helpUrl: "https://www.w3.org/WAI/WCAG21/quickref/"
  },
  {
    id: "live-d-iss-9",
    scanId: "domain-1",
    severity: "critical",
    ruleId: "Name",
    title: "This button element does not have a name available to an accessibility API. Valid names are: title , elemen…",
    section: "accessibility",
    affectedCount: 3102,
    detail: "This button element does not have a name available to an accessibility API. Valid names are: title , element content, aria-label , aria-labelledby .",
    runner: "htmlcs",
    wcagLevel: "AA",
    helpUrl: "https://www.w3.org/WAI/WCAG21/quickref/"
  },
  {
    id: "live-d-iss-10",
    scanId: "domain-1",
    severity: "critical",
    ruleId: "Name",
    title: "This checkboxinput element does not have a name available to an accessibility API. Valid names are: label e…",
    section: "accessibility",
    affectedCount: 3102,
    detail: "This checkboxinput element does not have a name available to an accessibility API. Valid names are: label element, title , aria-label , aria-labelledby .",
    runner: "htmlcs",
    wcagLevel: "AA",
    helpUrl: "https://www.w3.org/WAI/WCAG21/quickref/"
  },
  {
    id: "live-d-iss-11",
    scanId: "domain-1",
    severity: "critical",
    ruleId: "Name",
    title: "This textinput element does not have a name available to an accessibility API. Valid names are: label eleme…",
    section: "accessibility",
    affectedCount: 3099,
    detail: "This textinput element does not have a name available to an accessibility API. Valid names are: label element, title , aria-label , aria-labelledby .",
    runner: "htmlcs",
    wcagLevel: "AA",
    helpUrl: "https://www.w3.org/WAI/WCAG21/quickref/"
  },
  {
    id: "live-d-iss-12",
    scanId: "domain-1",
    severity: "serious",
    ruleId: "video-caption",
    title: "<video> elements must have captions",
    section: "accessibility",
    affectedCount: 675,
    detail: "<video> elements must have captions (https://dequeuniversity.com/rules/axe/4.11/video-caption?application=axeAPI)",
    runner: "axe",
    wcagLevel: "A",
    helpUrl: "https://dequeuniversity.com/rules/axe/4.10/video-caption"
  },
  {
    id: "live-d-iss-13",
    scanId: "domain-1",
    severity: "serious",
    ruleId: "nested-interactive",
    title: "Interactive controls must not be nested",
    section: "accessibility",
    affectedCount: 345,
    detail: "Interactive controls must not be nested (https://dequeuniversity.com/rules/axe/4.11/nested-interactive?application=axeAPI)",
    runner: "axe",
    wcagLevel: "A",
    helpUrl: "https://dequeuniversity.com/rules/axe/4.10/nested-interactive"
  },
  {
    id: "live-d-iss-14",
    scanId: "domain-1",
    severity: "serious",
    ruleId: "aria-valid-attr-value",
    title: "ARIA attributes must conform to valid values",
    section: "accessibility",
    affectedCount: 229,
    detail: "ARIA attributes must conform to valid values (https://dequeuniversity.com/rules/axe/4.11/aria-valid-attr-value?application=axeAPI)",
    runner: "axe",
    wcagLevel: "A",
    helpUrl: "https://dequeuniversity.com/rules/axe/4.10/aria-valid-attr-value"
  },
  {
    id: "live-d-iss-15",
    scanId: "domain-1",
    severity: "serious",
    ruleId: "aria-hidden-focus",
    title: "ARIA hidden element must not be focusable or contain focusable elements",
    section: "accessibility",
    affectedCount: 220,
    detail: "ARIA hidden element must not be focusable or contain focusable elements (https://dequeuniversity.com/rules/axe/4.11/aria-hidden-focus?application=axeAPI)",
    runner: "axe",
    wcagLevel: "A",
    helpUrl: "https://dequeuniversity.com/rules/axe/4.10/aria-hidden-focus"
  },
  {
    id: "live-d-iss-16",
    scanId: "domain-1",
    severity: "serious",
    ruleId: "2",
    title: "The html element should have a lang or xml:lang attribute which describes the language of the document.",
    section: "accessibility",
    affectedCount: 212,
    detail: "The html element should have a lang or xml:lang attribute which describes the language of the document.",
    runner: "htmlcs",
    wcagLevel: "AA",
    helpUrl: "https://www.w3.org/WAI/WCAG21/quickref/"
  },
  {
    id: "live-d-iss-17",
    scanId: "domain-1",
    severity: "serious",
    ruleId: "html-has-lang",
    title: "<html> element must have a lang attribute",
    section: "accessibility",
    affectedCount: 212,
    detail: "<html> element must have a lang attribute (https://dequeuniversity.com/rules/axe/4.11/html-has-lang?application=axeAPI)",
    runner: "axe",
    wcagLevel: "A",
    helpUrl: "https://dequeuniversity.com/rules/axe/4.10/html-has-lang"
  },
  {
    id: "live-d-iss-18",
    scanId: "domain-1",
    severity: "serious",
    ruleId: "F92,ARIA4",
    title: "This element's role is \"presentation\" but contains child elements with semantic meaning.",
    section: "accessibility",
    affectedCount: 130,
    detail: "This element's role is \"presentation\" but contains child elements with semantic meaning.",
    runner: "htmlcs",
    wcagLevel: "AA",
    helpUrl: "https://www.w3.org/WAI/WCAG21/quickref/"
  },
  {
    id: "live-d-iss-19",
    scanId: "domain-1",
    severity: "serious",
    ruleId: "canonical-mismatch",
    title: "Canonical URL mismatches across pages",
    section: "seo",
    affectedCount: 678,
    detail: "Canonical URL mismatches across pages"
  },
  {
    id: "live-d-iss-20",
    scanId: "domain-1",
    severity: "moderate",
    ruleId: "duplicate-title",
    title: "Duplicate title groups across the crawl",
    section: "seo",
    affectedCount: 30,
    detail: "Duplicate title groups across the crawl"
  },
  {
    id: "live-d-iss-21",
    scanId: "domain-1",
    severity: "serious",
    ruleId: "hreflang-xdefault",
    title: "Hreflang x-default conflict across locales",
    section: "seo",
    affectedCount: 222,
    detail: "Hreflang x-default conflict across locales"
  },
  {
    id: "live-d-iss-22",
    scanId: "domain-1",
    severity: "moderate",
    ruleId: "missing-h1",
    title: "Pages missing H1",
    section: "seo",
    affectedCount: 5,
    detail: "Pages missing H1"
  },
  {
    id: "live-d-iss-23",
    scanId: "domain-1",
    severity: "moderate",
    ruleId: "heading-skipped",
    title: "Pages with skipped heading levels",
    section: "accessibility",
    affectedCount: 658,
    detail: "Pages with skipped heading levels"
  }
]

export const LIVE_DOMAIN_OVERVIEW: DomainOverview = {
  scan: {
    id: "domain-1",
    projectId: "proj-demo-1",
    rootUrl: "https://www.durr.com",
    status: "completed",
    pageCount: 3317,
    overallScore: 43,
    issueCount: 23,
    startedAt: "2026-07-30T12:00:00.000Z",
    completedAt: "2026-07-31T00:29:48.824Z",
    industry: "manufacturing_industrial",
    tags: [
      "paint-application-technology",
      "automotive-manufacturing-solutions",
      "final-assembly-solutions",
      "dxq-digital-intelligence-platform",
      "paint-shop-application-technology",
      "paint-application-systems",
      "final-assembly-systems",
      "paint-supply-systems",
      "manufacturing-automation",
      "manufacturing-efficiency",
      "automotive-manufacturing",
      "manufacturing-process-optimization"
    ],
    issueStats: {
      errors: 339675,
      warnings: 0,
      notices: 0,
      total: 339675,
      passed: 0,
      byWcagLevel: {
        A: 16656,
        AA: 267170,
        AAA: 0
      }
    }
  },
  scores: [
    {
      kind: "accessibility",
      label: "Accessibility",
      value: 0,
      max: 100
    },
    {
      kind: "seo",
      label: "SEO",
      value: 89,
      max: 100
    },
    {
      kind: "best_practices",
      label: "Best practices",
      value: 88,
      max: 100
    },
    {
      kind: "performance",
      label: "Performance",
      value: 100,
      max: 100
    },
    {
      kind: "ux",
      label: "UX lab",
      value: 43,
      max: 100
    },
    {
      kind: "eco",
      label: "Eco",
      value: 90,
      max: 100
    },
    {
      kind: "generative",
      label: "GEO",
      value: 51,
      max: 100
    }
  ],
  lede: "Live deep crawl of https://www.durr.com — 3317 pages scanned (cap 10000), overall 43/100. Corpus summary of every page scan: systemic a11y on ~3100 pages; GEO 51, UX 43.",
  systemicIssues: [
    {
      id: "link-name",
      title: "Links must have discernible text",
      pageCount: 3105,
      severity: "critical",
      ruleId: "link-name"
    },
    {
      id: "color-contrast",
      title: "Elements must meet minimum color contrast ratio thresholds",
      pageCount: 3105,
      severity: "critical",
      ruleId: "color-contrast"
    },
    {
      id: "NoContent",
      title: "Anchor element found with a valid href attribute, but no link content has been supplied.",
      pageCount: 3105,
      severity: "critical",
      ruleId: "NoContent"
    },
    {
      id: "listitem",
      title: "<li> elements must be contained in a <ul> or <ol>",
      pageCount: 3105,
      severity: "critical",
      ruleId: "listitem"
    },
    {
      id: "Fail",
      title: "This element has insufficient contrast at this conformance level. Expected a contrast ratio of at least 4.5…",
      pageCount: 3102,
      severity: "critical",
      ruleId: "Fail"
    },
    {
      id: "tabindex",
      title: "Elements should not have tabindex greater than zero",
      pageCount: 3102,
      severity: "critical",
      ruleId: "tabindex"
    },
    {
      id: "aria-required-children",
      title: "Certain ARIA roles must contain particular children",
      pageCount: 3102,
      severity: "critical",
      ruleId: "aria-required-children"
    },
    {
      id: "F68",
      title: "This form field should be labelled in some way. Use the label element (either with a \"for\" attribute or wra…",
      pageCount: 3102,
      severity: "critical",
      ruleId: "F68"
    },
    {
      id: "Name",
      title: "This button element does not have a name available to an accessibility API. Valid names are: title , elemen…",
      pageCount: 3102,
      severity: "critical",
      ruleId: "Name"
    },
    {
      id: "Name",
      title: "This checkboxinput element does not have a name available to an accessibility API. Valid names are: label e…",
      pageCount: 3102,
      severity: "critical",
      ruleId: "Name"
    },
    {
      id: "Name",
      title: "This textinput element does not have a name available to an accessibility API. Valid names are: label eleme…",
      pageCount: 3099,
      severity: "critical",
      ruleId: "Name"
    },
    {
      id: "video-caption",
      title: "<video> elements must have captions",
      pageCount: 675,
      severity: "serious",
      ruleId: "video-caption"
    }
  ],
  performance: {
    avgTtfb: 159,
    avgFcp: 324,
    avgLcp: 443,
    avgDomLoad: 392,
    pageCount: 3317,
    scriptTransferKbAvg: 53
  },
  seoCoverage: {
    totalPages: 3317,
    withTitle: 3231,
    withH1: 3040,
    withMetaDescription: 3105,
    withCanonical: 3097,
    withOgTitle: 5,
    withOgImage: 6,
    withTwitterCard: 3105,
    canonicalMismatchCount: 678,
    duplicateTitleGroupCount: 30,
    duplicateMetaGroupCount: 20,
    missingH1Count: 5,
    hreflangXDefaultConflict: true,
    hreflangDistinctTargets: 222,
    totalWordsAcrossPages: 1083002,
    topKeywords: [
      "dürr",
      "newsletter",
      "durr",
      "para",
      "con",
      "strong",
      "les",
      "del"
    ]
  },
  ux: {
    score: 43,
    cls: 0.003,
    readabilityGrade: "Standard (High School)",
    readabilityScore: 9.7,
    readabilityBands: {
      easy: 1096,
      standard: 371,
      complex: 886,
      veryComplex: 964
    },
    dwellSecondsMedian: 168,
    brokenLinkCount: 80,
    tapTargetIssueCount: 923,
    pagesWithMultipleH1: 29,
    pagesWithSkippedLevels: 658,
    pageCount: 3317
  },
  eco: {
    avgCo2: 6.02,
    grade: "A",
    avgPageWeightKb: 23569,
    gradeDistribution: {
      A: 1163,
      B: 558,
      C: 56,
      D: 30,
      E: 1,
      F: 715,
      "A+": 794
    },
    pageCount: 3317
  },
  links: {
    internal: 108677,
    external: 35389,
    broken: 80,
    missingNoopener: 0,
    total: 144066,
    brokenSamples: [
      {
        url: "https://www.durr.com/de/media/news",
        text: "News",
        status: 0
      },
      {
        url: "https://www.durr.com/de/service/lackieranlagen-applikationstechnik/ersatzteile",
        text: "Ersatzteile",
        status: 0
      },
      {
        url: "https://www.durr.com/de/media/news",
        text: "News",
        status: 0
      },
      {
        url: "https://www.durr.com/en/media/news",
        text: "News",
        status: 0
      },
      {
        url: "https://www.durr.com/de/media/news",
        text: "News",
        status: 0
      },
      {
        url: "https://www.durr.com/fr/presse/news",
        text: "News",
        status: 0
      }
    ]
  },
  securityPrivacy: {
    https: true,
    hsts: false,
    csp: true,
    hasPrivacyPolicy: true,
    hasCookieBanner: true,
    mixedContent: false,
    xFrameOptions: false,
    permissionsPolicy: true,
    privacyPolicyUrl: "https://www.durr.com/de",
    hasTermsOfService: true,
    cmpHints: [
      "dmndfrcstng.com",
      "mhjfbmdgcfjbbpaeojofohoefgiehjai",
      "resources",
      "static.matterport.com",
      "agv.future-painting.com"
    ]
  },
  eeat: {
    totalPages: 3317,
    trust: {
      pagesWithContact: 1981,
      pagesWithPrivacy: 1304,
      pagesWithImpressum: 1627
    },
    expertise: {
      pagesWithAuthorBio: 0,
      pagesWithArticleAuthor: 0,
      avgCitationsPerPage: 0.21103406692794693
    },
    experience: {
      pagesWithTeam: 49,
      pagesWithAbout: 1751,
      pagesWithCaseStudyMention: 10
    }
  },
  generative: {
    score: 51,
    discoverability: 76,
    repurposing: 24,
    withLlmsTxt: 0,
    withRobotsAllowingAi: 3317,
    pageCount: 3317,
    citationDensity: 0.21103406692794693
  },
  infra: {
    serverIp: "185.5.82.43",
    city: "Grünwald",
    country: "DE",
    cdnProvider: "myracloud",
    htmlLang: "de",
    hreflangCount: 222,
    platforms: [
      "TYPO3"
    ],
    tracking: [
      "dmndfrcstng.com",
      "mhjfbmdgcfjbbpaeojofohoefgiehjai",
      "resources"
    ],
    hostingServer: "myracloud",
    hostingPoweredBy: null
  },
  classification: {
    shortSummary: "Deep crawl of https://www.durr.com: 3317 pages in manufacturing_industrial. Avg citation density 0.21, list density 0.07. Dominant themes: Paint application technology, Automotive manufacturing solutions, Final assembly solutions.",
    tags: [
      "Paint application technology",
      "Automotive manufacturing solutions",
      "Final assembly solutions",
      "DXQ Digital Intelligence platform",
      "Paint shop application technology",
      "Paint application systems",
      "Final Assembly Systems",
      "Paint supply systems"
    ],
    intensityTier: 5,
    tagTiers: [
      {
        tag: "Paint application technology",
        tier: 4
      },
      {
        tag: "Automotive manufacturing solutions",
        tier: 4
      },
      {
        tag: "Final assembly solutions",
        tier: 4
      },
      {
        tag: "DXQ Digital Intelligence platform",
        tier: 3
      },
      {
        tag: "Paint shop application technology",
        tier: 4
      },
      {
        tag: "Paint application systems",
        tier: 4
      },
      {
        tag: "Final Assembly Systems",
        tier: 4
      },
      {
        tag: "Paint supply systems",
        tier: 4
      }
    ]
  },
  pageSamples: [
    {
      url: "https://www.durr.com/es/servicio/plantas-de-pintura-y-sistemas-de-aplicacion",
      score: 10,
      errors: null
    },
    {
      url: "https://www.durr.com/it/service/impianti-diverniciatura-e-tecnologie-di-applicazione",
      score: 10,
      errors: null
    },
    {
      url: "https://www.durr.com/jp/service/paint-shop-application-technology",
      score: 10,
      errors: null
    },
    {
      url: "https://www.durr.com/de/media/news/news-detail/view/duerr-gewinnt-mit-ecopaintjet-den-deutschen-innovationspreis-78813/",
      score: 10,
      errors: null
    },
    {
      url: "https://www.durr.com/de/unternehmen/events/events-detail/view/automotive-supply-forum-93850",
      score: 10,
      errors: null
    },
    {
      url: "https://www.durr.com/en/media/news",
      score: 10,
      errors: null
    },
    {
      url: "https://www.durr.com/fr/presse/news",
      score: 10,
      errors: null
    },
    {
      url: "https://www.durr.com/es/medios/noticias",
      score: 10,
      errors: null
    },
    {
      url: "https://www.durr.com/cn/",
      score: 0,
      errors: 161,
      warnings: 0
    },
    {
      url: "https://www.durr.com/cn/callback-form-dxq",
      score: 0,
      errors: 341,
      warnings: 0
    }
  ]
}

