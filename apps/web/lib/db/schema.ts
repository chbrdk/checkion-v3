import {
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import type {
  ApiTokenStub,
  CapabilitySyncStatus,
  DomainScanLight,
  GeoOverview,
  IssueSummary,
  ProjectStatus,
  ScanOverview,
  ScanSummary,
  ScoreCard,
  ShareLink,
  ShareResourceType,
} from '@checkion-v3/contracts'

/** CHECKION-v3 product projects (Phase 1 Postgres). */
export const projects = pgTable(
  'projects',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    domain: text('domain').notNull(),
    status: text('status').$type<ProjectStatus>().notNull().default('active'),
    platformProjectId: text('platform_project_id').notNull(),
    capabilityStatus: text('capability_status')
      .$type<CapabilitySyncStatus>()
      .notNull()
      .default('pending'),
    lastScanAt: text('last_scan_at'),
    scanCount: integer('scan_count').notNull().default(0),
    description: text('description').notNull().default(''),
    recentScanIds: jsonb('recent_scan_ids').$type<string[]>().notNull().default([]),
    ownerPlexonUserId: text('owner_plexon_user_id'),
    platformCompanyId: text('platform_company_id'),
    /** Extra fields beyond contract scalars. */
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    platformProjectIdUnique: uniqueIndex('projects_platform_project_id_unique').on(
      t.platformProjectId,
    ),
  }),
)

export type ProjectRow = typeof projects.$inferSelect
export type ProjectInsert = typeof projects.$inferInsert

export type ScanPayload = {
  scan?: Partial<ScanSummary>
  issues?: IssueSummary[]
  scores?: ScoreCard[]
  /** Full magazine overview when produced by the live pipeline. */
  overview?: ScanOverview
  runtime?: { workerSessionId?: string }
  error?: string
}

export const scans = pgTable('scans', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  mode: text('mode').notNull(),
  url: text('url').notNull(),
  status: text('status').notNull().default('queued'),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  overallScore: doublePrecision('overall_score'),
  issueCount: integer('issue_count').notNull().default(0),
  payload: jsonb('payload').$type<ScanPayload>().notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ScanRow = typeof scans.$inferSelect

export type DomainScanPayload = {
  domain?: Partial<DomainScanLight>
  issues?: IssueSummary[]
  scores?: ScoreCard[]
  overviewExtras?: Record<string, unknown>
  progress?: { scanned: number; total: number; currentUrl?: string }
  runtime?: { workerSessionId?: string }
  error?: string
  /** External scan-worker enqueue options (`CHECKION_SCAN_WORKER_MODE=external`). */
  job?: {
    maxPages: number
    useSitemap?: boolean
    skipUnchangedPages?: boolean
    linkScanId?: string
  }
}

export const domainScans = pgTable('domain_scans', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  rootUrl: text('root_url').notNull(),
  status: text('status').notNull().default('queued'),
  pageCount: integer('page_count').notNull().default(0),
  overallScore: doublePrecision('overall_score'),
  issueCount: integer('issue_count').notNull().default(0),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  payload: jsonb('payload').$type<DomainScanPayload>().notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type DomainScanRow = typeof domainScans.$inferSelect

/**
 * Per-URL page results for deep-scan reuse (ETag / Last-Modified HEAD match).
 * Slim ScanResult JSON — screenshots stripped on write.
 */
export const pageScanCache = pgTable(
  'page_scan_cache',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull(),
    normalizedUrl: text('normalized_url').notNull(),
    device: text('device').notNull().default('desktop'),
    etag: text('etag'),
    lastModified: text('last_modified'),
    contentFingerprint: text('content_fingerprint'),
    result: jsonb('result').$type<Record<string, unknown>>().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectUrlDeviceUnique: uniqueIndex('page_scan_cache_project_url_device_unique').on(
      t.projectId,
      t.normalizedUrl,
      t.device,
    ),
  }),
)

export type PageScanCacheRow = typeof pageScanCache.$inferSelect

export type GeoJobPayload = {
  overview: GeoOverview
}

