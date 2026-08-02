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
  error?: string
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
