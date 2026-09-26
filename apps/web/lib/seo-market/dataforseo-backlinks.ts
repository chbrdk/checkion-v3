import type {
  SeoBacklinkAnchorRow,
  SeoBacklinkCompetitorRow,
  SeoBacklinkCountBucket,
  SeoBacklinkDomainPageRow,
  SeoBacklinkHistoryPoint,
  SeoBacklinkNetworkRow,
  SeoBacklinkNewLostPoint,
  SeoBacklinkReferringDomainRow,
  SeoBacklinkReferringPage,
  SeoBacklinkTargetInfo,
  SeoBacklinkTimeseriesPoint,
  SeoBacklinkTldBucket,
  SeoBacklinksResult,
} from '@checkion-v3/contracts'

type DataForSeoEnvelope = {
  status_code?: number
  status_message?: string
  tasks?: Array<{
    status_code?: number
    status_message?: string
    result?: unknown
    cost?: number
  }>
  cost?: number
}

type PostFn = (
  path: string,
  body: unknown[],
) => Promise<{ envelope: DataForSeoEnvelope; units: number }>

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function firstResult(envelope: DataForSeoEnvelope): Record<string, unknown> | null {
  const taskResult = envelope.tasks?.[0]?.result
  return Array.isArray(taskResult) ? asRecord(taskResult[0]) : null
}

