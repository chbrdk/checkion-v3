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
import { listDomainScans, listScans } from '../../../../../../lib/fixtures/scan-store'
import { listGeoJobs } from '../../../../../../lib/fixtures/geo-store'

const CATALOG_LIMIT = 25
const PLEXON_USER_HEADER = 'X-Plexon-User-Id'

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
  const standalone = scans.filter((s) => s.mode === 'single').slice(0, CATALOG_LIMIT)
  const domainCatalog = domains.slice(0, CATALOG_LIMIT)
  const geoCatalog = geoJobs.slice(0, CATALOG_LIMIT)

  return jsonWithContract({
    externalProjectId: project.id,
    platformProjectId,
    scanCount: scans.length + domains.length,
    domainScanCount: domains.length,
    standaloneScanCount: standalone.length,
    geoJobCount: geoJobs.length,
    domainScans: domainCatalog.map((d) => ({
      id: d.id,
      domain: d.rootUrl,
      status: d.status,
      score: d.overallScore ?? 0,
      timestamp: d.completedAt ?? d.startedAt,
      totalPages: d.pageCount,
    })),
    standaloneScans: standalone.map((s) => ({
      id: s.id,
      url: s.url,
      score: s.overallScore ?? 0,
      timestamp: s.completedAt ?? s.startedAt,
    })),
    geoJobs: geoCatalog.map((j) => ({
      id: j.id,
      title: j.title,
      url: j.url,
      status: j.status,
      score: j.overallScore ?? 0,
      timestamp: j.completedAt,
      citedShare: j.citedShare,
    })),
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
