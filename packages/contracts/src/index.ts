/** Stable domain contracts for CHECKION v3. */

export type ProjectStatus = 'active' | 'archived' | 'pending_sync'
export type CapabilitySyncStatus = 'in_sync' | 'pending' | 'error'
export type ScanMode = 'single' | 'deep'
export type ScanStatus =
  | 'queued'
  | 'running'
  | 'paused'
  | 'cancelling'
  | 'completed'
  | 'failed'
  | 'cancelled'

/** POST /api/domain-scans/:id/control body.action */
export type DomainScanControlAction = 'pause' | 'resume' | 'cancel'
export type IssueSeverity = 'critical' | 'serious' | 'moderate' | 'minor'
export type ScoreKind =
  | 'accessibility'
  | 'seo'
  | 'performance'
  | 'best_practices'
  | 'ux'
  | 'eco'
  | 'generative'
export type WcagLevel = 'A' | 'AA' | 'AAA' | 'APCA' | 'Unknown'
export type ScanDevice = 'desktop' | 'tablet' | 'mobile'
export type ScanRunner = 'axe' | 'htmlcs'

export interface ProjectSummary {
  id: string
  name: string
  domain: string
  status: ProjectStatus
  /** Plexon collection / platform project id */
  platformProjectId: string
  capabilityStatus: CapabilitySyncStatus
  lastScanAt: string | null
  scanCount: number
}

export interface ProjectDetail extends ProjectSummary {
  description: string
  recentScanIds: string[]
}

/** Create a local CHECKION project (Plexon collection mirror). */
export interface CreateProjectInput {
  name: string
  domain: string
  description?: string
  /** When omitted, a local `plx-local-…` id is generated (or Plexon origin assigns one). */
  platformProjectId?: string
  /** Optional Plexon owner for outbound origin registration. */
  ownerPlexonUserId?: string
  /** Optional Plexon company for outbound origin registration. */
  platformCompanyId?: string
}

/** Patch editable project fields. */
export interface UpdateProjectInput {
  name?: string
  domain?: string
  description?: string
}

/** System bucket for scans after their project was deleted. */
export const UNASSIGNED_PROJECT_ID = 'proj-unassigned' as const

export interface IssueStats {
  errors: number
  warnings: number
  notices: number
  total: number
  passed: number
  /** Optional WCAG level rollup from runners */
  byWcagLevel?: Partial<Record<'A' | 'AA' | 'AAA', number>>
}

export interface ScanSummary {
  id: string
  projectId: string
  mode: ScanMode
  url: string
  domainScanId?: string
  status: ScanStatus
  startedAt: string
  completedAt: string | null
  overallScore: number | null
  issueCount: number
  error?: string
  /** Multi-device session id (desktop/tablet/mobile) */
  groupId?: string | null
  device?: ScanDevice
  standard?: 'WCAG2A' | 'WCAG2AA' | 'WCAG2AAA'
  runners?: ScanRunner[]
  durationMs?: number | null
  issueStats?: IssueStats
  /** Plexon Collection id (AUDION → CHECKION single-scan correlation). */
  platformProjectId?: string | null
  /** AUDION Chat inspect job id or Studies wave run id. */
  audionRunId?: string | null
  /** Explored step URL when distinct from `url`. */
  stepUrl?: string | null
}

/** Optional correlation on POST /api/scans (AUDION journey handoff). */
export type ScanCorrelationInput = {
  platformProjectId?: string
  audionRunId?: string
  stepUrl?: string
}

export interface ScoreCard {
  kind: ScoreKind
  label: string
  value: number
  max: number
}

export interface IssueSummary {
  id: string
  scanId: string
  severity: IssueSeverity
  ruleId: string
  title: string
  section: 'accessibility' | 'seo' | 'content' | 'technical' | 'ux'
  affectedCount: number
  /** Magazine accordion body / remediation */
  detail?: string
  selector?: string
  /** HTML snippet around the offending element (v2 `context`) */
  context?: string
  runner?: ScanRunner
  wcagLevel?: WcagLevel
  helpUrl?: string | null
  boundingBox?: { x: number; y: number; width: number; height: number }
  /**
   * Optional explicit page URLs for this systemic group.
   * When absent, domain issue-page APIs may synthesize a paginated list from the crawl.
   */
  affectedPages?: string[]
}

