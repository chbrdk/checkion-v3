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
  getDomainOverview,
} from '../../../../../../lib/fixtures/scan-store'
import { listDomainCorpusPages } from '../../../../../../lib/domain-corpus-pages'
import { listGeoJobs, getGeoOverview } from '../../../../../../lib/fixtures/geo-store'

const CATALOG_LIMIT = 25
const SCORE_HISTORY_LIMIT = 12
const CORPUS_PAGES_LIMIT = 50
const GEO_QUERY_RUNS_LIMIT = 80
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

  /** Wave C/D — latest completed domain overview (health + lenses). */
  let latestDomainHealth: {
    id: string
    url: string
    overallScore: number | null
    issueCount: number
    completedAt: string | null
    scores: Array<{ kind: string; label: string; value: number; max: number }>
    systemicIssues: Array<{
      id: string
      title: string
      pageCount: number
      severity: string
      ruleId: string
    }>
    performance: {
      avgTtfb: number
      avgFcp: number
      avgLcp: number
      avgDomLoad: number
      pageCount: number
    } | null
    seoCoverage: {
      totalPages: number
      withTitle: number
      withH1: number
      withMetaDescription: number
      withCanonical: number
      canonicalMismatchCount: number
      duplicateTitleGroupCount: number
    } | null
    pageSamples: Array<{
      url: string
      score: number | null
      errors: number
      warnings: number
      scanId: string
    }>
    ux: {
      score: number
      cls: number
      readabilityGrade: string
      readabilityScore: number
      brokenLinkCount: number
      tapTargetIssueCount: number
      pagesWithMultipleH1: number
      pagesWithSkippedLevels: number
      pageCount: number
    } | null
    eco: {
      avgCo2: number
      grade: string
      avgPageWeightKb: number
      pageCount: number
    } | null
    links: {
      internal: number
      external: number
      broken: number
      missingNoopener: number
      total: number
    } | null
    securityPrivacy: {
      https: boolean
      hsts: boolean
      csp: boolean
      hasPrivacyPolicy: boolean
      hasCookieBanner: boolean
      mixedContent: boolean
      xFrameOptions: boolean
      xContentTypeOptions: boolean
      referrerPolicy: boolean
      permissionsPolicy: boolean
      mixedContentCount: number
    } | null
    eeat: {
      totalPages: number
      pagesWithContact: number
      pagesWithPrivacy: number
      pagesWithImpressum: number
      pagesWithAuthorBio: number
      pagesWithArticleAuthor: number
      avgCitationsPerPage: number
      pagesWithTeam: number
      pagesWithAbout: number
      pagesWithCaseStudyMention: number
    } | null
    generative: {
      score: number
      discoverability: number
      repurposing: number
      withLlmsTxt: number
      withRobotsAllowingAi: number
      pageCount: number
      citationDensity: number
    } | null
    infra: {
      serverIp: string
      city: string
      country: string
      cdnProvider: string
      htmlLang: string
      hreflangCount: number
      platforms: string
      tracking: string
      hostingServer: string
      hostingPoweredBy: string
    } | null
    corpusPages: Array<{
      url: string
      scanId: string
      overallScore: number | null
      errors: number
      warnings: number
      resultsPath: string
    }>
  } | null = null

  if (latestDomain) {
    const overview = await getDomainOverview(latestDomain.id)
    if (overview) {
      const corpus = await listDomainCorpusPages(latestDomain.id, {
        page: 1,
        pageSize: CORPUS_PAGES_LIMIT,
        sort: 'score_asc',
      })
      latestDomainHealth = {
        id: overview.scan.id,
        url: overview.scan.rootUrl,
        overallScore: overview.scan.overallScore,
        issueCount: overview.scan.issueCount,
        completedAt: overview.scan.completedAt,
        scores: (overview.scores ?? []).map((s) => ({
          kind: s.kind,
          label: s.label,
          value: s.value,
          max: s.max,
        })),
        systemicIssues: (overview.systemicIssues ?? []).slice(0, 40).map((i) => ({
          id: i.id,
          title: i.title,
          pageCount: i.pageCount,
          severity: i.severity ?? '',
          ruleId: i.ruleId ?? '',
        })),
        performance: overview.performance
          ? {
              avgTtfb: overview.performance.avgTtfb,
              avgFcp: overview.performance.avgFcp,
              avgLcp: overview.performance.avgLcp,
              avgDomLoad: overview.performance.avgDomLoad,
              pageCount: overview.performance.pageCount,
            }
          : null,
        seoCoverage: overview.seoCoverage
          ? {
              totalPages: overview.seoCoverage.totalPages,
              withTitle: overview.seoCoverage.withTitle,
              withH1: overview.seoCoverage.withH1,
              withMetaDescription: overview.seoCoverage.withMetaDescription,
              withCanonical: overview.seoCoverage.withCanonical,
              canonicalMismatchCount: overview.seoCoverage.canonicalMismatchCount,
              duplicateTitleGroupCount: overview.seoCoverage.duplicateTitleGroupCount,
            }
          : null,
        pageSamples: (overview.pageSamples ?? []).slice(0, 25).map((p) => ({
          url: p.url,
          score: p.score,
          errors: p.errors ?? 0,
          warnings: p.warnings ?? 0,
          scanId: p.scanId ?? '',
        })),
        ux: overview.ux
          ? {
              score: overview.ux.score,
              cls: overview.ux.cls,
              readabilityGrade: overview.ux.readabilityGrade,
              readabilityScore: overview.ux.readabilityScore,
              brokenLinkCount: overview.ux.brokenLinkCount,
              tapTargetIssueCount: overview.ux.tapTargetIssueCount,
              pagesWithMultipleH1: overview.ux.pagesWithMultipleH1,
              pagesWithSkippedLevels: overview.ux.pagesWithSkippedLevels,
              pageCount: overview.ux.pageCount,
            }
          : null,
        eco: overview.eco
          ? {
              avgCo2: overview.eco.avgCo2,
              grade: overview.eco.grade,
              avgPageWeightKb: overview.eco.avgPageWeightKb,
              pageCount: overview.eco.pageCount,
            }
          : null,
        links: overview.links
          ? {
              internal: overview.links.internal,
              external: overview.links.external,
              broken: overview.links.broken,
              missingNoopener: overview.links.missingNoopener,
              total: overview.links.total ?? overview.links.internal + overview.links.external,
            }
          : null,
        securityPrivacy: overview.securityPrivacy
          ? {
              https: overview.securityPrivacy.https,
              hsts: overview.securityPrivacy.hsts,
              csp: overview.securityPrivacy.csp,
              hasPrivacyPolicy: overview.securityPrivacy.hasPrivacyPolicy,
              hasCookieBanner: overview.securityPrivacy.hasCookieBanner,
              mixedContent: overview.securityPrivacy.mixedContent,
              xFrameOptions: Boolean(overview.securityPrivacy.xFrameOptions),
              xContentTypeOptions: Boolean(overview.securityPrivacy.xContentTypeOptions),
              referrerPolicy: Boolean(overview.securityPrivacy.referrerPolicy),
              permissionsPolicy: Boolean(overview.securityPrivacy.permissionsPolicy),
              mixedContentCount: overview.securityPrivacy.mixedContentCount ?? 0,
            }
          : null,
        eeat: overview.eeat
          ? {
              totalPages: overview.eeat.totalPages,
              pagesWithContact: overview.eeat.trust.pagesWithContact,
              pagesWithPrivacy: overview.eeat.trust.pagesWithPrivacy,
              pagesWithImpressum: overview.eeat.trust.pagesWithImpressum,
              pagesWithAuthorBio: overview.eeat.expertise.pagesWithAuthorBio,
              pagesWithArticleAuthor: overview.eeat.expertise.pagesWithArticleAuthor,
              avgCitationsPerPage: overview.eeat.expertise.avgCitationsPerPage,
              pagesWithTeam: overview.eeat.experience.pagesWithTeam,
              pagesWithAbout: overview.eeat.experience.pagesWithAbout,
              pagesWithCaseStudyMention: overview.eeat.experience.pagesWithCaseStudyMention,
            }
          : null,
        generative: overview.generative
          ? {
              score: overview.generative.score,
              discoverability: overview.generative.discoverability,
              repurposing: overview.generative.repurposing,
              withLlmsTxt: overview.generative.withLlmsTxt,
              withRobotsAllowingAi: overview.generative.withRobotsAllowingAi ?? 0,
              pageCount: overview.generative.pageCount,
              citationDensity: overview.generative.citationDensity ?? 0,
            }
          : null,
        infra: overview.infra
          ? {
              serverIp: overview.infra.serverIp ?? '',
              city: overview.infra.city ?? '',
              country: overview.infra.country ?? '',
              cdnProvider: overview.infra.cdnProvider ?? '',
              htmlLang: overview.infra.htmlLang ?? '',
              hreflangCount: overview.infra.hreflangCount ?? 0,
              platforms: (overview.infra.platforms ?? []).join('|'),
              tracking: (overview.infra.tracking ?? []).join('|'),
              hostingServer: overview.infra.hostingServer ?? '',
              hostingPoweredBy: overview.infra.hostingPoweredBy ?? '',
            }
          : null,
        corpusPages: (corpus?.items ?? []).slice(0, CORPUS_PAGES_LIMIT).map((p) => ({
          url: p.url,
          scanId: p.scanId,
          overallScore: p.overallScore,
          errors: p.errors,
          warnings: p.warnings,
          resultsPath: p.resultsPath,
        })),
      }
    }
  }

  /** Wave C/D — latest completed GEO overview (EEAT / SoV / presence / insights). */
  const completedGeo = geoJobs
    .filter((j) => j.status === 'completed')
    .sort((a, b) => activityTime(b.completedAt) - activityTime(a.completedAt))
  const latestGeo = completedGeo[0] ?? null

  let latestGeoDepth: {
    id: string
    title: string
    url: string
    score: number | null
    citedShare: number
    completedAt: string | null
    measurement: string
    eeat: {
      experience: number
      expertise: number
      authoritativeness: number
      trustworthiness: number
      geoFitness: number
    } | null
    shareOfVoice: Array<{
      domain: string
      shareOfVoice: number
      avgPosition: number
      mentionCount: number
      isTarget: boolean
    }>
    recommendations: Array<{
      id: string
      title: string
      severity: string
      source: string
    }>
    presence: {
      cellCount: number
      hitCount: number
      citedShare: number
      missRate: number
      avgPosition: number | null
      firstCiteRate: number | null
      mentionedShare: number | null
      rivalCount: number
      rivalSource: string
      leaderDomain: string | null
      gapToLead: number | null
      byModel: Array<{
        modelId: string
        cellCount: number
        hitCount: number
        hitRate: number
      }>
      byQuery: Array<{
        query: string
        cellCount: number
        hitCount: number
        hitRate: number
      }>
    } | null
    insights: {
      missVsRival: Array<{
        query: string
        modelId: string
        rivalDomain: string
        rivalPosition: number
        otherRivals: string
      }>
      promptDuels: Array<{
        query: string
        outcome: string
        targetHitRate: number
        targetAvgPosition: number | null
        leaderDomain: string | null
        intent: string
      }>
      intents: Array<{
        query: string
        intent: string
        source: string
      }>
    } | null
    queryRuns: Array<{
      queryId: string
      query: string
      modelId: string
      ourPosition: number | null
      citationCount: number
    }>
    positionCells: Array<{
      queryIndex: number
      queryLabel: string
      queryText: string
      modelId: string
      position: number
    }>
  } | null = null

  if (latestGeo) {
    const overview = await getGeoOverview(latestGeo.id)
    if (overview) {
      const solo = overview.presence?.solo
      const field = overview.presence?.field ?? null
      const positionCells: Array<{
        queryIndex: number
        queryLabel: string
        queryText: string
        modelId: string
        position: number
      }> = []
      for (const row of overview.positionMatrix ?? []) {
        for (const [modelId, position] of Object.entries(row.positions ?? {})) {
          positionCells.push({
            queryIndex: row.queryIndex,
            queryLabel: row.queryLabel,
            queryText: row.queryText,
            modelId,
            position,
          })
        }
      }
      latestGeoDepth = {
        id: overview.job.id,
        title: overview.job.title,
        url: overview.job.url,
        score: overview.job.overallScore,
        citedShare: overview.job.citedShare,
        completedAt: overview.job.completedAt,
        measurement: overview.job.measurement ?? 'recall',
        eeat: overview.eeat
          ? {
              experience: overview.eeat.experience,
              expertise: overview.eeat.expertise,
              authoritativeness: overview.eeat.authoritativeness,
              trustworthiness: overview.eeat.trustworthiness,
              geoFitness: overview.eeat.geoFitness,
            }
          : null,
        shareOfVoice: (overview.shareOfVoice ?? []).slice(0, 20).map((r) => ({
          domain: r.domain,
          shareOfVoice: r.shareOfVoice,
          avgPosition: r.avgPosition,
          mentionCount: r.mentionCount,
          isTarget: Boolean(r.isTarget),
        })),
        recommendations: (overview.recommendations ?? []).slice(0, 20).map((r) => ({
          id: r.id,
          title: r.title,
          severity: r.severity,
          source: r.source ?? '',
        })),
        presence: solo
          ? {
              cellCount: solo.cellCount,
              hitCount: solo.hitCount,
              citedShare: solo.citedShare,
              missRate: solo.missRate,
              avgPosition: solo.avgPosition,
              firstCiteRate: solo.firstCiteRate,
              mentionedShare: solo.mentionedShare ?? null,
              rivalCount: overview.presence?.rivals?.length ?? 0,
              rivalSource: overview.presence?.rivalSource ?? 'none',
              leaderDomain: field?.leaderDomain ?? null,
              gapToLead: field?.gapToLead ?? null,
              byModel: (solo.byModel ?? []).slice(0, 20).map((m) => ({
                modelId: m.modelId,
                cellCount: m.cellCount,
                hitCount: m.hitCount,
                hitRate: m.hitRate,
              })),
              byQuery: (solo.byQuery ?? []).slice(0, 40).map((q) => ({
                query: q.query,
                cellCount: q.cellCount,
                hitCount: q.hitCount,
                hitRate: q.hitRate,
              })),
            }
          : null,
        insights: overview.insights
          ? {
              missVsRival: (overview.insights.missVsRival ?? []).slice(0, 8).map((m) => ({
                query: m.query,
                modelId: m.modelId,
                rivalDomain: m.rivalDomain,
                rivalPosition: m.rivalPosition,
                otherRivals: (m.otherRivals ?? []).join('|'),
              })),
              promptDuels: (overview.insights.promptDuels ?? []).slice(0, 20).map((d) => ({
                query: d.query,
                outcome: d.outcome,
                targetHitRate: d.targetHitRate,
                targetAvgPosition: d.targetAvgPosition,
                leaderDomain: d.leaderDomain,
                intent: d.intent,
              })),
              intents: (overview.insights.intents ?? []).slice(0, 40).map((i) => ({
                query: i.query,
                intent: i.intent,
                source: i.source,
              })),
            }
          : null,
        queryRuns: (overview.queryRuns ?? []).slice(0, GEO_QUERY_RUNS_LIMIT).map((r) => ({
          queryId: r.queryId,
          query: r.query,
          modelId: r.modelId,
          ourPosition: r.ourPosition,
          citationCount: r.citations?.length ?? 0,
        })),
        positionCells: positionCells.slice(0, 200),
      }
    }
  }

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
    latestDomainHealth,
    latestGeoDepth,
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