export const geoJobs = pgTable('geo_jobs', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  title: text('title').notNull(),
  url: text('url').notNull(),
  status: text('status').notNull().default('queued'),
  overallScore: doublePrecision('overall_score'),
  completedAt: text('completed_at'),
  queryCount: integer('query_count').notNull().default(0),
  modelCount: integer('model_count').notNull().default(0),
  citedShare: doublePrecision('cited_share').notNull().default(0),
  payload: jsonb('payload').$type<GeoJobPayload>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type GeoJobRow = typeof geoJobs.$inferSelect

export const shareLinks = pgTable('share_links', {
  token: text('token').primaryKey(),
  resourceType: text('resource_type').$type<ShareResourceType>().notNull(),
  resourceId: text('resource_id').notNull(),
  createdAt: text('created_at').notNull(),
  payload: jsonb('payload').$type<Partial<ShareLink>>().notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ShareLinkRow = typeof shareLinks.$inferSelect

export const apiTokens = pgTable('api_tokens', {
  id: text('id').primaryKey(),
  /** Plexon / session user id (no local users FK). */
  ownerId: text('owner_id').notNull(),
  label: text('label').notNull(),
  /** Visible prefix only (`checkion_` + 4 hex); never the full secret. */
  prefix: text('prefix').notNull(),
  /** SHA-256 hex of raw Bearer token. */
  tokenHash: text('token_hash').notNull(),
  createdAt: text('created_at').notNull(),
  lastUsedAt: text('last_used_at'),
  payload: jsonb('payload').$type<Partial<ApiTokenStub>>().notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ApiTokenRow = typeof apiTokens.$inferSelect

/** SEO Market cache (TTL) — DataForSEO response blobs. */
export const seoMarketCache = pgTable(
  'seo_market_cache',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull(),
    cacheKey: text('cache_key').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectKeyUnique: uniqueIndex('seo_market_cache_project_key_unique').on(
      t.projectId,
      t.cacheKey,
    ),
  }),
)

export type SeoMarketCacheRow = typeof seoMarketCache.$inferSelect

export const seoMarketUsage = pgTable(
  'seo_market_usage',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull(),
    day: text('day').notNull(),
    endpoint: text('endpoint').notNull(),
    units: integer('units').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectDayIdx: uniqueIndex('seo_market_usage_id_unique').on(t.id),
  }),
)

export type SeoMarketUsageRow = typeof seoMarketUsage.$inferSelect

export const seoSavedKeywords = pgTable(
  'seo_saved_keywords',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull(),
    keyword: text('keyword').notNull(),
    locationCode: integer('location_code').notNull().default(2840),
    languageCode: text('language_code').notNull().default('en'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex('seo_saved_keywords_project_kw_loc_lang').on(
      t.projectId,
      t.keyword,
      t.locationCode,
      t.languageCode,
    ),
  }),
)

export type SeoSavedKeywordRow = typeof seoSavedKeywords.$inferSelect

export const seoKeywordMetrics = pgTable(
  'seo_keyword_metrics',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull(),
    keyword: text('keyword').notNull(),
    locationCode: integer('location_code').notNull().default(2840),
    languageCode: text('language_code').notNull().default('en'),
    searchVolume: integer('search_volume'),
    cpc: doublePrecision('cpc'),
    competition: doublePrecision('competition'),
    keywordDifficulty: integer('keyword_difficulty'),
    intent: text('intent'),
    fetchedAt: text('fetched_at').notNull(),
  },
  (t) => ({
    uniq: uniqueIndex('seo_keyword_metrics_project_kw_loc_lang').on(
      t.projectId,
      t.keyword,
      t.locationCode,
      t.languageCode,
    ),
  }),
)

export type SeoKeywordMetricsRow = typeof seoKeywordMetrics.$inferSelect