/** Paginated pages that carry a systemic issue group. */
export interface IssueAffectedPageItem {
  url: string
  /** Single-page scan id — opens `/results/{scanId}`. */
  scanId: string
  /** Systemic issue groups present on this page (incl. the open group). */
  issueCount: number
  /** Subset of issueCount at critical severity. */
  criticalCount: number
}

export interface IssueAffectedPagesResult {
  issueId: string
  total: number
  page: number
  pageSize: number
  sort: 'issues-desc' | 'issues-asc'
  /** Inclusive lower bound on issueCount (0 = no floor). */
  minIssues: number
  /** Inclusive upper bound on issueCount; null = no ceiling. */
  maxIssues: number | null
  items: IssueAffectedPageItem[]
}

export interface PerformanceSnapshot {
  ttfb: number
  fcp: number
  lcp: number
  domLoad: number
  windowLoad: number
  inp?: number | null
  nextHopProtocol?: string | null
  scriptTransferKb?: number | null
}

export interface SeoSnapshot {
  title: string | null
  titleLength: number
  metaDescription: string | null
  metaDescriptionLength: number
  h1: string | null
  canonical: string | null
  robots: string | null
  wordCount: number
  hasOpenGraph: boolean
  hasJsonLd: boolean
  skinnyContent: boolean
  /** Open Graph / Twitter (v2 SeoAudit light) */
  ogTitle?: string | null
  ogDescription?: string | null
  ogImage?: string | null
  twitterCard?: string | null
  robotsTxtPresent?: boolean
  sitemapUrl?: string | null
  duplicateContentWarning?: boolean
  structuredDataGaps?: Array<{ type: string; missing: string[] }>
  topKeywords?: string[]
}

export interface EcoSnapshot {
  co2: number
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  pageWeightKb: number
  greenWebHosted?: boolean | null
  greenWebCheckedAt?: string | null
  greenWebSource?: string | null
  /** Derived “cleaner than X%” when available */
  cleanerThanPercent?: number | null
}

export interface UxSnapshot {
  score: number
  cls: number
  readabilityGrade: string
  readabilityScore: number
  mobileFriendly: boolean
  brokenLinkCount: number
  tapTargetIssueCount: number
  hasSkipLink: boolean
  headingH1Count: number
  skippedHeadingLevels: boolean
  skipLinkHref?: string | null
  dwellSecondsMedian?: number | null
  dwellConfidence?: 'low' | 'medium' | 'high' | null
  resourceHintPreloadCount?: number
  resourceHintPreconnectCount?: number
  reducedMotionInCss?: boolean
  focusVisibleFailCount?: number
  longTaskCount?: number
  longTaskMaxMs?: number
  formMissingAutocomplete?: number
  formSuspiciousInputType?: number
  videosWithoutCaptions?: number
  audiosWithoutTranscript?: number
  imageMissingDimensions?: number
  imageMissingLazy?: number
  imageMissingSrcset?: number
  metaRefreshPresent?: boolean
  fontDisplayIssueCount?: number
  /** Compact “2→4” skipped heading pairs */
  skippedHeadingPairs?: string[]
}

export interface LinkSample {
  url: string
  text?: string
  status?: number
}

export interface LinkSnapshot {
  internal: number
  external: number
  broken: number
  missingNoopener: number
  total?: number
  pdfLinkCount?: number
  brokenSamples?: LinkSample[]
  noopenerSamples?: LinkSample[]
}

export interface SecurityPrivacySnapshot {
  https: boolean
  hsts: boolean
  csp: boolean
  hasPrivacyPolicy: boolean
  hasCookieBanner: boolean
  mixedContent: boolean
  /** Header presence (v2 SecurityAudit light) */
  xFrameOptions?: boolean
  xContentTypeOptions?: boolean
  referrerPolicy?: boolean
  permissionsPolicy?: boolean
  mixedContentCount?: number
  sriMissingCount?: number
  cookieWarningCount?: number
  privacyPolicyUrl?: string | null
  hasTermsOfService?: boolean
  cmpHints?: string[]
}

export interface ContentFreshnessSnapshot {
  ageDays: number | null
  confidence: 'low' | 'medium' | 'high'
  source: string | null
  bestAsOfIso?: string | null
  sources?: string[]
}

