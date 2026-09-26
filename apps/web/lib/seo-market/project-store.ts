import { and, desc, eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import type {
  SeoBacklinkSnapshot,
  SeoDomainSnapshot,
  SeoKeywordIdea,
  SeoRankConfig,
  SeoRankSchedule,
  SeoRankSnapshot,
  SeoSavedKeywordRow,
} from '@checkion-v3/contracts'
import { isDatabaseConfigured } from '../db/config'
import { getDb } from '../db/client'
import {
  seoBacklinkSnapshots,
  seoDomainSnapshots,
  seoKeywordMetrics,
  seoRankConfigs,
  seoRankKeywords,
  seoRankRuns,
  seoRankSnapshots,
  seoSavedKeywords,
} from '../db/schema'

type MemState = {
  saved: SeoSavedKeywordRow[]
  metrics: Array<SeoKeywordIdea & { projectId: string; locationCode: number; languageCode: string; fetchedAt: string }>
  domainSnaps: SeoDomainSnapshot[]
  backlinkSnaps: SeoBacklinkSnapshot[]
  configs: SeoRankConfig[]
  runs: Array<{
    id: string
    configId: string
    projectId: string
    status: string
    snapshots: SeoRankSnapshot[]
  }>
}

const mem: MemState = {
  saved: [],
  metrics: [],
  domainSnaps: [],
  backlinkSnaps: [],
  configs: [],
  runs: [],
}

function normalizeDomain(raw: string): string {
  return raw.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
}

export async function listSavedKeywords(projectId: string): Promise<SeoSavedKeywordRow[]> {
  if (!isDatabaseConfigured()) {
    return mem.saved
      .filter((s) => s.projectId === projectId)
      .map((s) => ({
        ...s,
        metrics:
          mem.metrics.find(
            (m) =>
              m.projectId === projectId &&
              m.keyword === s.keyword &&
              m.locationCode === s.locationCode,
          ) ?? null,
      }))
  }
  const db = getDb()
  const rows = await db
    .select()
    .from(seoSavedKeywords)
    .where(eq(seoSavedKeywords.projectId, projectId))
  const metrics = await db
    .select()
    .from(seoKeywordMetrics)
    .where(eq(seoKeywordMetrics.projectId, projectId))
  return rows.map((r) => {
    const m = metrics.find(
      (x) =>
        x.keyword === r.keyword &&
        x.locationCode === r.locationCode &&
        x.languageCode === r.languageCode,
    )
    return {
      id: r.id,
      projectId: r.projectId,
      keyword: r.keyword,
      locationCode: r.locationCode,
      languageCode: r.languageCode,
      createdAt: r.createdAt.toISOString(),
      metrics: m
        ? {
            keyword: m.keyword,
            searchVolume: m.searchVolume,
            cpc: m.cpc,
            competition: m.competition,
            difficulty: m.keywordDifficulty,
            intent: m.intent,
          }
        : null,
    }
  })
}

export async function saveKeywords(input: {
  projectId: string
  keywords: string[]
  locationCode?: number
  languageCode?: string
}): Promise<SeoSavedKeywordRow[]> {
  const locationCode = input.locationCode ?? 2840
  const languageCode = input.languageCode ?? 'en'
  const out: SeoSavedKeywordRow[] = []
  for (const raw of input.keywords) {
    const keyword = raw.trim().toLowerCase()
    if (!keyword) continue
    if (!isDatabaseConfigured()) {
      const existing = mem.saved.find(
        (s) =>
          s.projectId === input.projectId &&
          s.keyword === keyword &&
          s.locationCode === locationCode,
      )
      if (existing) {
        out.push(existing)
        continue
      }
      const row: SeoSavedKeywordRow = {
        id: randomUUID(),
        projectId: input.projectId,
        keyword,
        locationCode,
        languageCode,
        createdAt: new Date().toISOString(),
      }
      mem.saved.push(row)
      out.push(row)
      continue
    }
    const db = getDb()
    const found = await db
      .select()
      .from(seoSavedKeywords)
      .where(
        and(
          eq(seoSavedKeywords.projectId, input.projectId),
          eq(seoSavedKeywords.keyword, keyword),
          eq(seoSavedKeywords.locationCode, locationCode),
          eq(seoSavedKeywords.languageCode, languageCode),
        ),
      )
      .limit(1)
    if (found[0]) {
      out.push({
        id: found[0].id,
        projectId: found[0].projectId,
        keyword: found[0].keyword,
        locationCode: found[0].locationCode,
        languageCode: found[0].languageCode,
        createdAt: found[0].createdAt.toISOString(),
      })
      continue
    }
    const id = randomUUID()
    await db.insert(seoSavedKeywords).values({
      id,
      projectId: input.projectId,
      keyword,
      locationCode,
      languageCode,
    })
    out.push({
      id,
      projectId: input.projectId,
      keyword,
      locationCode,
      languageCode,
      createdAt: new Date().toISOString(),
    })
  }
  return out
}

export async function upsertKeywordMetrics(
  projectId: string,
  items: SeoKeywordIdea[],
  locationCode = 2840,
  languageCode = 'en',
): Promise<void> {
  const fetchedAt = new Date().toISOString()
  for (const item of items) {
    const keyword = item.keyword.trim().toLowerCase()
    if (!keyword) continue
    if (!isDatabaseConfigured()) {
      mem.metrics = mem.metrics.filter(
        (m) =>
          !(
            m.projectId === projectId &&
            m.keyword === keyword &&
            m.locationCode === locationCode
          ),
      )
      mem.metrics.push({
        ...item,
        keyword,
        projectId,
        locationCode,
        languageCode,
        fetchedAt,
      })
      continue
    }
    const db = getDb()
    const existing = await db
      .select({ id: seoKeywordMetrics.id })
      .from(seoKeywordMetrics)
      .where(
        and(
          eq(seoKeywordMetrics.projectId, projectId),
          eq(seoKeywordMetrics.keyword, keyword),
          eq(seoKeywordMetrics.locationCode, locationCode),
          eq(seoKeywordMetrics.languageCode, languageCode),
        ),
      )
      .limit(1)
    if (existing[0]) {
      await db
        .update(seoKeywordMetrics)
        .set({
          searchVolume: item.searchVolume,
          cpc: item.cpc,
          competition: item.competition,
          keywordDifficulty: item.difficulty ?? null,
          intent: item.intent ?? null,
          fetchedAt,
        })
        .where(eq(seoKeywordMetrics.id, existing[0].id))
    } else {
      await db.insert(seoKeywordMetrics).values({
        id: randomUUID(),
        projectId,
        keyword,
        locationCode,
        languageCode,
        searchVolume: item.searchVolume,
        cpc: item.cpc,
        competition: item.competition,
        keywordDifficulty: item.difficulty ?? null,
        intent: item.intent ?? null,
        fetchedAt,
      })
    }
  }
}

export async function insertDomainSnapshot(
  snap: Omit<SeoDomainSnapshot, 'id' | 'capturedAt'> & { capturedAt?: string },
): Promise<SeoDomainSnapshot> {
  const row: SeoDomainSnapshot = {
    ...snap,
    id: randomUUID(),
    capturedAt: snap.capturedAt ?? new Date().toISOString(),
  }
  if (!isDatabaseConfigured()) {
    mem.domainSnaps.unshift(row)
    return row
  }
  const db = getDb()
  await db.insert(seoDomainSnapshots).values({
    id: row.id,
    projectId: row.projectId,
    domain: row.domain,
    organicKeywords: row.organicKeywords,
    organicTraffic: row.organicTraffic,
    organicCost: row.organicCost,
    topKeywords: row.topKeywords as unknown as Array<Record<string, unknown>>,
    source: row.source,
    stubbed: row.stubbed ? 1 : 0,
    capturedAt: row.capturedAt,
  })
  return row
}

export async function latestDomainSnapshot(
  projectId: string,
): Promise<SeoDomainSnapshot | null> {
  if (!isDatabaseConfigured()) {
    return mem.domainSnaps.find((s) => s.projectId === projectId) ?? null
  }
  const db = getDb()
  const rows = await db
    .select()
    .from(seoDomainSnapshots)
    .where(eq(seoDomainSnapshots.projectId, projectId))
    .orderBy(desc(seoDomainSnapshots.capturedAt))
    .limit(1)
  const r = rows[0]
  if (!r) return null
  return {
    id: r.id,
    projectId: r.projectId,
    domain: r.domain,
    organicKeywords: r.organicKeywords,
    organicTraffic: r.organicTraffic,
    organicCost: r.organicCost,
    topKeywords: (r.topKeywords as unknown as SeoKeywordIdea[]) ?? [],
    source: r.source as SeoDomainSnapshot['source'],
    stubbed: Boolean(r.stubbed),
    fetchedAt: r.capturedAt,
    capturedAt: r.capturedAt,
  }
}

export async function insertBacklinkSnapshot(
  snap: Omit<SeoBacklinkSnapshot, 'id' | 'capturedAt'> & { capturedAt?: string },
): Promise<SeoBacklinkSnapshot> {
  const row: SeoBacklinkSnapshot = {
    ...snap,
    id: randomUUID(),
    capturedAt: snap.capturedAt ?? new Date().toISOString(),
  }
  if (!isDatabaseConfigured()) {
    mem.backlinkSnaps.unshift(row)
    return row
  }
  const db = getDb()
  await db.insert(seoBacklinkSnapshots).values({
    id: row.id,
    projectId: row.projectId,
    domain: row.domain,
    rank: row.rank,
    backlinks: row.backlinks,
    referringDomains: row.referringDomains,
    brokenBacklinks: row.brokenBacklinks ?? null,
    newBacklinks: row.newBacklinks ?? null,
    lostBacklinks: row.lostBacklinks ?? null,
    newReferringDomains: row.newReferringDomains ?? null,
    lostReferringDomains: row.lostReferringDomains ?? null,
    spamScore: row.spamScore,
    details: {
      targetSpamScore: row.targetSpamScore ?? null,
      referringPages: row.referringPages ?? null,
      referringPagesNofollow: row.referringPagesNofollow ?? null,
      referringLinksTld: row.referringLinksTld ?? [],
      referringLinksTypes: row.referringLinksTypes ?? {},
      items: row.items ?? [],
      timeseries: row.timeseries ?? [],
    },
    source: row.source,
    stubbed: row.stubbed ? 1 : 0,
    capturedAt: row.capturedAt,
  })
  return row
}

export async function listBacklinkSnapshots(
  projectId: string,
  limit = 20,
): Promise<SeoBacklinkSnapshot[]> {
  if (!isDatabaseConfigured()) {
    return mem.backlinkSnaps.filter((s) => s.projectId === projectId).slice(0, limit)
  }
  const db = getDb()
  const rows = await db
    .select()
    .from(seoBacklinkSnapshots)
    .where(eq(seoBacklinkSnapshots.projectId, projectId))
    .orderBy(desc(seoBacklinkSnapshots.capturedAt))
    .limit(limit)
  return rows.map((r) => {
    const details = (r.details ?? {}) as Record<string, unknown>
    return {
      id: r.id,
      projectId: r.projectId,
      domain: r.domain,
      referringDomains: r.referringDomains,
      backlinks: r.backlinks,
      rank: r.rank,
      spamScore: r.spamScore,
      brokenBacklinks: r.brokenBacklinks,
      newBacklinks: r.newBacklinks,
      lostBacklinks: r.lostBacklinks,
      newReferringDomains: r.newReferringDomains,
      lostReferringDomains: r.lostReferringDomains,
      targetSpamScore:
        typeof details.targetSpamScore === 'number' ? details.targetSpamScore : null,
      referringPages:
        typeof details.referringPages === 'number' ? details.referringPages : null,
      referringPagesNofollow:
        typeof details.referringPagesNofollow === 'number'
          ? details.referringPagesNofollow
          : null,
      referringLinksTld: Array.isArray(details.referringLinksTld)
        ? (details.referringLinksTld as SeoBacklinkSnapshot['referringLinksTld'])
        : [],
      referringLinksTypes:
        details.referringLinksTypes &&
        typeof details.referringLinksTypes === 'object' &&
        !Array.isArray(details.referringLinksTypes)
          ? (details.referringLinksTypes as Record<string, number>)
          : {},
      items: Array.isArray(details.items)
        ? (details.items as NonNullable<SeoBacklinkSnapshot['items']>)
        : [],
      timeseries: Array.isArray(details.timeseries)
        ? (details.timeseries as NonNullable<SeoBacklinkSnapshot['timeseries']>)
        : [],
      source: r.source as SeoBacklinkSnapshot['source'],
      stubbed: Boolean(r.stubbed),
      fetchedAt: r.capturedAt,
      capturedAt: r.capturedAt,
    }
  })
}

export async function createRankConfig(input: {
  projectId: string
  domain: string
  keywords: string[]
  schedule?: SeoRankSchedule
  locationCode?: number
  languageCode?: string
}): Promise<SeoRankConfig> {
  const now = new Date().toISOString()
  const config: SeoRankConfig = {
    id: `seo-rc-${randomUUID()}`,
    projectId: input.projectId,
    domain: normalizeDomain(input.domain),
    locationCode: input.locationCode ?? 2840,
    languageCode: input.languageCode ?? 'en',
    schedule: input.schedule ?? 'manual',
    isActive: true,
    keywords: input.keywords.map((k) => k.trim()).filter(Boolean).slice(0, 50),
    lastCheckedAt: null,
    nextCheckAt: null,
    createdAt: now,
    updatedAt: now,
    latest: [],
  }
  if (!isDatabaseConfigured()) {
    mem.configs.unshift(config)
    return config
  }
  const db = getDb()
  await db.insert(seoRankConfigs).values({
    id: config.id,
    projectId: config.projectId,
    domain: config.domain,
    locationCode: config.locationCode,
    languageCode: config.languageCode,
    schedule: config.schedule,
    isActive: 1,
    lastCheckedAt: null,
    nextCheckAt: null,
  })
  for (const keyword of config.keywords) {
    await db.insert(seoRankKeywords).values({
      id: randomUUID(),
      configId: config.id,
      keyword,
    })
  }
  return config
}

export async function listRankConfigs(projectId: string): Promise<SeoRankConfig[]> {
  if (!isDatabaseConfigured()) {
    return mem.configs.filter((c) => c.projectId === projectId)
  }
  const db = getDb()
  const configs = await db
    .select()
    .from(seoRankConfigs)
    .where(eq(seoRankConfigs.projectId, projectId))
  const out: SeoRankConfig[] = []
  for (const c of configs) {
    const kws = await db
      .select()
      .from(seoRankKeywords)
      .where(eq(seoRankKeywords.configId, c.id))
    out.push({
      id: c.id,
      projectId: c.projectId,
      domain: c.domain,
      locationCode: c.locationCode,
      languageCode: c.languageCode,
      schedule: c.schedule as SeoRankSchedule,
      isActive: Boolean(c.isActive),
      keywords: kws.map((k) => k.keyword),
      lastCheckedAt: c.lastCheckedAt,
      nextCheckAt: c.nextCheckAt,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      latest: [],
    })
  }
  return out
}

export async function getRankConfig(configId: string): Promise<SeoRankConfig | null> {
  if (!isDatabaseConfigured()) {
    return mem.configs.find((c) => c.id === configId) ?? null
  }
  const db = getDb()
  const rows = await db
    .select()
    .from(seoRankConfigs)
    .where(eq(seoRankConfigs.id, configId))
    .limit(1)
  const c = rows[0]
  if (!c) return null
  const kws = await db
    .select()
    .from(seoRankKeywords)
    .where(eq(seoRankKeywords.configId, c.id))
  const runs = await db
    .select()
    .from(seoRankRuns)
    .where(eq(seoRankRuns.configId, c.id))
    .orderBy(desc(seoRankRuns.startedAt))
    .limit(1)
  let latest: SeoRankSnapshot[] = []
  let latestRunStatus = null as SeoRankConfig['latestRunStatus']
  if (runs[0]) {
    latestRunStatus = runs[0].status as SeoRankConfig['latestRunStatus']
    const snaps = await db
      .select()
      .from(seoRankSnapshots)
      .where(eq(seoRankSnapshots.runId, runs[0].id))
    latest = snaps.map((s) => ({
      keyword: s.keyword,
      rank: s.position,
      url: s.url,
      fetchedAt: s.checkedAt,
      device: s.device as 'desktop' | 'mobile',
    }))
  }
  return {
    id: c.id,
    projectId: c.projectId,
    domain: c.domain,
    locationCode: c.locationCode,
    languageCode: c.languageCode,
    schedule: c.schedule as SeoRankSchedule,
    isActive: Boolean(c.isActive),
    keywords: kws.map((k) => k.keyword),
    lastCheckedAt: c.lastCheckedAt,
    nextCheckAt: c.nextCheckAt,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    latestRunStatus,
    latest,
  }
}

export async function completeRankRun(input: {
  configId: string
  projectId: string
  snapshots: SeoRankSnapshot[]
  schedule: SeoRankSchedule
}): Promise<void> {
  const now = new Date().toISOString()
  let nextCheckAt: string | null = null
  if (input.schedule === 'daily') {
    nextCheckAt = new Date(Date.now() + 86400000).toISOString()
  } else if (input.schedule === 'weekly') {
    nextCheckAt = new Date(Date.now() + 7 * 86400000).toISOString()
  }

  if (!isDatabaseConfigured()) {
    const cfg = mem.configs.find((c) => c.id === input.configId)
    if (cfg) {
      cfg.lastCheckedAt = now
      cfg.nextCheckAt = nextCheckAt
      cfg.latest = input.snapshots
      cfg.latestRunStatus = 'completed'
      cfg.updatedAt = now
    }
    mem.runs.unshift({
      id: randomUUID(),
      configId: input.configId,
      projectId: input.projectId,
      status: 'completed',
      snapshots: input.snapshots,
    })
    return
  }

  const db = getDb()
  const runId = randomUUID()
  const kws = await db
    .select()
    .from(seoRankKeywords)
    .where(eq(seoRankKeywords.configId, input.configId))
  await db.insert(seoRankRuns).values({
    id: runId,
    configId: input.configId,
    projectId: input.projectId,
    status: 'completed',
    keywordsTotal: input.snapshots.length,
    keywordsChecked: input.snapshots.length,
    startedAt: now,
    completedAt: now,
  })
  for (const snap of input.snapshots) {
    const tk = kws.find((k) => k.keyword === snap.keyword)
    await db.insert(seoRankSnapshots).values({
      id: randomUUID(),
      runId,
      trackingKeywordId: tk?.id ?? snap.keyword,
      keyword: snap.keyword,
      device: snap.device ?? 'desktop',
      position: snap.rank,
      url: snap.url,
      checkedAt: snap.fetchedAt,
    })
  }
  await db
    .update(seoRankConfigs)
    .set({ lastCheckedAt: now, nextCheckAt, updatedAt: new Date() })
    .where(eq(seoRankConfigs.id, input.configId))
}

export async function listDueRankConfigs(nowIso = new Date().toISOString()): Promise<SeoRankConfig[]> {
  if (!isDatabaseConfigured()) {
    return mem.configs.filter(
      (c) => c.isActive && c.nextCheckAt && c.nextCheckAt <= nowIso && c.schedule !== 'manual',
    )
  }
  const db = getDb()
  const rows = await db.select().from(seoRankConfigs).where(eq(seoRankConfigs.isActive, 1))
  const due = rows.filter(
    (r) => r.nextCheckAt && r.nextCheckAt <= nowIso && r.schedule !== 'manual',
  )
  const out: SeoRankConfig[] = []
  for (const c of due) {
    const full = await getRankConfig(c.id)
    if (full) out.push(full)
  }
  return out
}

export { normalizeDomain }
