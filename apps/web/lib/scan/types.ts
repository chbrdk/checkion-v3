/* ------------------------------------------------------------------ */
/*  CHECKION – Core types                                             */
/* ------------------------------------------------------------------ */

import type { UxCheckV2Summary } from '@/lib/scan/ux-check-types';

export type WcagStandard = 'WCAG2A' | 'WCAG2AA' | 'WCAG2AAA';
export type IssueSeverity = 'error' | 'warning' | 'notice';
export type Runner = 'axe' | 'htmlcs';
export type Device = 'desktop' | 'tablet' | 'mobile';

/** Phases emitted per device from {@link runScan} (NDJSON / UI). */
export const SCAN_DEVICE_PHASES = [
    'starting',
    'browser_ready',
    'navigate',
    'wcag_checks',
    'scroll_and_layout',
    'screenshot',
    'issue_details',
    'ux_and_content',
    'page_classification',
] as const;

export type ScanDevicePhase = (typeof SCAN_DEVICE_PHASES)[number];

export interface Issue {
    /** WCAG criterion code, e.g. "WCAG2AA.Principle1.Guideline1_1.1_1_1.H37" */
    code: string;
    type: IssueSeverity;
    message: string;
    /** HTML snippet around the offending element */
    context: string;
    /** CSS selector that targets the element */
    selector: string;
    /** Which runner found this issue */
    runner: Runner;
    /** WCAG Level (A, AA, AAA) or Unknown */
    wcagLevel: 'A' | 'AA' | 'AAA' | 'APCA' | 'Unknown';
    /** Optional URL to remediation docs (Deque/W3C) */
    helpUrl?: string | null;
    boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export interface ScanStats {
    errors: number;
    warnings: number;
    notices: number;
    total: number;
}

export interface Pass {
    id: string;
    description: string;
    help: string;
    nodes: Array<{
        html: string;
        target: string[];
        failureSummary?: string;
    }>;
}

export interface FocusOrder {
    index: number;
    text: string;
    role: string;
    rect: { x: number; y: number; width: number; height: number };
}

export type DwellPageArchetype = 'thin' | 'content' | 'interactive' | 'mixed';

/** Inputs for `estimateDwellTime` (crawl-derived). */
export interface DwellTimeEstimateInput {
    bodyWordCount: number;
    readabilityGradeLevel: number;
    brokenLinkCount: number;
    internalLinkCount: number;
    formFieldCount: number;
    videoCount: number;
    audioCount: number;
    scrollHeightOverVh: number;
    skinnyContent: boolean;
}

/** Heuristic time-on-page estimate from crawl metrics (not analytics). See `lib/estimate-dwell-time.ts`. */
export interface DwellTimeEstimate {
    model: 'dwell_v1';
    secondsMedian: number;
    secondsMin: number;
    secondsMax: number;
    confidence: 'low' | 'medium' | 'high';
    summaryDe: string;
    factors: {
        readingBaseSeconds: number;
        wordsPerMinuteUsed: number;
        interactionBonusSeconds: number;
        frictionPenaltySeconds: number;
        scrollBonusSeconds: number;
        archetype: DwellPageArchetype;
    };
}

export interface UxResult {
    score: number;
    cls: number;
    readability: {
        grade: string;
        score: number;
    };
    /** Optional: modelled dwell time — no real user sessions. */
    dwellEstimate?: DwellTimeEstimate | null;
    tapTargets: {
        issues: string[];
        details?: TouchTargetIssue[]; // Added details
    };
    viewport: {
        isMobileFriendly: boolean;
        issues: string[];
    };
    consoleErrors: Array<{
        type: 'error' | 'warning';
        text: string;
        location?: string;
    }>;
    brokenLinks: Array<{
        href: string;
        status: number;
        text: string;
    }>;
    focusOrder: FocusOrder[];
    structureMap?: StructureNode[];
    altTextIssues?: AltTextIssue[];
    ariaIssues?: AriaIssue[];
    formIssues?: FormIssue[];
    hasSkipLink?: boolean;
    skipLinkHref?: string | null;
    resourceHints?: { preload: string[]; preconnect: string[] };
    reducedMotionInCss?: boolean;
    focusVisibleFailCount?: number;
    mediaAccessibility?: {
        videosWithoutCaptions: number;
        audiosWithoutTranscript: number;
        /** `<video>` elements missing a captions/subtitles track. */
        videosMissingCaptionTrack?: number;
    };
    /** Long tasks observed after load (lab; browser-dependent). */
    longTasks?: { count: number; maxDurationMs: number };
    /** Form field heuristics beyond orphan inputs. */
    formAccessibility?: {
        missingAutocomplete: number;
        suspiciousInputType: number;
        ariaInvalidWithoutDescription: number;
    };
    headingHierarchy?: {
        hasSingleH1: boolean;
        h1Count: number;
        skippedLevels: Array<{ from: number; to: number }>;
        outline: Array<{ level: number; text: string }>;
    };
    vagueLinkTexts?: Array<{ href: string; text: string }>;
    imageIssues?: {
        missingDimensions: number;
        missingLazy: number;
        missingSrcset: number;
        details?: Array<{ reason: string; selector?: string }>;
    };
    iframeIssues?: Array<{ hasTitle: boolean; src?: string }>;
    metaRefreshPresent?: boolean;
    fontDisplayIssues?: { withoutFontDisplay: number; blockCount: number };
}

/** LLM-generated UX/CX summary (from POST /api/scan/[id]/summarize). */
export interface LlmSummary {
    summary: string;
    themes: Array<{ name: string; description?: string; severity?: 'high' | 'medium' | 'low' }>;
    recommendations: Array<{ title: string; description: string; priority: 1 | 2 | 3 | 4 | 5; category?: string }>;
    overallGrade?: string;
    modelUsed: string;
    generatedAt: string;
}

/** LLM-derived page topic and importance tier (content-based, not structure). */
/** One theme/tag with its content importance tier (1–5). */
export interface TagTier {
    tag: string;
    tier: 1 | 2 | 3 | 4 | 5;
}

/** LLM-derived page classification: themes/tags weighted by tier (at least 5 per tier). */
export interface PageClassification {
    /** Themes/tags with tier; at least 5 per tier (1–5). */
    tagTiers: TagTier[];
    shortSummary?: string;
}

/** Capped sample of pages that mention a theme (for navigation without loading full slim list). */
export interface AggregatedPageClassificationThemeRelatedPage {
    id: string;
    url: string;
}

/** One merged theme across the domain (from {@link aggregatePageClassification}). */
export interface AggregatedPageClassificationTheme {
    tag: string;
    /** Normalized merge key (trim, lower, spaces). Stable selection id for UI. Absent on older stored payloads. */
    themeTagKey?: string;
    /** Sum of tier² per occurrence, with boilerplate tags damped (×0.25). */
    score: number;
    pageCount: number;
    maxTier: 1 | 2 | 3 | 4 | 5;
    avgTier: number;
    /** Top pages mentioning this theme (by scan score); length capped in aggregation / light summary. */
    relatedPages?: AggregatedPageClassificationThemeRelatedPage[];
    /**
     * Like {@link AggregatedPageClassification.tierDistribution} but only pages where this theme appears;
     * denominators = count of those pages. Same tier counting rules as domain-wide rollup.
     */
    subsetAvgTagsPerPageByTier?: {
        tier1: number;
        tier2: number;
        tier3: number;
        tier4: number;
        tier5: number;
    };
}

export type AggregatedPageClassificationProfile = 'pillar' | 'hub' | 'utility' | 'mixed';

export interface AggregatedPageClassificationPageSample {
    url: string;
    profile: AggregatedPageClassificationProfile;
    tier5Count: number;
    lowTierCount: number;
}

/** Optional metadata when `topThemes` were filtered/reordered by the rollup-refinement LLM. */
export interface PageClassificationThemeRollupMeta {
    refinedWithLlm: boolean;
    model?: string;
    refinedAt?: string;
}

/** Domain-wide rollup of per-page `pageClassification.tagTiers`. */
export interface AggregatedPageClassification {
    coverage: {
        totalPages: number;
        pagesWithClassification: number;
    };
    topThemes: AggregatedPageClassificationTheme[];
    /** Present after optional Haiku pass on deep-scan persist. */
    themeRollup?: PageClassificationThemeRollupMeta;
    tierDistribution: {
        avgTagsPerPageByTier: {
            tier1: number;
            tier2: number;
            tier3: number;
            tier4: number;
            tier5: number;
        };
        pagesWithAtLeastOneTier5: number;
        pagesDominatedByLowTiers: number;
    };
    pageSamples: AggregatedPageClassificationPageSample[];
}

/**
 * Paginated single-scan list (GET /api/scan) — relational columns + stats only, no full `result` JSONB.
 * Use {@link ScanResult} for detail routes and search indexing.
 */
export type StandaloneScanSummary = {
    id: string;
    url: string;
    timestamp: string;
    score: number;
    stats: ScanStats;
    projectId: string | null;
    groupId: string | null;
    scanSessionId: string | null;
    device: Device;
    /** Normalized tags stored on the scan row (filters). */
    tags: string[];
    /** Tags from the linked project when `projectId` is set. */
    projectTags: string[];
    /** From linked project (list filters). */
    industry: string | null;
    /** Present when session row stores POST /api/scan `targetRegion`. */
    targetRegion?: string | null;
    viewports?: Device[]; // Optional: other devices in the same groupId (for standalone scans)
};

export type ScanResult = {
    id: string;
    groupId?: string; // Optional for ad-hoc scans
    url: string;
    timestamp: string;
    standard: WcagStandard;
    device: Device;
    runners: Runner[];
    issues: Issue[];
    /** Persisted document schema version; omit on legacy rows. */
    scanSchemaVersion?: number;
    passes: Pass[];
    stats: ScanStats;
    durationMs: number;
    score: number;
    screenshot: string;
    /** Optional attention/saliency heatmap (data URL or base64 PNG) from MDS-ViTNet. */
    saliencyHeatmap?: string;
    allLinks?: string[]; // Internal links found (raw)
    /** Internal links with visible text for semantic search / journey (same set as allLinks). */
    allLinksWithLabels?: Array<{ href: string; text: string }>;
    performance: {
        ttfb: number;
        fcp: number;
        domLoad: number;
        windowLoad: number;
        lcp: number;
        inp?: number | null;
        /** Navigation Timing `nextHopProtocol` when available (e.g. h2, h3). */
        nextHopProtocol?: string | null;
        /** Sum of Content-Length for script responses (approximate; 0 if unknown). */
        scriptTransferBytesApprox?: number;
    };
    eco: {
        co2: number;
        grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
        pageWeight: number;
        /** The Green Web Foundation (optional; requires API / env). */
        greenWebHosted?: boolean | null;
        greenWebCheckedAt?: string;
        greenWebSource?: string;
    };
    ux?: UxResult;
    seo?: SeoAudit;
    links?: LinkAudit;
    geo?: GeoAudit;
    privacy?: PrivacyAudit;
    /** Heuristic consent/CMP signals (separate from PrivacyAudit legal links). */
    consentSignals?: ConsentSignals;
    /** E-E-A-T page-level signals (for domain aggregation). */
    eeatSignals?: EeatPageSignals;
    generative?: GenerativeEngineAudit;
    security?: SecurityAudit;
    technicalInsights?: TechnicalInsights;
    /** Set when UX/CX summary has been generated (POST /summarize or POST /ux-check writes it). */
    llmSummary?: LlmSummary | UxCheckV2Summary | null;
    /** Page index: regions (what where), findability, optional semantic types (for persona click-path evaluation). */
    pageIndex?: PageIndex;
    /** Estimated scanpath (fixation order) from saliency + DOM heuristic; set when saliency heatmap and pageIndex exist. */
    scanpath?: ScanpathFixation[];
    /** Plain-text excerpt of the page body (for journey agent content evaluation). Capped at ~6k chars. */
    bodyTextExcerpt?: string;
    /** YMYL classification – stricter E-E-A-T for finance/health/legal. */
    ymyl?: YmylResult;
    /** LLM-derived: what the page is about (tags) and content intensity tier (1–5). */
    pageClassification?: PageClassification;
    /** Final document response headers (for deep-scan reuse via HEAD). */
    documentCacheHints?: { etag?: string; lastModified?: string };
    /** Combined HTTP + structured-data estimate of content recency vs scan time. */
    contentFreshness?: ContentFreshness;
    /** Set when this row was cloned from a prior scan (ETag/Last-Modified match). */
    reusedUnchanged?: boolean;
    /** SHA-256 slice of normalized title + h1 + body excerpt for diff when headers are absent. */
    contentFingerprint?: string;
};

/** Raw hints from the page (JSON-LD + Open Graph) before server-side scoring. */
export interface ContentFreshnessHints {
    jsonLdDatePublished?: string | null;
    jsonLdDateModified?: string | null;
    ogArticlePublishedTime?: string | null;
    ogArticleModifiedTime?: string | null;
    ogUpdatedTime?: string | null;
}

export type ContentFreshnessSource =
    | 'http_last_modified'
    | 'jsonld_date_modified'
    | 'jsonld_date_published'
    | 'og_article_modified_time'
    | 'og_updated_time'
    | 'og_article_published_time';

export type ContentFreshnessNoteCode = 'html_long_cache' | 'source_spread';

export interface ContentFreshnessSignalEntry {
    source: ContentFreshnessSource;
    /** Parsed instant in ISO 8601 (UTC where applicable). */
    valueIso: string;
    raw?: string;
}

export interface ContentFreshness {
    /** How much we trust the best-as-of instant. */
    confidence: 'high' | 'medium' | 'low' | 'unknown';
    /** Latest credible content timestamp we could derive (ISO). */
    bestAsOfIso: string | null;
    bestAsOfSource: ContentFreshnessSource | null;
    /** Days between scan and bestAsOf (non-negative); null if unknown. */
    ageDays: number | null;
    /** All usable dated signals (for transparency). */
    signals: ContentFreshnessSignalEntry[];
    notes?: ContentFreshnessNoteCode[];
}

export interface TechnicalInsights {
    thirdPartyDomains: string[];
    manifest: { present: boolean; hasName: boolean; hasIcons: boolean; url?: string };
    themeColor: string | null;
    appleTouchIcon: string | null;
    serviceWorkerRegistered?: boolean;
    redirectCount?: number;
    metaRefreshPresent?: boolean;
    /** Main HTML `Cache-Control` / `ETag` hints (lab snapshot). */
    mainDocumentCache?: {
        cacheControl: string | null;
        etagPresent: boolean;
        /** Heuristic: long max-age on HTML may be undesirable for freshness. */
        htmlLongCache?: boolean;
    };
    /** Heuristic: static JS/CSS assets with short/no cache (first N samples). */
    staticAssetCacheWeak?: boolean;
}

/** Single keyword with frequency and density (content analysis). */
export interface KeywordDensityItem {
    keyword: string;
    count: number;
    densityPercent: number;
}

/** For top keywords: whether they appear in critical SEO elements. */
export interface KeywordPresenceItem {
    keyword: string;
    inTitle: boolean;
    inH1: boolean;
    inMetaDescription: boolean;
}

export interface SeoKeywordAnalysis {
    totalWords: number;
    /** Top content keywords (stop words removed), sorted by count, max ~15. */
    topKeywords: KeywordDensityItem[];
    /** Presence of each top keyword in title, H1, meta description. */
    keywordPresence: KeywordPresenceItem[];
    /** Raw meta keywords if present (meta name="keywords"). */
    metaKeywordsRaw?: string | null;
}

export interface SeoAudit {
    title: string | null;
    metaDescription: string | null;
    h1: string | null;
    canonical: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    twitterCard: string | null;
    robotsTxtPresent?: boolean;
    sitemapUrl?: string | null;
    duplicateContentWarning?: boolean;
    skinnyContent?: boolean;
    bodyWordCount?: number;
    structuredDataRequiredFields?: Array<{ type: string; missing: string[] }>;
    /** Keyword extraction from body, density, and presence in title/H1/meta. */
    keywordAnalysis?: SeoKeywordAnalysis;
    /** VideoObject / Product JSON-LD missing recommended fields for rich results. */
    jsonLdRichResultGaps?: Array<{ schemaType: string; missing: string[] }>;
}

/** AI-recommended Schema.org types for GEO */
export const GEO_RECOMMENDED_SCHEMA_TYPES = [
    'Article',
    'FAQPage',
    'HowTo',
    'Organization',
    'Person',
    'WebPage',
    'NewsArticle',
    'WebSite',
] as const;

/** GEO dimension scores (0–100): findability vs. content reusability for AI/citations. */
export interface GenerativeGeoDimensions {
    discoverability: number;
    repurposing: number;
}

/** Raw signals for Auffindbarkeit (persisted for UI/PDF/tooltips). */
export interface GenerativeDiscoverabilitySignals {
    robotsTxtPresent?: boolean;
    sitemapUrlPresent?: boolean;
    jsonLdErrorCount?: number;
    llmsRobotsWarningCount?: number;
    recommendedSchemaCount?: number;
}

/** Raw signals for Wiederverwertbarkeit (chunking, schema depth, E-E-A-T content). */
export interface GenerativeRepurposingSignals {
    hasFaqPageSchema?: boolean;
    hasHowToSchema?: boolean;
    faqMainEntityCount?: number;
    howToStepCount?: number;
    hasBreadcrumbList?: boolean;
    organizationOrWebSiteWithTrust?: boolean;
    /** Organization/WebSite JSON-LD has sameAs or logo */
    hasSameAsOrLogo?: boolean;
    structuredDataGapCount?: number;
    jsonLdRichResultGapCount?: number;
    headingH2Count?: number;
    headingH3Count?: number;
    hasSingleH1?: boolean;
    /** Approximate share of body words inside <main> (0–1); undefined if no main */
    mainContentWordRatio?: number;
    definitionListPairCount?: number;
}

export interface GenerativeEngineAudit {
    score: number;
    /** Two-axis GEO model; omitted on legacy stored scans. */
    dimensions?: GenerativeGeoDimensions;
    discoverabilitySignals?: GenerativeDiscoverabilitySignals;
    repurposingSignals?: GenerativeRepurposingSignals;
    technical: {
        hasLlmsTxt: boolean;
        hasRobotsAllowingAI: boolean;
        schemaCoverage: string[];
        jsonLdErrors?: string[];
        /** Parsed llms.txt: which sections exist (e.g. Description, Rules, Allow, Block) */
        llmsTxtSections?: string[];
        /** True if llms.txt contains a Sitemap URL */
        llmsTxtHasSitemap?: boolean;
        /** Per-bot status from robots.txt */
        aiBotStatus?: Array<{ bot: string; status: 'allowed' | 'blocked' }>;
        /** Content of meta name="robots" (or first robots-like meta) */
        metaRobotsContent?: string | null;
        /** True if page is not noindex (indexable for crawlers) */
        metaRobotsIndexable?: boolean;
        /** Schema @types that are in the recommended AI list */
        recommendedSchemaTypesFound?: string[];
        /** Which recommended types are missing (subset of GEO_RECOMMENDED_SCHEMA_TYPES) */
        missingRecommendedSchemaTypes?: string[];
        /** Article/NewsArticle JSON-LD: at least one has these fields */
        articleSchemaQuality?: {
            hasDatePublished: boolean;
            hasDateModified: boolean;
            hasAuthor: boolean;
        };
        /** Parsed Rules: section content (truncated) */
        llmsTxtRulesContent?: string;
        /** Warnings when robots.txt and llms.txt contradict (e.g. robots blocks GPTBot, llms Allow) */
        llmsTxtRobotsConsistencyWarnings?: string[];
        /** Spec required: Title (H1) and Description (blockquote) present */
        llmsTxtSpecCompliant?: { hasTitle: boolean; hasDescription: boolean };
        /** Markdown URLs in llms.txt and their reachability (200 = ok) */
        llmsTxtMarkdownUrlsReachable?: Array<{ url: string; status: number }>;
    };
    content: {
        faqCount: number;
        tableCount: number;
        listDensity: number;
        citationDensity: number;
        /** Citations that have external links (blockquote+cite or link to http) */
        citationsWithLinks?: number;
    };
    expertise: {
        hasAuthorBio: boolean;
        hasExpertCitations: boolean;
    };
    /** Per-dimension factor list for tooltips (Auffindbarkeit / Wiederverwertbarkeit). */
    dimensionBreakdown?: {
        discoverability: Array<{ factor: string; points: number }>;
        repurposing: Array<{ factor: string; points: number }>;
    };
    /** Human-readable score breakdown for GEO tooltip (legacy + optional summary lines) */
    scoreBreakdown?: Array<{ factor: string; points: number }>;
}

export interface GeoAudit {
    serverIp: string | null;
    location: {
        city: string | null;
        country: string | null;
        countryCode?: string | null;
        continent: string | null;
        region?: string | null;
    } | null;
    cdn: {
        detected: boolean;
        provider: string | null;
    };
    languages: {
        htmlLang: string | null;
        hreflangs: Array<{ lang: string; href: string }>;
    };
    /** True if server country/region does not match target (when targetRegion provided) */
    targetRegionMismatch?: boolean;
    /** Optional target region (e.g. DE, EU) from scan params */
    targetRegion?: string | null;
    /** CMS / framework / shop signals (heuristic, from DOM + headers). */
    detectedPlatforms?: string[];
    /** Analytics, tags, CMPs detected from script URLs and inline snippets. */
    detectedTracking?: Array<{ id: string; name: string }>;
    /** Informative `Server` / `X-Powered-By` values when present. */
    hostingHints?: { server: string | null; poweredBy: string | null };
}

/** YMYL page classification – stricter E-E-A-T for finance/health/legal. */
export interface YmylResult {
    isYmyl: boolean;
    confidence: 'high' | 'medium' | 'low';
    signals: string[];
}

export interface PrivacyAudit {
    hasPrivacyPolicy: boolean;
    privacyPolicyUrl: string | null;
    hasCookieBanner: boolean;
    hasTermsOfService: boolean;
}

/** Heuristic consent / CMP signals (single scan); not legal advice. */
export interface ConsentSignals {
    tcfApiPresent?: boolean;
    /** CMP-related DOM hints matched (e.g. cookiebot, onetrust). */
    cmpDomHints?: string[];
    /** First N `dataLayer` entries stringified (truncated). */
    dataLayerPreview?: string[];
    /** True when inline or external gtag/gtm patterns detected. */
    inlineGtmOrGtagDetected?: boolean;
    /** Substrings suggesting Google Consent Mode v2-style config. */
    consentModeHints?: string[];
    /** Third-party script hosts seen early in navigation (capped). */
    earlyThirdPartyScriptHosts?: string[];
}

/** Per-page E-E-A-T signals (for domain-scan aggregation). */
export interface EeatPageSignals {
    hasImpressum: boolean;
    hasContact: boolean;
    hasAboutLink: boolean;
    hasTeamLink: boolean;
    hasCaseStudyMention: boolean;
}

/** Domain-level E-E-A-T aggregate (from deep scan). */
export interface EeatDomainAggregate {
    trust: {
        pagesWithImpressum: number;
        pagesWithContact: number;
        pagesWithPrivacy: number;
        totalPages: number;
    };
    experience: {
        pagesWithAbout: number;
        pagesWithTeam: number;
        pagesWithCaseStudyMention: number;
        totalPages: number;
    };
    expertise: {
        pagesWithAuthorBio: number;
        pagesWithArticleAuthor: number;
        avgCitationsPerPage: number;
        totalPages: number;
    };
    authoritativeness?: string;
}

export interface SecurityAudit {
    contentSecurityPolicy: { present: boolean; value?: string };
    xFrameOptions: { present: boolean; value?: string };
    xContentTypeOptions: { present: boolean; value?: string };
    strictTransportSecurity: { present: boolean; value?: string };
    referrerPolicy: { present: boolean; value?: string };
    permissionsPolicy?: { present: boolean; value?: string };
    crossOriginOpenerPolicy?: { present: boolean; value?: string };
    crossOriginEmbedderPolicy?: { present: boolean; value?: string };
    crossOriginResourcePolicy?: { present: boolean; value?: string };
    mixedContentUrls?: string[];
    sriMissing?: Array<{ tag: string; url: string }>;
    cookieWarnings?: Array<{ message: string }>;
}

export interface LinkAudit {
    broken: LinkResult[];
    total: number;
    internal: number;
    external: number;
    missingNoopener?: Array<{ url: string; text: string }>;
    pdfLinks?: Array<{ url: string; text: string }>;
}

export interface LinkResult {
    url: string;
    text: string;
    statusCode: number;
    message?: string;
    internal: boolean;
}

export type DomainScanStatus = 'queued' | 'scanning' | 'cancelling' | 'paused' | 'complete' | 'error' | 'cancelled';

/** POST /api/scan/domain/[id]/control body.action */
export type DomainScanControlAction = 'pause' | 'resume' | 'cancel';

/** Minimal page reference stored in domain scan payload (single scan id = link to /results/[id]). */
export interface SlimPage {
    id: string;
    /** When set, matches `domain_pages.id` (issues deep links use this key). */
    domainPageId?: string;
    url: string;
    score: number;
    stats: { errors: number; warnings: number; notices: number };
    ux?: { score: number };
    /** E-E-A-T on-page signals from deep scan (optional; present when stored with extended payload). */
    eeatSignals?: EeatPageSignals;
    /** Has privacy policy (from deep scan). */
    hasPrivacy?: boolean;
    /** LLM-derived page topic and tier (from classification). */
    pageClassification?: PageClassification;
}

/** Precomputed during deep scan; stored in domain_scans.payload. */
export type DomainAggregated = Record<string, unknown>;

/** Domain scan with full page results (e.g. for journey agent). Load from scans table when payload has slim pages. */
export type DomainScanResultWithFullPages = Omit<DomainScanResult, 'pages'> & { pages: ScanResult[] };

export type DomainScanResult = {
    id: string;
    domain: string;
    timestamp: string;
    status: DomainScanStatus;
    progress: {
        scanned: number;
        total: number;
        currentUrl?: string;
    };
    totalPages: number;
    score: number;
    /** Stored: SlimPage[] (id = scan id). Legacy payloads may have ScanResult[]; use payload.aggregated to detect. */
    pages: SlimPage[] | ScanResult[];
    /** Precomputed during deep scan; absent on legacy payloads. */
    aggregated?: DomainAggregated;
    graph: {
        nodes: Array<{
            id: string;
            url: string;
            score: number;
            /** URL path depth: 0 = home, 1 = /segment, 2 = /seg1/seg2, etc. */
            depth: number;
            status: 'ok' | 'error';
            /** Page title from document title (SEO) when available */
            title?: string | null;
        }>;
        links: Array<{
            source: string;
            target: string;
        }>;
    };
    systemicIssues: Array<{
        issueId: string;
        title: string;
        count: number;
        pages: string[];
    }>;
    /** E-E-A-T aggregate (from deep scan only). */
    eeat?: EeatDomainAggregate;
    error?: string;
    /** LLM-generated domain-wide UX/CX summary (from POST /api/scan/domain/[id]/summarize). */
    llmSummary?: LlmSummary | null;
    /** Options from scan start; preserved across payload merges for async classification jobs. */
    scanOptions?: {
        /** When false, skip AI fill of project industry + tags. Default: treat as true if omitted. */
        aiFillProjectMetadata?: boolean;
    };
};

/** Link with label for section/region assignment. */
export interface StructureLink {
    href: string;
    text: string;
}

export interface StructureNode {
    tag: string;
    text: string;
    level: number; // 1-6 headings, 0 landmarks, 7 button, 8 paragraph
    rect?: { x: number; y: number; width: number; height: number };
    /** Plain-text content of this section/region (for journey: attention zone content). */
    contentSnippet?: string;
    /** Links inside this section/region (for journey: which links belong to which zone). */
    links?: StructureLink[];
    children?: StructureNode[];
    error?: string; // e.g. "Skipped heading level"
}

/** Semantic type for a page region (heuristic from heading/label). */
export type PageIndexRegionType =
    | 'pricing'
    | 'faq'
    | 'contact'
    | 'hero'
    | 'product'
    | 'team'
    | 'about'
    | 'nav'
    | 'footer'
    | 'main'
    | 'aside'
    | 'unknown';

/** Single region in the page index: one landmark or heading from structureMap with findability and optional semantic label. */
export interface PageIndexRegion {
    id: string;
    tag: string;
    headingText: string;
    level: number;
    rect?: { x: number; y: number; width: number; height: number };
    indexInDocument: number;
    aboveFold: boolean;
    findabilityScore: number;
    /** Optional: mean saliency (0–1) in this region from heatmap; set when saliency heatmap is available. */
    saliencyProminence?: number;
    semanticType?: PageIndexRegionType;
    /** Plain-text content of this section (attention zone). */
    textSnippet?: string;
    /** Links inside this section/region (attention zone). */
    links?: StructureLink[];
}

/** Page index: what is where and how findable (for persona click-path evaluation). */
export interface PageIndex {
    url: string;
    viewportHeight: number;
    regions: PageIndexRegion[];
}

/** Single fixation in the estimated scanpath (gaze order from saliency + DOM heuristic). */
export interface ScanpathFixation {
    x: number;
    y: number;
    order: number;
    regionId?: string;
    saliency?: number;
}

/** One search result from GET /api/search (dashboard search). */
export type SearchMatchType = 'url' | 'region' | 'issue' | 'seo' | 'domain';

export interface SearchMatch {
    type: 'single' | 'domain';
    id: string;
    url: string;
    domain?: string;
    snippet: string;
    matchType: SearchMatchType;
    timestamp?: string;
    score?: number;
}

/** One step in a user journey (agent-chosen page + optional trigger and region findability). */
export interface JourneyStep {
    pageUrl: string;
    pageTitle?: string;
    /** Link text or region the user would click to get here. */
    triggerLabel?: string;
    /** Why the agent chose this link (e.g. from search_on_page reason). */
    navigationReason?: string;
    /** If the agent backtracked to this step, why it went back from the next page. */
    backtrackFromReason?: string;
    regionId?: string;
    /** Findability score of the matched region (0–1). Higher = easier to find. */
    regionFindability?: number;
    /** Whether the trigger region was above the fold. */
    regionAboveFold?: boolean;
    /** Semantic type of the region (e.g. nav, hero, main). */
    regionSemanticType?: string;
    index: number;
}

/** Result of the journey agent: path of pages and whether the goal was reached. */
export interface JourneyResult {
    steps: JourneyStep[];
    goalReached: boolean;
    message?: string;
}

/** One step from the UX Journey Agent (browser-based: action, selector, screenshot per step). */
export interface UxJourneyAgentStep {
    step: number;
    action: string;
    target?: string;
    selector?: string;
    reasoning?: string;
    /** Human-readable outcome for this step (e.g. "Navigated to ...", "Task completed: ..."). */
    result?: string;
    screenshot?: string;
    timestamp?: string;
}

/** Result of a UX Journey Agent run (Browser Use + Claude). */
export interface UxJourneyAgentResult {
    jobId: string;
    taskDescription: string;
    siteDomain: string;
    steps: UxJourneyAgentStep[];
    success: boolean;
    screenshots?: string[];
    /** If recording was enabled: path/URL to the journey video (use CHECKION proxy /api/scan/journey-agent/[jobId]/video). */
    videoUrl?: string;
}

/** E-E-A-T dimension scores from LLM (1–5) with reasoning. */
export interface EeatLlmScores {
    trust: { score: number; reasoning: string };
    experience: { score: number; reasoning: string };
    expertise: { score: number; reasoning: string };
    authoritativeness?: { score: number; reasoning: string };
}

/** One page result in GEO/E-E-A-T intensive analysis. */
export interface GeoEeatPageResult {
    url: string;
    title?: string;
    /** Technical signals from scan (generative, eeatSignals, seo, privacy, etc.). */
    technical?: {
        generative?: Partial<GenerativeEngineAudit>;
        eeatSignals?: EeatPageSignals;
        hasPrivacy?: boolean;
        hasImpressum?: boolean;
    };
    bodyTextExcerpt?: string;
    /** LLM-derived E-E-A-T scores (Stufe 2). */
    eeatScores?: EeatLlmScores;
    /** GEO fitness score 0–100 and reasoning (Stufe 3). */
    geoFitnessScore?: number;
    geoFitnessReasoning?: string;
    missingGeoElements?: string[];
}

/** One recommendation from LLM (Stufe 4). */
export interface GeoEeatRecommendation {
    priority: number;
    title: string;
    description: string;
    /** Affected URLs or "domain-wide". */
    affectedUrls?: string[];
    dimension?: 'trust' | 'experience' | 'expertise' | 'authoritativeness' | 'geo';
}

/** Citation of a domain in an LLM response for one query. */
export interface CompetitiveCitation {
    domain: string;
    position: number;
    context?: string;
}

/** One query run: provider + extracted citations. */
export interface CompetitiveCitationRun {
    queryId: string;
    query: string;
    provider: string;
    citations: CompetitiveCitation[];
    /** Natural language LLM answer (prose). */
    answerText?: string;
    rawAnswerExcerpt?: string;
}

/** Per-domain metrics for competitive benchmark. */
export interface CompetitiveMetrics {
    domain: string;
    shareOfVoice: number;
    avgPosition: number;
    queryCount: number;
    mentionCount: number;
}

/** Competitive benchmark block inside GeoEeatIntensiveResult. */
export interface CompetitiveBenchmarkResult {
    queries: string[];
    competitors: string[];
    runs: CompetitiveCitationRun[];
    metrics: CompetitiveMetrics[];
}

/** Full result of a GEO/E-E-A-T intensive run (Stufen 1–4 + optional Competitive). */
export interface GeoEeatIntensiveResult {
    pages: GeoEeatPageResult[];
    recommendations: GeoEeatRecommendation[];
    aggregated?: Record<string, unknown>;
    /** Single-model competitive result (legacy). */
    competitive?: CompetitiveBenchmarkResult;
    /** Per-model competitive benchmark (gpt-5.4-nano, gpt-5.4-mini, gpt-5.5, Claude, Gemini, …). */
    competitiveByModel?: Record<string, CompetitiveBenchmarkResult>;
    error?: string;
    /** True when this job skipped on-page GEO/E-E-A-T and only ran the competitive LLM benchmark. */
    competitiveOnly?: boolean;
    /** Normalized hostname/domain checked (competitive-only runs). */
    companyHost?: string;
}

export interface TouchTargetIssue {
    selector: string;
    element: string;
    text?: string;
    rect: { x: number; y: number; width: number; height: number };
    size: { width: number; height: number };
    message: string;
}

export interface AltTextIssue {
    imgHtml: string;
    alt: string;
    rect: { x: number; y: number; width: number; height: number };
    reason: string; // "Filename", "Too short", "Redundant"
}

export interface AriaIssue {
    element: string;
    attribute: string; // aria-labelledby, for, etc.
    value: string;
    rect: { x: number; y: number; width: number; height: number };
    message: string;
}

export interface FormIssue {
    element: string;
    rect: { x: number; y: number; width: number; height: number };
    message: string; // "Missing label", "Duplicate ID"
}

export interface ScanRequest {
    url: string;
    standard?: WcagStandard;
    device?: Device;
    runners?: Runner[];
}

export interface ScanOptions {
    url: string;
    /** Persist/result id; when set, screenshot is keyed under this id (DB scan id). */
    id?: string;
    standard?: WcagStandard;
    device?: Device;
    runners?: Runner[];
    /** Optional: single-page scan progress (e.g. NDJSON stream to the client). */
    onProgress?: (event: { phase: ScanDevicePhase; device: Device }) => void;
    /**
     * Reuse one Chromium for multi-viewport `POST /api/scan` (see `launchStandaloneScanBrowser` in `lib/scanner.ts`).
     * Avoids three parallel browser processes (OOM / “The client is closed” on small hosts).
     */
    sharedBrowser?: import('puppeteer').Browser;
}
