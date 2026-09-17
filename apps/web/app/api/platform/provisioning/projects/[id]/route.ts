import {
  PLEXON_FEDERATION_CONTRACT_VERSION,
  isProvisioningAuthorized,
  jsonWithContract,
} from '../../../../../../lib/plexon-contract'
import { getPlexonServiceSecret } from '../../../../../../lib/runtime-config'
import {
  getProjectByPlatformId,
  upsertByPlatformProjectId,
} from '../../../../../../lib/fixtures/project-store'
import {
  listDomainScans,
  listScans,
  getScanIssues,
  getScanScores,
} from '../../../../../../lib/fixtures/scan-store'
import { listGeoJobs } from '../../../../../../lib/fixtures/geo-store'

const CATALOG_LIMIT = 25
const SCORE_HISTORY_LIMIT = 12
const PLEXON_USER_HEADER = 'X-Plexon-User-Id'

type DistillateScan = {
  id: string
  url: string
  overallScore: number | null
  issueCount: number
  completedAt: string | null
  source: 'standalone' | 'domain'
  scores: Array<{ kind: string; label: string; value: number; max: number }>
  issueRollup: Array<{ severity: string; section: string; count: number }>
  topIssues: Array<{
    id: string
    severity: string
    section: string
    title: string
    ruleId: string
    affectedCount: number
  }>
}

function activityTime(iso: string | null | undefined): number {
  return Date.parse(iso ?? '') || 0
}

async function distillateFromScanId(input: {
  id: string
  url: string
  overallScore: number | null
  issueCount: number
  completedAt: string | null
  source: 'standalone' | 'domain'
}): Promise<DistillateScan> {
  const scores = await getScanScores(input.id)
  const issues = await getScanIssues(input.id)
  const rollupMap = new Map<string, { severity: string; section: string; count: number }>()
  for (const issue of issues) {
    const key = `${issue.severity}::${issue.section}`
    const prev = rollupMap.get(key)
    if (prev) prev.count += 1
    else rollupMap.set(key, { severity: issue.severity, section: issue.section, count: 1 })
  }
  return {
    id: input.id,
    url: input.url,
    overallScore: input.overallScore,
    issueCount: input.issueCount,
    completedAt: input.completedAt,
    source: input.source,
    scores: scores.map((s) => ({
      kind: s.kind,
      label: s.label,
      value: s.value,
      max: s.max,
    })),
    issueRollup: [...rollupMap.values()].sort((a, b) => b.count - a.count),
    topIssues: issues.slice(0, 50).map((i) => ({
      id: i.id,
      severity: i.severity,
      section: i.section,
      title: i.title,
      ruleId: i.ruleId,
      affectedCount: i.affectedCount,
    })),
  }
}