export interface GenerativeSnapshot {
  score: number
  discoverability: number
  repurposing: number
  hasLlmsTxt: boolean
  hasFaqSchema: boolean
  hasHowToSchema?: boolean
  hasBreadcrumb?: boolean
  hasOrganizationTrust?: boolean
  schemaCoverage?: string[]
  llmsTxtSections?: string[]
  aiBotsBlocked?: string[]
  faqEntityCount?: number
  tableCount?: number
  citationDensity?: number
  hasAuthorBio?: boolean
  isYmyl?: boolean
  ymylConfidence?: 'low' | 'medium' | 'high' | null
}

export interface InfraSnapshot {
  serverIp?: string | null
  city?: string | null
  country?: string | null
  cdnProvider?: string | null
  htmlLang?: string | null
  hreflangCount?: number
  platforms?: string[]
  tracking?: string[]
  hostingServer?: string | null
  hostingPoweredBy?: string | null
}

export interface PageClassificationSnapshot {
  shortSummary: string
  tags: string[]
  intensityTier: number
  tagTiers?: Array<{ tag: string; tier: number }>
}

export interface PassedCheck {
  id: string
  description: string
  help: string
}

export interface DeviceSibling {
  id: string
  device: ScanDevice
  overallScore: number | null
}

/** Light visual layers for Issues capture (heatmap / page regions / scanpath). */
export interface VisualPageRegion {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
  /** 0–1 saliency prominence when known */
  saliencyProminence?: number
}

export interface VisualLayersSnapshot {
  /** Transparent heatmap overlay aligned to capture viewport */
  saliencyHeatmapUrl?: string | null
  regions?: VisualPageRegion[]
  /** Optional gaze/scanpath polyline in capture pixels */
  scanpath?: Array<{ x: number; y: number }>
}

/**
 * Light overview payload — magazine + Detail report.
 * Richer optional fields mirror old CHECKION overview/sibling cards without mega-JSON dumps.
 */
export interface ScanOverview {
  scan: ScanSummary
  scores: ScoreCard[]
  topIssues: IssueSummary[]
  lede: string
  performance?: PerformanceSnapshot
  seo?: SeoSnapshot
  eco?: EcoSnapshot
  ux?: UxSnapshot
  links?: LinkSnapshot
  securityPrivacy?: SecurityPrivacySnapshot
  freshness?: ContentFreshnessSnapshot
  generative?: GenerativeSnapshot
  infra?: InfraSnapshot
  classification?: PageClassificationSnapshot
  /** Public path under /fixtures or absolute URL */
  screenshotUrl?: string | null
  /** Issues-canvas layers (heatmap / regions / scanpath) */
  visualLayers?: VisualLayersSnapshot
  passedChecks?: PassedCheck[]
  deviceSiblings?: DeviceSibling[]
}

export interface DomainScanLight {
  id: string
  projectId: string
  rootUrl: string
  status: ScanStatus
  pageCount: number
  overallScore: number | null
  issueCount: number
  startedAt: string
  completedAt: string | null
  error?: string
  progress?: {
    scanned: number
    total: number
    currentUrl?: string
  }
  industry?: string | null
  tags?: string[]
  issueStats?: IssueStats
}

/** Systemic finding across many pages in a deep crawl. */
export interface DomainSystemicIssue {
  id: string
  title: string
  pageCount: number
  severity?: IssueSeverity
  ruleId?: string
}

/** Avg lab timings across the crawled corpus. */
export interface DomainPerformanceAggregate {
  avgTtfb: number
  avgFcp: number
  avgLcp: number
  avgDomLoad: number
  pageCount: number
  scriptTransferKbAvg?: number | null
}

/** SEO presence / conflict counts across pages (not a single-page title/meta). */
export interface DomainSeoCoverage {
  totalPages: number
  withTitle: number
  withH1: number
  withMetaDescription: number
  withCanonical: number
  withOgTitle?: number
  withOgImage?: number
  withTwitterCard?: number
  canonicalMismatchCount: number
  duplicateTitleGroupCount: number
  duplicateMetaGroupCount?: number
  missingH1Count?: number
  hreflangXDefaultConflict?: boolean
  hreflangDistinctTargets?: number
  totalWordsAcrossPages?: number
  topKeywords?: string[]
}

export interface DomainReadabilityBands {
  easy: number
  standard: number
  complex: number
  veryComplex: number
}

export interface DomainUxAggregate {
  score: number
  cls: number
  readabilityGrade: string
  readabilityScore: number
  readabilityBands?: DomainReadabilityBands
  dwellSecondsMedian?: number | null
  brokenLinkCount: number
  tapTargetIssueCount: number
  pagesWithMultipleH1: number
  pagesWithSkippedLevels: number
  pageCount: number
}

