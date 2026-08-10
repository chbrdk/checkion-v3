/** Central path and shell configuration for CHECKION v3 web app. */

export const paths = {
  railInsetRem: 1,
  railGapRem: 4,
  railWidthRem: 4.25,
  mainGutterRem: 2.5,
  railDockEdge: 'left' as const,
  railDockStorageKey: 'checkion.v3.railDock',
  brandCornerRadiusPx: 32,
  brandLabel: 'CHECKION',
  devPort: 3007,
  defaultDisplayName: 'CHECKION',
  displayNameStorageKey: 'checkion.v3.displayName',
  themeStorageKey: 'checkion.v3.theme',
  localeStorageKey: 'checkion.v3.locale',
  defaultTheme: 'msqdx-dark' as const,
  defaultLocale: 'en' as const,
  themeChoices: ['msqdx', 'msqdx-dark', 'msqdx-v2', 'msqdx-v2-dark'] as const,
  localeChoices: ['en', 'de'] as const,
  projectFixturesPath: 'apps/web/lib/fixtures/projects.ts',
  projectStorePath: 'apps/web/lib/fixtures/project-store.ts',
  scanFixturesPath: 'apps/web/lib/fixtures/scans.ts',
  scanStorePath: 'apps/web/lib/fixtures/scan-store.ts',
  shareStorePath: 'apps/web/lib/fixtures/share-store.ts',
  apiTokensStorePath: 'apps/web/lib/fixtures/api-tokens-store.ts',
  /** Personal Bearer token prefix (`checkion_` + 64 hex). */
  apiTokenPrefix: 'checkion_',
  apiTokenBytes: 32,
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
  envLiveScans: 'CHECKION_LIVE_SCANS',
  envLiveGeo: 'CHECKION_LIVE_GEO',
  /** Cap for POST /api/fetch-page bodyTextExcerpt (matches scanner bodyTextExcerpt). */
  fetchPageMaxChars: 6000,
  envOpenAiApiKey: 'OPENAI_API_KEY',
  envOpenAiModel: 'OPENAI_MODEL',
  envAnthropicApiKey: 'ANTHROPIC_API_KEY',
  envGeminiApiKey: 'GEMINI_API_KEY',
  /** Alias accepted for Gemini when GEMINI_API_KEY unset. */
  envGoogleApiKey: 'GOOGLE_API_KEY',
  envPlexonDemoOwner: 'PLEXON_DEMO_OWNER_USER_ID',
  envPlexonDemoCompany: 'PLEXON_DEMO_COMPANY_ID',
  routes: {
    apiGeoJobs: '/api/geo-jobs',
    apiGeoJobDetail: (id: string) => `/api/geo-jobs/${id}`,
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
    }) => {
      const params = new URLSearchParams()
      if (q.projectId) params.set('projectId', q.projectId)
      if (q.mode) params.set('mode', q.mode)
      if (q.url) params.set('url', q.url)
      if (q.platformProjectId) params.set('platformProjectId', q.platformProjectId)
      if (q.audionRunId) params.set('audionRunId', q.audionRunId)
      if (q.stepUrl) params.set('stepUrl', q.stepUrl)
      const qs = params.toString()
      return qs ? `/scan?${qs}` : '/scan'
    },
    projects: '/projects',
    projectDetail: (id: string) => `/projects/${id}`,
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
    apiScans: '/api/scans',
    /** Thin Chromium page text for AUDION research (no axe/Pa11y). */
    apiFetchPage: '/api/fetch-page',
    apiScanDetail: (id: string) => `/api/scans/${id}`,
    apiScanOverview: (id: string) => `/api/scans/${id}/overview`,
    apiScanIssues: (id: string) => `/api/scans/${id}/issues`,
    apiScanScores: (id: string) => `/api/scans/${id}/scores`,
    apiScanScreenshot: (id: string) => `/api/scans/${encodeURIComponent(id)}/screenshot`,
    apiScanWeakestSignal: (id: string) => `/api/scans/${id}/weakest-signal`,
    apiDomainScans: '/api/domain-scans',
    apiDomainScanDetail: (id: string) => `/api/domain-scans/${id}`,
    apiDomainScanControl: (id: string) => `/api/domain-scans/${id}/control`,
    apiProjectActiveDomainScans: (projectId: string) =>
      `/api/projects/${projectId}/domain-scans/active`,
    apiDomainScanOverview: (id: string) => `/api/domain-scans/${id}/overview`,
    apiDomainScanIssues: (id: string) => `/api/domain-scans/${id}/issues`,
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

export type AppPaths = typeof paths