/** Dashboard BFF: scan + GEO summary for a platform project mirror. */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const secret = getPlexonServiceSecret()
  if (!isProvisioningAuthorized(request, secret)) {
    return jsonWithContract({ error: 'Unauthorized' }, { status: 401 })
  }
  const plexonUserId = request.headers.get(PLEXON_USER_HEADER)?.trim()
  if (!plexonUserId) {
    return jsonWithContract({ error: `${PLEXON_USER_HEADER} required` }, { status: 400 })
  }

  const { id } = await context.params
  const platformProjectId = id?.trim()
  if (!platformProjectId) {
    return jsonWithContract({ error: 'platform project id required' }, { status: 400 })
  }

  const project = await getProjectByPlatformId(platformProjectId)
  if (!project) {
    return jsonWithContract({ error: 'Not found' }, { status: 404 })
  }

  const scans = await listScans(project.id)
  const domains = await listDomainScans(project.id)
  const geoJobs = (await listGeoJobs()).filter((j) => j.projectId === project.id)
  const standalone = scans.filter((s) => s.mode === 'single' && !s.domainScanId).slice(0, CATALOG_LIMIT)
  const domainCatalog = domains.slice(0, CATALOG_LIMIT)
  const geoCatalog = geoJobs.slice(0, CATALOG_LIMIT)
  const activitySingles = scans.filter((s) => !s.domainScanId).length

  const completedStandalone = scans
    .filter((s) => s.mode === 'single' && !s.domainScanId && s.status === 'completed')
    .sort(
      (a, b) =>
        activityTime(b.completedAt ?? b.startedAt) - activityTime(a.completedAt ?? a.startedAt),
    )

  const completedDomains = domains
    .filter((d) => d.status === 'completed')
    .sort(
      (a, b) =>
        activityTime(b.completedAt ?? b.startedAt) - activityTime(a.completedAt ?? a.startedAt),
    )

  /** Prefer newest standalone single; fall back to newest deep domain crawl. */
  let latestCompletedScan: DistillateScan | null = null
  const latestStandalone = completedStandalone[0] ?? null
  const latestDomain = completedDomains[0] ?? null

  if (latestStandalone) {
    latestCompletedScan = await distillateFromScanId({
      id: latestStandalone.id,
      url: latestStandalone.url,
      overallScore: latestStandalone.overallScore,
      issueCount: latestStandalone.issueCount,
      completedAt: latestStandalone.completedAt,
      source: 'standalone',
    })
  } else if (latestDomain) {
    latestCompletedScan = await distillateFromScanId({
      id: latestDomain.id,
      url: latestDomain.rootUrl,
      overallScore: latestDomain.overallScore,
      issueCount: latestDomain.issueCount,
      completedAt: latestDomain.completedAt,
      source: 'domain',
    })
  }

  /** Wave B — overall score trend: standalone + domain (cap). */
  const scoreHistory = [
    ...completedStandalone.map((s) => ({
      id: s.id,
      url: s.url,
      overallScore: s.overallScore,
      issueCount: s.issueCount,
      completedAt: s.completedAt,
      source: 'standalone' as const,
      at: activityTime(s.completedAt ?? s.startedAt),
    })),
    ...completedDomains.map((d) => ({
      id: d.id,
      url: d.rootUrl,
      overallScore: d.overallScore,
      issueCount: d.issueCount,
      completedAt: d.completedAt,
      source: 'domain' as const,
      at: activityTime(d.completedAt ?? d.startedAt),
    })),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, SCORE_HISTORY_LIMIT)
    .map(({ at: _at, ...row }) => row)

  return jsonWithContract({
    externalProjectId: project.id,
    platformProjectId,
    scanCount: activitySingles + domains.length + geoJobs.length,
    domainScanCount: domains.length,
    standaloneScanCount: standalone.length,
    geoJobCount: geoJobs.length,
    domainScans: domainCatalog.map((d) => ({
      id: d.id,
      domain: d.rootUrl,
      status: d.status,
      score: d.overallScore ?? 0,
      issueCount: d.issueCount ?? 0,
      timestamp: d.completedAt ?? d.startedAt,
      totalPages: d.pageCount,
    })),
    standaloneScans: standalone.map((s) => ({
      id: s.id,
      url: s.url,
      score: s.overallScore ?? 0,
      timestamp: s.completedAt ?? s.startedAt,
      status: s.status,
      issueCount: s.issueCount,
    })),
    geoJobs: geoCatalog.map((j) => ({
      id: j.id,
      title: j.title,
      url: j.url,
      status: j.status,
      score: j.overallScore ?? 0,
      timestamp: j.completedAt,
      citedShare: j.citedShare,
      queryCount: j.queryCount,
      modelCount: j.modelCount,
    })),
    scoreHistory,
    latestCompletedScan,
  })
}

/** Plexon → CHECKION project upsert. */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const secret = getPlexonServiceSecret()
  if (!isProvisioningAuthorized(request, secret)) {
    return jsonWithContract({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const platformProjectId = id?.trim()
  if (!platformProjectId) {
    return jsonWithContract({ error: 'platform project id required' }, { status: 400 })
  }

  let body: {
    platformCompanyId?: string
    name?: string
    domain?: string | null
    status?: 'active' | 'archived'
    ownerUserId?: string
    contractVersion?: string
    source?: string
    requestedAt?: string
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return jsonWithContract({ error: 'Invalid payload' }, { status: 400 })
  }

  if (body.contractVersion !== PLEXON_FEDERATION_CONTRACT_VERSION) {
    return jsonWithContract({ error: 'Unsupported contract version' }, { status: 400 })
  }
  if (!body.name?.trim() || !body.platformCompanyId?.trim() || !body.ownerUserId?.trim()) {
    return jsonWithContract(
      { error: 'name, platformCompanyId, ownerUserId required' },
      { status: 400 },
    )
  }

  const project = await upsertByPlatformProjectId(platformProjectId, {
    name: body.name,
    domain: body.domain,
    status: body.status,
    ownerPlexonUserId: body.ownerUserId,
    platformCompanyId: body.platformCompanyId,
  })

  return jsonWithContract({
    status: 'applied',
    externalProjectId: project.id,
    projectId: project.id,
    platformProjectId,
    details: 'CHECKION project mirror upserted.',
  })
}
