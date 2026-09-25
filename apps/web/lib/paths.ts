/** Central path and shell configuration for CHECKION v3 web app. */

export const paths = {
  railInsetRem: 1,
  railGapRem: 4,
  railWidthRem: 4.25,
  mainGutterRem: 2.5,
  railDockEdge: 'left' as const,
  railDockStorageKey: 'checkion.v3.railDock',
  /** Prefer DS `MSQDX_SHELL_CORNER_RADIUS` (24) via BrandCorner default — do not override. */
  brandLabel: 'CHECKION',
  productId: 'checkion' as const,
  /** v3 staging origins for product launcher (overridden by NEXT_PUBLIC_* env). */
  ecosystemStagingPlexon: 'https://plexon-v3.projects-a.plygrnd.tech',
  ecosystemStagingAudion: 'https://audion-v3.projects-a.plygrnd.tech',
  ecosystemStagingCheckion: 'https://checkion-v3.projects-a.plygrnd.tech',
  ecosystemStagingBrandion: 'https://brandion-v3.projects-a.plygrnd.tech',
  ecosystemStagingCreation: 'https://creation-v3.projects-a.plygrnd.tech',
  ecosystemStagingEchon: 'https://echon-v3.projects-a.plygrnd.tech',
  plexonProductsPath: '/products',
  envAudionPublicUrl: 'NEXT_PUBLIC_AUDION_URL',
  envBrandionPublicUrl: 'NEXT_PUBLIC_BRANDION_URL',
  envCreationPublicUrl: 'NEXT_PUBLIC_CREATION_URL',
  envEchonPublicUrl: 'NEXT_PUBLIC_ECHON_URL',
  devPort: 3007,
  defaultDisplayName: 'CHECKION',
  displayNameStorageKey: 'checkion.v3.displayName',
  themeStorageKey: 'checkion.v3.themePreference',
  accentStorageKey: 'checkion.v3.accentPreference',
  localeStorageKey: 'checkion.v3.locale',
  defaultTheme: 'dark' as const,
  defaultLocale: 'en' as const,
  themeChoices: ['light', 'dark', 'auto'] as const,
  localeChoices: ['en', 'de'] as const,
  i18nLibPath: 'apps/web/lib/i18n.ts',
  localesDir: 'apps/web/locales',
  i18nKnowledgePath: 'knowledge/i18n.md',
  projectFixturesPath: 'apps/web/lib/fixtures/projects.ts',
  projectStorePath: 'apps/web/lib/fixtures/project-store.ts',
  scanFixturesPath: 'apps/web/lib/fixtures/scans.ts',
  scanStorePath: 'apps/web/lib/fixtures/scan-store.ts',
  shareStorePath: 'apps/web/lib/fixtures/share-store.ts',
  apiTokensStorePath: 'apps/web/lib/fixtures/api-tokens-store.ts',
  /** Personal Bearer token prefix (`checkion_` + 64 hex). */
  apiTokenPrefix: 'checkion_',
  apiTokenBytes: 32,
  /** Coolify / MCP machine Bearer (Settings token stored as env — not viewer identity). */
  envCheckionApiToken: 'CHECKION_API_TOKEN',
  /** Owner when session absent (local / fixture mode). */
  apiTokenFixtureOwnerId: 'local-admin',
  federationContract: '2026-05-plexon-federation-v3' as const,
  /** Local demo: fixtures only — no live Plexon / crawl. Override with CHECKION_FEDERATION_MODE=live. */
  dataSource: 'fixtures' as const,
  federationMode: 'dummy' as const,
  envPlexonBase: 'NEXT_PLEXON_BASE_URL',
  /** Browser iframe origin for central assistant (falls back to base/auth). */
  envPlexonPublicUrl: 'NEXT_PUBLIC_PLEXON_URL',
  envCheckionPublicUrl: 'NEXT_PUBLIC_CHECKION_URL',
  pathAssistantEmbed: '/assistant/embed',
  pathAssistantExpand: '/assistant',
  envPlexonServiceSecret: 'PLEXON_SERVICE_SECRET',
  envPlexonAuthUrl: 'PLEXON_AUTH_URL',
  envPlexonRegisterUrl: 'NEXT_PUBLIC_PLEXON_REGISTER_URL',
  envAuthSecret: 'AUTH_SECRET',
  /** Local-only NextAuth fallback when AUTH_SECRET unset (never use in prod with Plexon auth). */
  authDevFallbackSecret: 'checkion-v3-local-dev-auth-secret-min-32chars',
  envFederationMode: 'CHECKION_FEDERATION_MODE',
  /** Service: Collections the user may see (access model B). */
  plexonAccessibleCollectionsPath: '/api/platform/provisioning/accessible-collections',
  /** Service: Collection lifecycle (archive / restore). */
  plexonProvisioningProjectPath: (platformProjectId: string) =>
    `/api/platform/provisioning/projects/${encodeURIComponent(platformProjectId)}`,
  plexonProvisioningCollectionMembersPath: (platformProjectId: string) =>
    `/api/platform/provisioning/collections/${encodeURIComponent(platformProjectId)}/members`,
  plexonProvisioningCollectionMemberPath: (platformProjectId: string, userId: string) =>
    `/api/platform/provisioning/collections/${encodeURIComponent(platformProjectId)}/members/${encodeURIComponent(userId)}`,
  plexonProvisioningCollectionInvitesPath: (platformProjectId: string) =>
    `/api/platform/provisioning/collections/${encodeURIComponent(platformProjectId)}/invites`,
  envLiveScans: 'CHECKION_LIVE_SCANS',
  envLiveGeo: 'CHECKION_LIVE_GEO',
  /** `inline` (web executes) or `external` (scan-worker claims DB jobs). */
  envScanWorkerMode: 'CHECKION_SCAN_WORKER_MODE',
  /** Worker stale reclaim grace ms (default 120000). */
  envScanWorkerStaleMs: 'CHECKION_SCAN_WORKER_STALE_MS',
  /**
   * Abandon running worker jobs with no progress (pageCount 0) after this age (default 600000 = 10m).
   * Prevents one hung crawl from blocking the claim queue forever.
   */
  envScanWorkerAbandonNoProgressMs: 'CHECKION_SCAN_WORKER_ABANDON_NO_PROGRESS_MS',
  /** Absolute wall-clock per domain job in the worker (default 1200000 = 20m). */
  envScanWorkerJobTimeoutMs: 'CHECKION_SCAN_WORKER_JOB_TIMEOUT_MS',
  /** Coolify scan-worker health port. */
  scanWorkerPort: 3011,
  scanWorkerServiceName: 'checkion-scan-worker',
  /** Cap for POST /api/fetch-page bodyTextExcerpt (matches scanner bodyTextExcerpt). */
  fetchPageMaxChars: 6000,
  envOpenAiApiKey: 'OPENAI_API_KEY',
  envOpenAiModel: 'OPENAI_MODEL',
  envAnthropicApiKey: 'ANTHROPIC_API_KEY',
  envGeminiApiKey: 'GEMINI_API_KEY',
  /** Alias accepted for Gemini when GEMINI_API_KEY unset. */
  envGoogleApiKey: 'GOOGLE_API_KEY',
  /** Gemini generateContent origin — use `geminiGenerateContentUrl`. */
  geminiApiBase: 'https://generativelanguage.googleapis.com/v1beta',
  /** Hosted Anthropic web search tool type (Layer 2 GEO). */
  anthropicWebSearchTool: 'web_search_20260318',
  /** OpenAI Responses hosted search tool type (Layer 2 GEO). */
  openaiWebSearchTool: 'web_search',
  /**
   * Layer 2 cost dial — OpenAI search context per call (`low`|`medium`|`high`).
   * Override: `CHECKION_GEO_OPENAI_SEARCH_CONTEXT_SIZE`.
   */
  openaiGeoSearchContextSizeDefault: 'medium' as const,
  envOpenAiGeoSearchContextSize: 'CHECKION_GEO_OPENAI_SEARCH_CONTEXT_SIZE',
  /**
   * Layer 2 cost dial — max built-in tool calls (incl. web_search) per OpenAI cell.
   * Override: `CHECKION_GEO_OPENAI_MAX_TOOL_CALLS`.
   */
  openaiGeoMaxToolCallsDefault: 3,
  openaiGeoMaxToolCallsHardCap: 16,
  envOpenAiGeoMaxToolCalls: 'CHECKION_GEO_OPENAI_MAX_TOOL_CALLS',
  /**
   * Layer 2 cost dial — Anthropic web_search `max_uses` per cell.
   * Override: `CHECKION_GEO_ANTHROPIC_MAX_USES`.
   */
  anthropicGeoMaxUsesDefault: 3,
  anthropicGeoMaxUsesHardCap: 16,
  envAnthropicGeoMaxUses: 'CHECKION_GEO_ANTHROPIC_MAX_USES',
  envPlexonDemoOwner: 'PLEXON_DEMO_OWNER_USER_ID',
  envPlexonDemoCompany: 'PLEXON_DEMO_COMPANY_ID',
  /**
   * Deque University axe rule docs base (must match installed axe-core major.minor).
   * See knowledge/wcag-detector-versions.md.
   */
  remediationAxeRulesBase: 'https://dequeuniversity.com/rules/axe/4.13',
  /** W3C WCAG 2.1 Quick Reference (htmlcs / criterion docs). */
  remediationWcagQuickref: 'https://www.w3.org/WAI/WCAG21/quickref/',
  routes: {
    apiGeoJobs: '/api/geo-jobs',
    apiGeoJobDetail: (id: string) => `/api/geo-jobs/${id}`,
    /** Gegentest — Wave E3 GEO delta vs previous job (same measurement). */
    apiGeoJobDelta: (id: string) => `/api/geo-jobs/${encodeURIComponent(id)}/delta`,
    /** GEO job CSV export — one row per query×model cell. */
    apiGeoJobExportCsv: (id: string) => `/api/geo-jobs/${encodeURIComponent(id)}/export`,
    /** Explicit publish GEO distillate → Collection Knowledge Pack. */
    apiGeoJobPublishKnowledge: (id: string) => `/api/geo-jobs/${encodeURIComponent(id)}/publish-knowledge`,
    /** GEO launch — AI / fixture query suggestions for `/scan`. */
    apiGeoSuggestQueries: '/api/geo/suggest-queries',
    apiAuthNextAuth: '/api/auth',
    home: '/',
    scan: '/scan',
    /** Collection / AUDION deep-link into central launch form (seo · geo · single · deep). */
    scanLaunch: (q: {
      projectId?: string
      mode?: 'seo' | 'geo' | 'single' | 'deep'
      url?: string
      platformProjectId?: string
      audionRunId?: string
      stepUrl?: string
      measurement?: 'recall' | 'live' | 'both'
    }) => {
      const params = new URLSearchParams()
      if (q.projectId) params.set('projectId', q.projectId)
      if (q.mode) params.set('mode', q.mode)
      if (q.url) params.set('url', q.url)
      if (q.platformProjectId) params.set('platformProjectId', q.platformProjectId)
      if (q.audionRunId) params.set('audionRunId', q.audionRunId)
      if (q.stepUrl) params.set('stepUrl', q.stepUrl)
      if (q.measurement) params.set('measurement', q.measurement)
      const qs = params.toString()
      return qs ? `/scan?${qs}` : '/scan'
    },
    projects: '/projects',
    projectDetail: (id: string) => `/projects/${id}`,
    /** Project workspace GEO History chapter deep-link. */
    projectGeoHistory: (id: string) =>
      `/projects/${encodeURIComponent(id)}?chapter=geo-history`,
    /** Index redirects home — use resultSection / resultDetail for magazines. */
    results: '/results',
    resultDetail: (id: string) => `/results/${id}`,
    resultSection: (id: string, section: 'overview' | 'issues' | 'detail') =>
      `/results/${id}/${section}`,
    domain: '/domain',
    domainDetail: (id: string) => `/domain/${id}`,
    domainSection: (id: string, section: 'overview' | 'issues' | 'detail') =>
      `/domain/${id}/${section}`,
    geo: '/geo',
    geoDetail: (id: string) => `/geo/${id}`,
    geoSection: (id: string, section: 'overview' | 'queries') =>
      `/geo/${id}/${section}`,
    geoQueriesPrompt: (id: string, query: string, model?: string) => {
      const base = `/geo/${id}/queries?q=${encodeURIComponent(query)}`
      return model ? `${base}&model=${encodeURIComponent(model)}` : base
    },
    apiGeoReading: (
      id: string,
      kind: 'verdict' | 'eeat' | 'placement' | 'queries' | 'query',
      query?: string,
    ) => {
      const base = `/api/geo-jobs/${id}/reading?kind=${kind}`
      if (kind === 'query' && query) {
        return `${base}&query=${encodeURIComponent(query)}`
      }
      return base
    },
    journey: '/journey',
    reports: '/reports',
    share: '/share',
    shareDetail: (token: string) => `/share/${token}`,
    settings: '/settings',
    login: '/login',
    apiHealth: '/api/health',
    apiProjects: '/api/projects',
    apiProjectDetail: (id: string) => `/api/projects/${id}`,
    apiProjectMembers: (id: string) => `/api/projects/${encodeURIComponent(id)}/members`,
    apiProjectMember: (id: string, userId: string) =>
      `/api/projects/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`,
    apiProjectInvites: (id: string) => `/api/projects/${encodeURIComponent(id)}/invites`,
    apiProjectGeoHistory: (id: string) => `/api/projects/${encodeURIComponent(id)}/geo-history`,
    apiProjectArchive: (id: string) => `/api/projects/${id}/archive`,
    apiScans: '/api/scans',
    /** Thin Chromium page text for AUDION research (no axe/Pa11y). */
    apiFetchPage: '/api/fetch-page',
    apiScanDetail: (id: string) => `/api/scans/${id}`,
    apiScanOverview: (id: string) => `/api/scans/${id}/overview`,
    apiScanIssues: (id: string) => `/api/scans/${id}/issues`,
    apiScanScores: (id: string) => `/api/scans/${id}/scores`,
    /** Gegentest — Wave E3 run delta vs previous single (`specs/api/scan-run-delta.md`). */
    apiScanDelta: (id: string) => `/api/scans/${encodeURIComponent(id)}/delta`,
    apiScanScreenshot: (id: string) => `/api/scans/${encodeURIComponent(id)}/screenshot`,
    apiScanWeakestSignal: (id: string) => `/api/scans/${id}/weakest-signal`,
    apiDomainScans: '/api/domain-scans',
    apiDomainScanDetail: (id: string) => `/api/domain-scans/${id}`,
    /** Gegentest — Wave E3 run delta vs previous deep crawl. */
    apiDomainScanDelta: (id: string) => `/api/domain-scans/${encodeURIComponent(id)}/delta`,
    apiDomainScanControl: (id: string) => `/api/domain-scans/${id}/control`,
    apiProjectActiveDomainScans: (projectId: string) =>
      `/api/projects/${projectId}/domain-scans/active`,
    apiDomainScanOverview: (id: string) => `/api/domain-scans/${id}/overview`,
    apiDomainScanIssues: (id: string) => `/api/domain-scans/${id}/issues`,
    apiDomainScanPages: (id: string) => `/api/domain-scans/${id}/pages`,
    apiDomainIssuePages: (id: string, issueId: string) =>
      `/api/domain-scans/${id}/issues/${issueId}/pages`,
    apiDomainTrustReading: (id: string) => `/api/domain-scans/${id}/trust-reading`,
    apiDomainSeoReading: (id: string) => `/api/domain-scans/${id}/seo-reading`,
    apiShare: '/api/share',
    apiShareDetail: (token: string) => `/api/share/${token}`,
    apiTokens: '/api/tokens',
    apiTokenDetail: (tokenId: string) => `/api/tokens/${tokenId}`,
    apiTokensVerify: '/api/tokens/verify',
    apiFederationHealth: '/api/federation/health',
  },
} as const

export function geminiGenerateContentUrl(modelId: string, apiKey: string): string {
  return `${paths.geminiApiBase}/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey)}`
}

export type AppPaths = typeof paths