function countBuckets(
  raw: Record<string, unknown> | null,
  limit = 8,
): SeoBacklinkCountBucket[] {
  if (!raw) return []
  return Object.entries(raw)
    .map(([key, count]) => ({
      key: key || '(empty)',
      count: typeof count === 'number' ? count : 0,
    }))
    .filter((b) => b.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

function tldBuckets(raw: Record<string, unknown> | null): SeoBacklinkTldBucket[] {
  return countBuckets(raw).map((b) => ({
    tld: b.key.startsWith('.') ? b.key : `.${b.key}`,
    count: b.count,
  }))
}

function weekAgoIso(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

function yearAgoIso(): string {
  const d = new Date()
  d.setUTCFullYear(d.getUTCFullYear() - 1)
  return d.toISOString().slice(0, 10)
}

/** Full Backlinks capture pack — see specs/domain/seo-dataforseo.md. */
export async function fetchLiveBacklinksPack(
  post: PostFn,
  input: { projectId: string; domain: string; limit?: number },
): Promise<{ result: SeoBacklinksResult; units: number }> {
  const domain = input.domain
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/^www\./, '')
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 50)
  const dateTo = weekAgoIso(0)
  const dateFrom = weekAgoIso(28)
  const historyFrom = yearAgoIso()

  const soft = <T>(p: Promise<T>): Promise<T | null> => p.catch(() => null)

  const targetBody = {
    target: domain,
    include_subdomains: true,
    rank_scale: 'one_hundred' as const,
  }

  // Wave 1 — summary (required).
  const summaryCall = await post('/backlinks/summary/live', [
    {
      ...targetBody,
      internal_list_limit: 12,
      backlinks_status_type: 'live',
    },
  ])

  // Wave 2 — core ledger endpoints (required; not soft-swallowed).
  const [pagesCall, anchorsCall, refDomainsCall] = await Promise.all([
    post('/backlinks/backlinks/live', [
      {
        ...targetBody,
        mode: 'as_is',
        limit,
        order_by: ['rank,desc'],
        backlinks_status_type: 'live',
      },
    ]),
    post('/backlinks/anchors/live', [
      {
        ...targetBody,
        limit: 15,
        order_by: ['backlinks,desc'],
      },
    ]),
    post('/backlinks/referring_domains/live', [
      {
        ...targetBody,
        limit: 15,
        order_by: ['rank,desc'],
      },
    ]),
  ])

  // Wave 3 — enrichment (best-effort).
  const [
    seriesCall,
    newLostCall,
    domainPagesCall,
    networksCall,
    competitorsCall,
    historyCall,
  ] = await Promise.all([
    soft(
      post('/backlinks/timeseries_summary/live', [
        {
          ...targetBody,
          date_from: dateFrom,
          date_to: dateTo,
          group_range: 'week',
        },
      ]),
    ),
    soft(
      post('/backlinks/timeseries_new_lost_summary/live', [
        {
          target: domain,
          include_subdomains: true,
          date_from: dateFrom,
          date_to: dateTo,
          group_range: 'week',
        },
      ]),
    ),
    soft(
      post('/backlinks/domain_pages_summary/live', [
        {
          ...targetBody,
          limit: 12,
          order_by: ['backlinks,desc'],
        },
      ]),
    ),
    soft(
      post('/backlinks/referring_networks/live', [
        {
          target: domain,
          limit: 10,
          network_address_type: 'subnet',
          order_by: ['backlinks,desc'],
        },
      ]),
    ),
    soft(
      post('/backlinks/competitors/live', [
        {
          ...targetBody,
          limit: 12,
          order_by: ['rank,desc'],
        },
      ]),
    ),
    soft(
      post('/backlinks/history/live', [
        {
          target: domain,
          date_from: historyFrom,
          date_to: dateTo,
        },
      ]),
    ),
  ])

  let units = summaryCall.units
  for (const c of [
    pagesCall,
    anchorsCall,
    refDomainsCall,
    seriesCall,
    newLostCall,
    domainPagesCall,
    networksCall,
    competitorsCall,
    historyCall,
  ]) {
    if (c) units += c.units
  }

  const first = firstResult(summaryCall.envelope)
  const infoRaw = first ? asRecord(first.info) : null
  const targetInfo: SeoBacklinkTargetInfo | null = infoRaw
    ? {
        server: typeof infoRaw.server === 'string' ? infoRaw.server : null,
        cms: typeof infoRaw.cms === 'string' ? infoRaw.cms : null,
        ipAddress: typeof infoRaw.ip_address === 'string' ? infoRaw.ip_address : null,
        country: typeof infoRaw.country === 'string' ? infoRaw.country : null,
        platformTypes: Array.isArray(infoRaw.platform_type)
          ? infoRaw.platform_type.map(String)
          : [],
      }
    : null

  const items: SeoBacklinkReferringPage[] = []
  if (pagesCall) {
    const pagesFirst = firstResult(pagesCall.envelope)
    const rawItems =
      pagesFirst && Array.isArray(pagesFirst.items) ? pagesFirst.items : []
    rawItems.forEach((row, i) => {
      const r = asRecord(row)
      if (!r) return
      const urlFrom = String(r.url_from ?? '')
      if (!urlFrom) return
      items.push({
        id: `bl-${i}-${urlFrom.slice(0, 40)}`,
        title: typeof r.page_from_title === 'string' ? r.page_from_title : null,
        urlFrom,
        domainFrom: String(r.domain_from ?? ''),
        domainFromRank:
          typeof r.domain_from_rank === 'number' ? r.domain_from_rank : null,
        pageFromRank:
          typeof r.page_from_rank === 'number' ? r.page_from_rank : null,
        linksCount: typeof r.links_count === 'number' ? r.links_count : null,
        anchor: typeof r.anchor === 'string' ? r.anchor : null,
        urlTo: typeof r.url_to === 'string' ? r.url_to : null,
        itemType: typeof r.item_type === 'string' ? r.item_type : null,
        dofollow: Boolean(r.dofollow),
        isNew: Boolean(r.is_new),
        isLost: Boolean(r.is_lost),
        isBroken: Boolean(r.is_broken),
        firstSeen: typeof r.first_seen === 'string' ? r.first_seen : null,
        lastSeen: typeof r.last_seen === 'string' ? r.last_seen : null,
        spamScore:
          typeof r.backlink_spam_score === 'number' ? r.backlink_spam_score : null,
        country:
          typeof r.domain_from_country === 'string' ? r.domain_from_country : null,
      })
    })
  }

  const timeseries: SeoBacklinkTimeseriesPoint[] = []
  if (seriesCall) {
    const seriesFirst = firstResult(seriesCall.envelope)
    const seriesItems =
      seriesFirst && Array.isArray(seriesFirst.items) ? seriesFirst.items : []
    for (const row of seriesItems) {
      const r = asRecord(row)
      if (!r) continue
      timeseries.push({
        date: String(r.date ?? ''),
        backlinks: typeof r.backlinks === 'number' ? r.backlinks : null,
        referringDomains:
          typeof r.referring_domains === 'number' ? r.referring_domains : null,
      })
    }
  }

  const timeseriesNewLost: SeoBacklinkNewLostPoint[] = []
  if (newLostCall) {
    const nlFirst = firstResult(newLostCall.envelope)
    const nlItems = nlFirst && Array.isArray(nlFirst.items) ? nlFirst.items : []
    for (const row of nlItems) {
      const r = asRecord(row)
      if (!r) continue
      timeseriesNewLost.push({
        date: String(r.date ?? ''),
        newBacklinks: typeof r.new_backlinks === 'number' ? r.new_backlinks : null,
        lostBacklinks: typeof r.lost_backlinks === 'number' ? r.lost_backlinks : null,
        newReferringDomains:
          typeof r.new_referring_domains === 'number'
            ? r.new_referring_domains
            : null,
        lostReferringDomains:
          typeof r.lost_referring_domains === 'number'
            ? r.lost_referring_domains
            : null,
      })
    }
  }

  const anchors: SeoBacklinkAnchorRow[] = []
  if (anchorsCall) {
    const aFirst = firstResult(anchorsCall.envelope)
    const aItems = aFirst && Array.isArray(aFirst.items) ? aFirst.items : []
    aItems.forEach((row, i) => {
      const r = asRecord(row)
      if (!r) return
      const anchor = String(r.anchor ?? '')
      if (!anchor) return
      anchors.push({
        id: `anc-${i}`,
        anchor,
        backlinks: typeof r.backlinks === 'number' ? r.backlinks : null,
        referringDomains:
          typeof r.referring_domains === 'number' ? r.referring_domains : null,
        rank: typeof r.rank === 'number' ? r.rank : null,
        firstSeen: typeof r.first_seen === 'string' ? r.first_seen : null,
      })
    })
  }

  const referringDomainsList: SeoBacklinkReferringDomainRow[] = []
  if (refDomainsCall) {
    const dFirst = firstResult(refDomainsCall.envelope)
    const dItems = dFirst && Array.isArray(dFirst.items) ? dFirst.items : []
    dItems.forEach((row, i) => {
      const r = asRecord(row)
      if (!r) return
      const host = String(r.domain ?? r.domain_from ?? '')
      if (!host) return
      referringDomainsList.push({
        id: `rd-${i}-${host}`,
        domain: host,
        rank: typeof r.rank === 'number' ? r.rank : null,
        backlinks: typeof r.backlinks === 'number' ? r.backlinks : null,
        dofollow: typeof r.dofollow === 'boolean' ? r.dofollow : null,
        firstSeen: typeof r.first_seen === 'string' ? r.first_seen : null,
        country: typeof r.country === 'string' ? r.country : null,
      })
    })
  }

  const domainPages: SeoBacklinkDomainPageRow[] = []
  if (domainPagesCall) {
    const pFirst = firstResult(domainPagesCall.envelope)
    const pItems = pFirst && Array.isArray(pFirst.items) ? pFirst.items : []
    pItems.forEach((row, i) => {
      const r = asRecord(row)
      if (!r) return
      const page = String(r.page ?? r.url ?? '')
      if (!page) return
      domainPages.push({
        id: `dp-${i}`,
        page,
        backlinks: typeof r.backlinks === 'number' ? r.backlinks : null,
        referringDomains:
          typeof r.referring_domains === 'number' ? r.referring_domains : null,
        rank: typeof r.rank === 'number' ? r.rank : null,
      })
    })
  }

  const networks: SeoBacklinkNetworkRow[] = []
  if (networksCall) {
    const nFirst = firstResult(networksCall.envelope)
    const nItems = nFirst && Array.isArray(nFirst.items) ? nFirst.items : []
    nItems.forEach((row, i) => {
      const r = asRecord(row)
      if (!r) return
      const network = String(r.network_address ?? r.address ?? '')
      if (!network) return
      networks.push({
        id: `net-${i}`,
        network,
        kind: 'subnet',
        referringDomains:
          typeof r.referring_domains === 'number' ? r.referring_domains : null,
        backlinks: typeof r.backlinks === 'number' ? r.backlinks : null,
      })
    })
  }

  const competitors: SeoBacklinkCompetitorRow[] = []
  if (competitorsCall) {
    const cFirst = firstResult(competitorsCall.envelope)
    const cItems = cFirst && Array.isArray(cFirst.items) ? cFirst.items : []
    cItems.forEach((row, i) => {
      const r = asRecord(row)
      if (!r) return
      const host = String(r.domain ?? r.target ?? '')
      if (!host) return
      competitors.push({
        id: `lc-${i}-${host}`,
        domain: host,
        intersections:
          typeof r.intersections === 'number'
            ? r.intersections
            : typeof r.avg_backlinks_info_intersections === 'number'
              ? r.avg_backlinks_info_intersections
              : null,
        rank: typeof r.rank === 'number' ? r.rank : null,
        backlinks: typeof r.backlinks === 'number' ? r.backlinks : null,
      })
    })
  }

  const history: SeoBacklinkHistoryPoint[] = []
  if (historyCall) {
    const hFirst = firstResult(historyCall.envelope)
    const hItems = hFirst && Array.isArray(hFirst.items) ? hFirst.items : []
    for (const row of hItems) {
      const r = asRecord(row)
      if (!r) continue
      history.push({
        date: String(r.date ?? ''),
        rank: typeof r.rank === 'number' ? r.rank : null,
        backlinks: typeof r.backlinks === 'number' ? r.backlinks : null,
        referringDomains:
          typeof r.referring_domains === 'number' ? r.referring_domains : null,
        newBacklinks: typeof r.new_backlinks === 'number' ? r.new_backlinks : null,
        lostBacklinks: typeof r.lost_backlinks === 'number' ? r.lost_backlinks : null,
        newReferringDomains:
          typeof r.new_referring_domains === 'number'
            ? r.new_referring_domains
            : null,
        lostReferringDomains:
          typeof r.lost_referring_domains === 'number'
            ? r.lost_referring_domains
            : null,
      })
    }
  }

  let newBacklinks: number | null = null
  let lostBacklinks: number | null = null
  let newReferringDomains: number | null = null
  let lostReferringDomains: number | null = null
  const lastNl = timeseriesNewLost[timeseriesNewLost.length - 1]
  if (lastNl) {
    newBacklinks = lastNl.newBacklinks
    lostBacklinks = lastNl.lostBacklinks
    newReferringDomains = lastNl.newReferringDomains
    lostReferringDomains = lastNl.lostReferringDomains
  } else if (timeseries.length >= 2) {
    const prev = timeseries[timeseries.length - 2]!
    const cur = timeseries[timeseries.length - 1]!
    if (prev.backlinks != null && cur.backlinks != null) {
      const delta = cur.backlinks - prev.backlinks
      if (delta >= 0) newBacklinks = delta
      else lostBacklinks = Math.abs(delta)
    }
    if (prev.referringDomains != null && cur.referringDomains != null) {
      const delta = cur.referringDomains - prev.referringDomains
      if (delta >= 0) newReferringDomains = delta
      else lostReferringDomains = Math.abs(delta)
    }
  }

  const typesRaw = first ? asRecord(first.referring_links_types) : null
  const referringLinksTypes: Record<string, number> = {}
  if (typesRaw) {
    for (const [k, v] of Object.entries(typesRaw)) {
      if (typeof v === 'number') referringLinksTypes[k] = v
    }
  }

  return {
    units,
    result: {
      source: 'dataforseo',
      stubbed: false,
      fetchedAt: new Date().toISOString(),
      projectId: input.projectId,
      domain,
      referringDomains:
        first && typeof first.referring_domains === 'number'
          ? first.referring_domains
          : null,
      backlinks: first && typeof first.backlinks === 'number' ? first.backlinks : null,
      rank: first && typeof first.rank === 'number' ? first.rank : null,
      spamScore:
        first && typeof first.backlinks_spam_score === 'number'
          ? first.backlinks_spam_score
          : null,
      targetSpamScore:
        infoRaw && typeof infoRaw.target_spam_score === 'number'
          ? infoRaw.target_spam_score
          : null,
      brokenBacklinks:
        first && typeof first.broken_backlinks === 'number'
          ? first.broken_backlinks
          : null,
      brokenPages:
        first && typeof first.broken_pages === 'number' ? first.broken_pages : null,
      referringPages:
        first && typeof first.referring_pages === 'number'
          ? first.referring_pages
          : null,
      referringPagesNofollow:
        first && typeof first.referring_pages_nofollow === 'number'
          ? first.referring_pages_nofollow
          : null,
      referringMainDomains:
        first && typeof first.referring_main_domains === 'number'
          ? first.referring_main_domains
          : null,
      referringIps:
        first && typeof first.referring_ips === 'number' ? first.referring_ips : null,
      referringSubnets:
        first && typeof first.referring_subnets === 'number'
          ? first.referring_subnets
          : null,
      crawledPages:
        first && typeof first.crawled_pages === 'number' ? first.crawled_pages : null,
      newBacklinks,
      lostBacklinks,
      newReferringDomains,
      lostReferringDomains,
      referringLinksTld: tldBuckets(
        first ? asRecord(first.referring_links_tld) : null,
      ),
      referringLinksTypes,
      referringLinksAttributes: countBuckets(
        first ? asRecord(first.referring_links_attributes) : null,
      ),
      referringLinksPlatforms: countBuckets(
        first ? asRecord(first.referring_links_platform_types) : null,
      ),
      referringLinksLocations: countBuckets(
        first ? asRecord(first.referring_links_semantic_locations) : null,
      ),
      referringLinksCountries: countBuckets(
        first ? asRecord(first.referring_links_countries) : null,
      ),
      targetInfo,
      items,
      timeseries,
      timeseriesNewLost,
      anchors,
      referringDomainsList,
      domainPages,
      networks,
      competitors,
      history,
    },
  }
}