export interface DomainEcoAggregate {
  avgCo2: number
  /** Modal / dominant eco grade across pages */
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  avgPageWeightKb: number
  gradeDistribution?: Partial<Record<'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F', number>>
  pageCount: number
}

export interface DomainEeatAggregate {
  totalPages: number
  trust: {
    pagesWithContact: number
    pagesWithPrivacy: number
    pagesWithImpressum: number
  }
  expertise: {
    pagesWithAuthorBio: number
    pagesWithArticleAuthor: number
    avgCitationsPerPage: number
  }
  experience: {
    pagesWithTeam: number
    pagesWithAbout: number
    pagesWithCaseStudyMention: number
  }
}

export interface DomainGenerativeAggregate {
  score: number
  discoverability: number
  repurposing: number
  withLlmsTxt: number
  withRobotsAllowingAi?: number
  pageCount: number
  citationDensity?: number
}

export interface DomainPageSample {
  url: string
  score: number | null
  errors?: number
  warnings?: number
}

/**
 * Deep-scan magazine payload — corpus summary of many single-page scans.
 * Not interchangeable with {@link ScanOverview}.
 */
export interface DomainOverview {
  scan: DomainScanLight
  scores: ScoreCard[]
  lede: string
  systemicIssues: DomainSystemicIssue[]
  performance?: DomainPerformanceAggregate
  seoCoverage?: DomainSeoCoverage
  ux?: DomainUxAggregate
  eco?: DomainEcoAggregate
  links?: LinkSnapshot
  securityPrivacy?: SecurityPrivacySnapshot
  eeat?: DomainEeatAggregate
  generative?: DomainGenerativeAggregate
  infra?: InfraSnapshot
  classification?: PageClassificationSnapshot
  /** Worst / sample pages for overview teaser (not full crawl table). */
  pageSamples?: DomainPageSample[]
}

/** GEO / E-E-A-T job — separate from ScanMode ('single' | 'deep'). */
export type GeoJobStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface GeoJobSummary {
  id: string
  title: string
  projectId: string
  url: string
  status: GeoJobStatus
  overallScore: number | null
  completedAt: string | null
  queryCount: number
  modelCount: number
  /** Share of query×model cells where the target domain was cited (0–100). */
  citedShare: number
}

export interface GeoEeatScores {
  experience: number
  expertise: number
  authoritativeness: number
  trustworthiness: number
  geoFitness: number
}

export interface GeoCitation {
  domain: string
  position: number
  context?: string
}

export interface GeoQueryRun {
  queryId: string
  query: string
  modelId: string
  answerText: string
  citations: GeoCitation[]
  /** 1-based position for target domain; null when not cited. */
  ourPosition: number | null
}

export interface GeoShareOfVoice {
  domain: string
  shareOfVoice: number
  avgPosition: number
  mentionCount: number
  isTarget?: boolean
}

/** One row of the placement diagram / matrix. */
export interface GeoPositionRow {
  queryIndex: number
  queryLabel: string
  queryText: string
  /** modelId → position (1-based); 0 = not cited */
  positions: Record<string, number>
}

export type GeoRecommendationSource = 'derived' | 'fixture'

export interface GeoRecommendation {
  id: string
  title: string
  severity: 'high' | 'medium' | 'low'
  body: string
  /** Derived from insights vs static fixture copy. */
  source?: GeoRecommendationSource
  /** Prompt to deep-link when the move is query-scoped. */
  query?: string
}

export type GeoRivalSource = 'explicit' | 'discovered' | 'mixed' | 'none'

export interface GeoPresenceSlice {
  modelId?: string
  query?: string
  cellCount: number
  hitCount: number
  /** 0–100 */
  hitRate: number
}

/** Target-centric presence — always present. */
export interface GeoPresenceSolo {
  cellCount: number
  hitCount: number
  citedShare: number
  missRate: number
  avgPosition: number | null
  firstCiteRate: number | null
  byModel: Array<Required<Pick<GeoPresenceSlice, 'modelId' | 'cellCount' | 'hitCount' | 'hitRate'>>>
  byQuery: Array<Required<Pick<GeoPresenceSlice, 'query' | 'cellCount' | 'hitCount' | 'hitRate'>>>
}