export const seoRankConfigs = pgTable('seo_rank_configs', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  domain: text('domain').notNull(),
  locationCode: integer('location_code').notNull().default(2840),
  languageCode: text('language_code').notNull().default('en'),
  schedule: text('schedule').notNull().default('manual'),
  isActive: integer('is_active').notNull().default(1),
  lastCheckedAt: text('last_checked_at'),
  nextCheckAt: text('next_check_at'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type SeoRankConfigRow = typeof seoRankConfigs.$inferSelect

export const seoRankKeywords = pgTable(
  'seo_rank_keywords',
  {
    id: text('id').primaryKey(),
    configId: text('config_id').notNull(),
    keyword: text('keyword').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex('seo_rank_keywords_config_kw').on(t.configId, t.keyword),
  }),
)

export type SeoRankKeywordRow = typeof seoRankKeywords.$inferSelect

export const seoRankRuns = pgTable('seo_rank_runs', {
  id: text('id').primaryKey(),
  configId: text('config_id').notNull(),
  projectId: text('project_id').notNull(),
  status: text('status').notNull().default('pending'),
  keywordsTotal: integer('keywords_total').notNull().default(0),
  keywordsChecked: integer('keywords_checked').notNull().default(0),
  errorMessage: text('error_message'),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
})

export type SeoRankRunRow = typeof seoRankRuns.$inferSelect

export const seoRankSnapshots = pgTable('seo_rank_snapshots', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull(),
  trackingKeywordId: text('tracking_keyword_id').notNull(),
  keyword: text('keyword').notNull(),
  device: text('device').notNull().default('desktop'),
  position: integer('position'),
  url: text('url'),
  checkedAt: text('checked_at').notNull(),
})

export type SeoRankSnapshotRow = typeof seoRankSnapshots.$inferSelect

export const seoBacklinkSnapshots = pgTable('seo_backlink_snapshots', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  domain: text('domain').notNull(),
  rank: integer('rank'),
  backlinks: integer('backlinks'),
  referringDomains: integer('referring_domains'),
  brokenBacklinks: integer('broken_backlinks'),
  newBacklinks: integer('new_backlinks'),
  lostBacklinks: integer('lost_backlinks'),
  newReferringDomains: integer('new_referring_domains'),
  lostReferringDomains: integer('lost_referring_domains'),
  spamScore: integer('spam_score'),
  /** Referring pages, TLD/types, timeseries — DataForSEO payload. */
  details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
  source: text('source').notNull().default('fixture'),
  stubbed: integer('stubbed').notNull().default(1),
  capturedAt: text('captured_at').notNull(),
})

export type SeoBacklinkSnapshotRow = typeof seoBacklinkSnapshots.$inferSelect

export const seoDomainSnapshots = pgTable('seo_domain_snapshots', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  domain: text('domain').notNull(),
  organicKeywords: integer('organic_keywords'),
  organicTraffic: doublePrecision('organic_traffic'),
  organicCost: doublePrecision('organic_cost'),
  topKeywords: jsonb('top_keywords').$type<Array<Record<string, unknown>>>().notNull().default([]),
  source: text('source').notNull().default('fixture'),
  stubbed: integer('stubbed').notNull().default(1),
  capturedAt: text('captured_at').notNull(),
})

export type SeoDomainSnapshotRow = typeof seoDomainSnapshots.$inferSelect

export const seoCompetitorSnapshots = pgTable('seo_competitor_snapshots', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  domain: text('domain').notNull(),
  keywords: jsonb('keywords').$type<string[]>().notNull().default([]),
  items: jsonb('items').$type<Array<Record<string, unknown>>>().notNull().default([]),
  source: text('source').notNull().default('fixture'),
  stubbed: integer('stubbed').notNull().default(1),
  capturedAt: text('captured_at').notNull(),
})

export type SeoCompetitorSnapshotRow = typeof seoCompetitorSnapshots.$inferSelect

/** @deprecated legacy blob tracker — prefer seo_rank_configs */
export type SeoRankTrackerPayload = {
  keywords: string[]
  locationCode: number
  languageCode: string
  latest: Array<{
    keyword: string
    rank: number | null
    url: string | null
    fetchedAt: string
  }>
  error?: string
}

export const seoRankTrackers = pgTable('seo_rank_trackers', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  domain: text('domain').notNull(),
  status: text('status').notNull().default('idle'),
  lastRefreshAt: text('last_refresh_at'),
  payload: jsonb('payload').$type<SeoRankTrackerPayload>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type SeoRankTrackerRow = typeof seoRankTrackers.$inferSelect

export const seoKeywordSets = pgTable('seo_keyword_sets', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  label: text('label').notNull(),
  keywords: jsonb('keywords').$type<string[]>().notNull().default([]),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type SeoKeywordSetRow = typeof seoKeywordSets.$inferSelect