/** Competitive field — null when no rivals (explicit or discovered). */
export interface GeoPresenceField {
  shareOfVoice: GeoShareOfVoice[]
  gapToLead: number | null
  leaderDomain: string | null
}

export interface GeoPresence {
  solo: GeoPresenceSolo
  field: GeoPresenceField | null
  rivals: string[]
  rivalSource: GeoRivalSource
}

export type GeoPromptDuelOutcome = 'win' | 'tie' | 'lose' | 'miss' | 'solo'

export type GeoPromptIntent = 'branded' | 'comparison' | 'how-to' | 'other'

export interface GeoPromptIntentTag {
  query: string
  intent: GeoPromptIntent
  source: 'fixture' | 'heuristic'
}

export interface GeoCoCitationStats {
  cellCount: number
  coCitedCount: number
  aloneCiteCount: number
  /** 0–100 share of all cells where target is co-cited with ≥1 rival. */
  coCitedRate: number
  /** 0–100 share of all cells where target is cited alone (no rival). */
  aloneCiteRate: number
}

export type GeoModelDisagreementKind = 'cite_split' | 'first_domain_split'

export interface GeoModelDisagreement {
  query: string
  kind: GeoModelDisagreementKind
  hitModels?: string[]
  missModels?: string[]
  firstDomains?: string[]
}

export interface GeoAnswerCellAnalysis {
  queryId: string
  query: string
  modelId: string
  citationStack: GeoCitation[]
  firstDomain: string | null
  targetPosition: number | null
  rivalDomains: string[]
  coCited: boolean
  /** Rival at #1 when target missed or ranked worse than #1. */
  stolenBy: string | null
  targetMentionedInAnswer: boolean
}

export interface GeoMissVsRival {
  query: string
  modelId: string
  rivalDomain: string
  rivalPosition: number
  otherRivals: string[]
}

export interface GeoPromptDuel {
  query: string
  outcome: GeoPromptDuelOutcome
  targetHitRate: number
  targetAvgPosition: number | null
  leaderDomain: string | null
  intent: GeoPromptIntent
}

/** Deterministic competitive insights from queryRuns — see geo-answer-insights.md */
export interface GeoInsights {
  promptDuels: GeoPromptDuel[]
  /** Capped (top 8) opportunity cells. */
  missVsRival: GeoMissVsRival[]
  cells: GeoAnswerCellAnalysis[]
  intents: GeoPromptIntentTag[]
  /** Null when rivals.length === 0 (solo). */
  coCitation: GeoCoCitationStats | null
  disagreements: GeoModelDisagreement[]
  /** Derived next moves only; overview.recommendations merges with fixtures. */
  moves: GeoRecommendation[]
}

/**
 * GEO magazine payload — competitive presence + optional on-page E-E-A-T.
 * Not interchangeable with {@link ScanOverview} / {@link DomainOverview}.
 */
export interface GeoOverview {
  job: GeoJobSummary
  lede: string
  targetHost: string
  /** Present only when a page scan / on-page reading is attached. */
  eeat?: GeoEeatScores
  recommendations: GeoRecommendation[]
  models: string[]
  queries: string[]
  /** Explicit competitor hosts supplied at job creation. */
  competitors: string[]
  /**
   * Convenience mirror of `presence.field?.shareOfVoice` when field exists;
   * empty when solo-only. Prefer `presence` for new UI.
   */
  shareOfVoice: GeoShareOfVoice[]
  /** Derived competitive presence (solo always; field when rivals ≥ 1). */
  presence: GeoPresence
  /** Miss-vs-rival, prompt duels, per-answer cell analysis. */
  insights: GeoInsights
  positionMatrix: GeoPositionRow[]
  queryRuns: GeoQueryRun[]
}

export interface FederationHealth {
  contract: '2026-05-plexon-federation-v3'
  plexonReachable: boolean
  version: string
}

export type ShareResourceType = 'single' | 'domain'

export interface ShareLink {
  token: string
  resourceType: ShareResourceType
  resourceId: string
  createdAt: string
}

export interface ApiTokenStub {
  id: string
  label: string
  prefix: string
  createdAt: string
  lastUsedAt: string | null
}

/** Thin Chromium page text — POST /api/fetch-page (no WCAG). */
export type FetchPageRequest = {
  url: string
}

export type FetchPageResponse = {
  url: string
  finalUrl: string
  title: string | null
  bodyTextExcerpt: string
  httpStatus: number | null
  stubbed: boolean
}
