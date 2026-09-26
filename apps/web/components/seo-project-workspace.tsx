'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Alert,
  Button,
  SectionChrome,
  Text,
} from '@msqdx/ui'
import type {
  SeoBacklinkSnapshot,
  SeoChapterViewModel,
  SeoCompetitorsResult,
  SeoDashboardViewModel,
  SeoDomainSnapshot,
  SeoFieldSuggestResult,
  SeoKeywordIdea,
  SeoProjectOverview,
  SeoRankConfig,
  SeoSavedKeywordRow,
  SeoSerpResult,
} from '@checkion-v3/contracts'
import { paths, type SeoProjectChapter } from '../lib/paths'
import { emptySeoDashboard } from '../lib/seo-market/dashboard-fixtures'
import { buildSeoDashboardFromOverview } from '../lib/seo-market/dashboard-from-overview'
import { emptySeoChapter } from '../lib/seo-market/chapter-fixtures'
import { buildKeywordsChapterModel } from '../lib/seo-market/keywords-chapter-map'
import { buildDomainChapterModel } from '../lib/seo-market/domain-chapter-map'
import { buildRankChapterModel } from '../lib/seo-market/rank-chapter-map'
import { buildCompetitorsChapterModel } from '../lib/seo-market/competitors-chapter-map'
import { buildBacklinksChapterModel } from '../lib/seo-market/backlinks-chapter-map'
import { brandSeedFromHost, isJunkKeywordToken } from '../lib/seo-market/host-utils'
import { sanitizeSuggestKeywords } from '../lib/seo-market/field-suggest'
import {
  parseSuggestBriefPayload,
  type SuggestBriefView,
} from '../lib/seo-market/suggest-brief-ui'
import { useT } from '../lib/user-prefs'
import { useJobNotifications } from './job-notification-center'
import { SeoDashboardView } from './seo-dashboard-view'
import { SeoChapterView, type SeoChapterSearchQuery } from './seo-chapter-view'
import { SeoChapterNav } from './seo-chapter-nav'
import { SeoSuggestBriefPanel } from './seo-suggest-brief-panel'

const LOCATION_CODES: Record<string, number> = {
  germany: 2276,
  deutschland: 2276,
  'united states': 2840,
  usa: 2840,
  us: 2840,
  austria: 2040,
  österreich: 2040,
  switzerland: 2256,
  schweiz: 2256,
}

function locationCodeFor(location: string): number {
  return LOCATION_CODES[location.trim().toLowerCase()] ?? 2276
}

export function SeoProjectWorkspace({
  projectId,
  projectName,
  domain,
  chapter,
}: {
  projectId: string
  projectName: string
  domain: string
  chapter: SeoProjectChapter
}) {
  const t = useT()
  const searchParams = useSearchParams()
  const { trackJob } = useJobNotifications()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<SeoSavedKeywordRow[]>([])
  const [dashModel, setDashModel] = useState<SeoDashboardViewModel>(() =>
    emptySeoDashboard({ projectId, projectName, domain, t }),
  )
  const [fieldAnalyzed, setFieldAnalyzed] = useState(false)
  const [kwModel, setKwModel] = useState<SeoChapterViewModel>(() =>
    emptySeoChapter('keywords', { projectId, projectName, domain }),
  )
  const [domainModel, setDomainModel] = useState<SeoChapterViewModel>(() =>
    emptySeoChapter('domain', { projectId, projectName, domain }),
  )
  const [rankModel, setRankModel] = useState<SeoChapterViewModel>(() =>
    emptySeoChapter('rank-tracking', { projectId, projectName, domain }),
  )
  const [compModel, setCompModel] = useState<SeoChapterViewModel>(() =>
    emptySeoChapter('competitors', { projectId, projectName, domain }),
  )
  const [backlinksModel, setBacklinksModel] = useState<SeoChapterViewModel>(() =>
    emptySeoChapter('backlinks', { projectId, projectName, domain }),
  )
  const [backlinks, setBacklinks] = useState<SeoBacklinkSnapshot[]>([])
  const [configs, setConfigs] = useState<SeoRankConfig[]>([])
  const [gscNote, setGscNote] = useState<string | null>(null)
  const [suggestBrief, setSuggestBrief] = useState<SuggestBriefView | null>(null)

  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      setBusy(true)
      setError(null)
      try {
        const res = await fetch(path, {
          ...init,
          headers: {
            ...(init?.body ? { 'content-type': 'application/json' } : {}),
            ...init?.headers,
          },
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.detail || data.error || `HTTP ${res.status}`)
        }
        return data
      } catch (e) {
        setError(e instanceof Error ? e.message : 'request failed')
        return null
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  useEffect(() => {
    setKwModel(emptySeoChapter('keywords', { projectId, projectName, domain }, t))
    setDomainModel(emptySeoChapter('domain', { projectId, projectName, domain }, t))
    setRankModel(emptySeoChapter('rank-tracking', { projectId, projectName, domain }, t))
    setCompModel(emptySeoChapter('competitors', { projectId, projectName, domain }, t))
    setBacklinksModel(emptySeoChapter('backlinks', { projectId, projectName, domain }, t))
  }, [projectId, projectName, domain, t])

  const runKeywordSearch = useCallback(
    async (query: SeoChapterSearchQuery) => {
      setBusy(true)
      setError(null)
      const seedRaw = query.seed.trim()
      const seed =
        !seedRaw || seedRaw.toLowerCase() === 'www'
          ? brandSeedFromHost(domain)
          : seedRaw
      if (!seed || seed.toLowerCase() === 'www') {
        setError(t('seoMarket.workspace.seedWwwError'))
        setBusy(false)
        return
      }
      const locationCode = locationCodeFor(query.location)
      const languageCode = query.locale || 'de'
      try {
        const [researchRes, serpRes] = await Promise.all([
          fetch(paths.routes.apiProjectSeoKeywords(projectId), {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              action: 'research',
              seed,
              save: true,
              limit: 40,
            }),
          }),
          fetch(paths.routes.apiSeoMarketSerp, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              projectId,
              keyword: seed,
              locationCode,
              languageCode,
            }),
          }),
        ])
        const researchData = (await researchRes.json()) as {
          ideas?: SeoKeywordIdea[]
          keywords?: SeoSavedKeywordRow[]
          detail?: string
          error?: string
        }
        const serpData = (await serpRes.json()) as SeoSerpResult & {
          detail?: string
          error?: string
        }
        if (!researchRes.ok) {
          throw new Error(researchData.detail || researchData.error || `HTTP ${researchRes.status}`)
        }
        if (!serpRes.ok) {
          throw new Error(serpData.detail || serpData.error || `HTTP ${serpRes.status}`)
        }
        const ideas = researchData.ideas ?? []
        if (researchData.keywords) setSaved(researchData.keywords)
        const prevRecent = kwModel.searchBand?.recent ?? []
        const recent = [
          seed,
          ...prevRecent.filter((r) => r.toLowerCase() !== seed.toLowerCase()),
        ].slice(0, 6)
        setKwModel(
          buildKeywordsChapterModel({
            projectId,
            projectName,
            domain,
            seed,
            locale: query.locale,
            location: query.location,
            recent,
            suggestions: kwModel.searchBand?.suggestions,
            ideas,
            serp: serpData,
            t,
          }),
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'request failed')
      } finally {
        setBusy(false)
      }
    },
    [domain, kwModel.searchBand?.recent, kwModel.searchBand?.suggestions, projectId, projectName, t],
  )

  const runKeywordsSuggest = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const rawHint = (kwModel.searchBand?.seed ?? '').trim()
      const seedHint = !rawHint || isJunkKeywordToken(rawHint) ? undefined : rawHint
      const res = await fetch(paths.routes.apiProjectSeoKeywordsSuggest(projectId), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          locale: kwModel.searchBand?.locale ?? 'de',
          ...(seedHint ? { seedHint } : {}),
        }),
      })
      const data = (await res.json()) as SeoFieldSuggestResult & {
        detail?: string
        error?: string
      }
      if (!res.ok) {
        throw new Error(data.detail || data.error || `HTTP ${res.status}`)
      }
      const keywords = Array.isArray(data.keywords) ? data.keywords : []
      setSuggestBrief(parseSuggestBriefPayload(data))
      setKwModel((prev) => ({
        ...prev,
        searchBand: {
          seed: prev.searchBand?.seed ?? brandSeedFromHost(domain),
          locale: prev.searchBand?.locale ?? 'de',
          location: prev.searchBand?.location ?? t('seoMarket.locations.germany'),
          seedLabel: prev.searchBand?.seedLabel,
          actionLabel: prev.searchBand?.actionLabel,
          recent: prev.searchBand?.recent,
          locales: prev.searchBand?.locales,
          suggestions: keywords,
          suggestionsLabel: t('seoMarket.search.suggestions'),
          suggestionsMode: 'pick-one',
        },
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed')
    } finally {
      setBusy(false)
    }
  }, [domain, kwModel.searchBand?.locale, kwModel.searchBand?.seed, projectId, t])

  const runDomainRefresh = useCallback(
    async (query: SeoChapterSearchQuery) => {
      setBusy(true)
      setError(null)
      try {
        const res = await fetch(paths.routes.apiProjectSeoDomain(projectId), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'refresh' }),
        })
        const data = (await res.json()) as SeoDomainSnapshot & {
          detail?: string
          error?: string
        }
        if (!res.ok) {
          throw new Error(data.detail || data.error || `HTTP ${res.status}`)
        }
        const host = query.seed.trim() || domain
        const prevRecent = domainModel.searchBand?.recent ?? []
        const recent = [
          host,
          ...prevRecent.filter((r) => r.toLowerCase() !== host.toLowerCase()),
        ].slice(0, 6)
        setDomainModel(
          buildDomainChapterModel({
            projectId,
            projectName,
            domain,
            seed: host,
            locale: query.locale,
            location: query.location,
            recent,
            snapshot: data,
            t,
          }),
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'request failed')
      } finally {
        setBusy(false)
      }
    },
    [domain, domainModel.searchBand?.recent, projectId, projectName, t],
  )

  const applyBacklinksHistory = useCallback(
    (history: SeoBacklinkSnapshot[], seed?: string, query?: SeoChapterSearchQuery) => {
      setBacklinks(history)
      setBacklinksModel(
        buildBacklinksChapterModel({
          projectId,
          projectName,
          domain,
          seed: seed || domain,
          locale: query?.locale,
          location: query?.location,
          recent: history
            .map((h) => h.domain)
            .filter((d, i, arr) => arr.indexOf(d) === i)
            .slice(0, 6),
          history,
          snapshot: history[0] ?? null,
          t,
        }),
      )
    },
    [domain, projectId, projectName, t],
  )

  const runBacklinksRefresh = useCallback(
    async (query: SeoChapterSearchQuery) => {
      setBusy(true)
      setError(null)
      try {
        const res = await fetch(paths.routes.apiProjectSeoBacklinks(projectId), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'refresh' }),
        })
        const data = (await res.json()) as SeoBacklinkSnapshot & {
          detail?: string
          error?: string
        }
        if (!res.ok) {
          throw new Error(data.detail || data.error || `HTTP ${res.status}`)
        }
        const host = query.seed.trim() || domain
        const next = [data, ...backlinks.filter((b) => b.id !== data.id)].slice(0, 20)
        applyBacklinksHistory(next, host, query)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'request failed')
      } finally {
        setBusy(false)
      }
    },
    [applyBacklinksHistory, backlinks, domain, projectId],
  )

    const runRankTrack = useCallback(
    async (query: SeoChapterSearchQuery) => {
      setBusy(true)
      setError(null)
      try {
        const added = query.seed
          .split(/[,;]+/)
          .map((k) => k.trim())
          .filter(Boolean)
        if (!added.length) return
        const existing = configs[0]
        const keywords = existing
          ? Array.from(new Set([...existing.keywords, ...added])).slice(0, 50)
          : added.slice(0, 50)
        let config: SeoRankConfig | null = null
        if (existing) {
          // Re-create path: POST new config with merged keywords, then refresh
          const created = await fetch(paths.routes.apiProjectSeoRankConfigs(projectId), {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ keywords, schedule: existing.schedule || 'weekly' }),
          })
          const createdData = (await created.json()) as SeoRankConfig & {
            detail?: string
            error?: string
          }
          if (!created.ok) {
            throw new Error(createdData.detail || createdData.error || `HTTP ${created.status}`)
          }
          config = createdData
        } else {
          const created = await fetch(paths.routes.apiProjectSeoRankConfigs(projectId), {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ keywords, schedule: 'weekly' }),
          })
          const createdData = (await created.json()) as SeoRankConfig & {
            detail?: string
            error?: string
          }
          if (!created.ok) {
            throw new Error(createdData.detail || createdData.error || `HTTP ${created.status}`)
          }
          config = createdData
        }
        trackJob({
          id: `seo-rank-${config.id}-${Date.now()}`,
          resource: 'seo-market',
          status: 'running',
          title: 'Rank refresh',
          href: paths.routes.projectSeo(projectId, 'rank-tracking'),
          projectId,
          detail: config.domain,
        })
        const refreshed = await fetch(
          paths.routes.apiProjectSeoRankConfigRefresh(projectId, config.id),
          { method: 'POST' },
        )
        const refreshedData = (await refreshed.json()) as SeoRankConfig & {
          detail?: string
          error?: string
        }
        if (!refreshed.ok) {
          throw new Error(
            refreshedData.detail || refreshedData.error || `HTTP ${refreshed.status}`,
          )
        }
        config = refreshedData
        setConfigs((prev) => {
          const rest = prev.filter((c) => c.id !== config!.id)
          return [config!, ...rest]
        })
        trackJob({
          id: `seo-rank-${config.id}-done`,
          resource: 'seo-market',
          status: 'completed',
          title: 'Rank refresh done',
          href: paths.routes.projectSeo(projectId, 'rank-tracking'),
          projectId,
          detail: config.domain,
        })
        const prevRecent = rankModel.searchBand?.recent ?? []
        const seedLabel = added.join(', ')
        const recent = [
          seedLabel,
          ...prevRecent.filter((r) => r.toLowerCase() !== seedLabel.toLowerCase()),
        ].slice(0, 6)
        setRankModel(
          buildRankChapterModel({
            projectId,
            projectName,
            domain,
            seed: seedLabel,
            locale: query.locale,
            location: query.location,
            recent,
            suggestions: rankModel.searchBand?.suggestions,
            config,
            t,
          }),
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'request failed')
      } finally {
        setBusy(false)
      }
    },
    [configs, domain, projectId, projectName, rankModel.searchBand?.recent, trackJob, t],
  )

  const runRankTrackSetSuggest = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const rawHint = (rankModel.searchBand?.seed ?? '').trim()
      const seedHint = !rawHint || isJunkKeywordToken(rawHint) ? undefined : rawHint
      const res = await fetch(paths.routes.apiProjectSeoRankConfigsSuggest(projectId), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          locale: rankModel.searchBand?.locale ?? 'de',
          ...(seedHint ? { seedHint } : {}),
        }),
      })
      const data = (await res.json()) as SeoFieldSuggestResult & {
        detail?: string
        error?: string
      }
      if (!res.ok) {
        throw new Error(data.detail || data.error || `HTTP ${res.status}`)
      }
      const keywords = sanitizeSuggestKeywords(
        Array.isArray(data.keywords) ? data.keywords : [],
        domain,
        'ranks',
        8,
      )
      if (!keywords.length) {
        throw new Error('No usable suggestions')
      }
      setSuggestBrief(parseSuggestBriefPayload(data))
      setRankModel((prev) => ({
        ...prev,
        searchBand: {
          seed: prev.searchBand?.seed ?? '',
          locale: prev.searchBand?.locale ?? 'de',
          location: prev.searchBand?.location ?? t('seoMarket.locations.germany'),
          seedLabel: prev.searchBand?.seedLabel,
          actionLabel: prev.searchBand?.actionLabel,
          recent: prev.searchBand?.recent,
          locales: prev.searchBand?.locales,
          suggestions: keywords,
          suggestionsLabel: t('seoMarket.search.suggestions'),
          suggestionsMode: 'toggle-set',
        },
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed')
    } finally {
      setBusy(false)
    }
  }, [domain, projectId, rankModel.searchBand?.locale, rankModel.searchBand?.seed, t])

  const runCompetitorsAnalyze = useCallback(
    async (query: SeoChapterSearchQuery) => {
      setBusy(true)
      setError(null)
      try {
        const keywords = query.seed
          .split(/[,;]+/)
          .map((k) => k.trim())
          .filter(Boolean)
        const res = await fetch(paths.routes.apiProjectSeoCompetitors(projectId), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ keywords }),
        })
        const data = (await res.json()) as SeoCompetitorsResult & {
          detail?: string
          error?: string
        }
        if (!res.ok) {
          throw new Error(data.detail || data.error || `HTTP ${res.status}`)
        }
        const seed = query.seed.trim() || keywords.slice(0, 3).join(', ')
        const prevRecent = compModel.searchBand?.recent ?? []
        const recent = seed
          ? [
              seed,
              ...prevRecent.filter((r) => r.toLowerCase() !== seed.toLowerCase()),
            ].slice(0, 6)
          : prevRecent
        setCompModel(
          buildCompetitorsChapterModel({
            projectId,
            projectName,
            domain,
            seed: seed || brandSeedFromHost(domain),
            locale: query.locale,
            location: query.location,
            recent,
            suggestions: compModel.searchBand?.suggestions,
            result: data,
            linkCompetitors: backlinks[0]?.competitors ?? null,
            t,
          }),
        )
        setFieldAnalyzed(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'request failed')
      } finally {
        setBusy(false)
      }
    },
    [backlinks, compModel.searchBand?.recent, compModel.searchBand?.suggestions, domain, projectId, projectName, t],
  )

  const runCompetitorsSuggest = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const rawHint = (compModel.searchBand?.seed ?? '').trim()
      const seedHint = !rawHint || isJunkKeywordToken(rawHint) ? undefined : rawHint
      const res = await fetch(paths.routes.apiProjectSeoCompetitorsSuggest(projectId), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          locale: compModel.searchBand?.locale ?? 'de',
          ...(seedHint ? { seedHint } : {}),
        }),
      })
      const data = (await res.json()) as SeoFieldSuggestResult & {
        detail?: string
        error?: string
      }
      if (!res.ok) {
        throw new Error(data.detail || data.error || `HTTP ${res.status}`)
      }
      const keywords = Array.isArray(data.keywords) ? data.keywords : []
      setSuggestBrief(parseSuggestBriefPayload(data))
      setCompModel((prev) => ({
        ...prev,
        searchBand: {
          seed: prev.searchBand?.seed ?? '',
          locale: prev.searchBand?.locale ?? 'de',
          location: prev.searchBand?.location ?? t('seoMarket.locations.germany'),
          seedLabel: prev.searchBand?.seedLabel,
          actionLabel: prev.searchBand?.actionLabel,
          allowEmptySeed: prev.searchBand?.allowEmptySeed,
          recent: prev.searchBand?.recent,
          locales: prev.searchBand?.locales,
          suggestions: keywords,
          suggestionsLabel: t('seoMarket.search.suggestions'),
        },
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed')
    } finally {
      setBusy(false)
    }
  }, [compModel.searchBand?.locale, compModel.searchBand?.seed, projectId, t])

  useEffect(() => {
    void (async () => {
      if (chapter === 'overview') {
        const data = (await api(paths.routes.apiProjectSeoOverview(projectId))) as
          | SeoProjectOverview
          | null
        if (data?.projectId) {
          setDashModel(
            buildSeoDashboardFromOverview({
              overview: data,
              projectName,
              t,
            }),
          )
        }
      }
      if (chapter === 'keywords') {
        const data = await api(paths.routes.apiProjectSeoKeywords(projectId))
        if (data?.keywords) setSaved(data.keywords as SeoSavedKeywordRow[])
        const seedParam = searchParams.get('seed')?.trim()
        if (seedParam && !isJunkKeywordToken(seedParam)) {
          setKwModel((prev) => ({
            ...prev,
            searchBand: {
              seed: seedParam,
              locale: prev.searchBand?.locale ?? 'de',
              location:
                prev.searchBand?.location ?? t('seoMarket.locations.germany'),
              seedLabel: prev.searchBand?.seedLabel,
              actionLabel: prev.searchBand?.actionLabel,
              recent: prev.searchBand?.recent,
              locales: prev.searchBand?.locales,
              suggestions: prev.searchBand?.suggestions,
              suggestionsLabel: prev.searchBand?.suggestionsLabel,
              suggestionsMode: prev.searchBand?.suggestionsMode,
            },
          }))
        }
      }
      if (chapter === 'domain') {
        const data = await api(paths.routes.apiProjectSeoDomain(projectId))
        const snap = (data as { snapshot: SeoDomainSnapshot | null } | null)?.snapshot
        if (snap) {
          setDomainModel(
            buildDomainChapterModel({
              projectId,
              projectName,
              domain,
              snapshot: snap,
              t,
            }),
          )
        }
      }
      if (chapter === 'backlinks') {
        const data = await api(paths.routes.apiProjectSeoBacklinks(projectId))
        if (data?.history) {
          applyBacklinksHistory(data.history as SeoBacklinkSnapshot[])
        }
      }
      if (chapter === 'competitors') {
        const bl = await api(paths.routes.apiProjectSeoBacklinks(projectId))
        const history = (bl?.history as SeoBacklinkSnapshot[] | undefined) ?? []
        if (!history.length) return
        setBacklinks(history)
        const linkCompetitors = history[0]?.competitors ?? []
        if (!linkCompetitors.length) return
        setCompModel((prev) =>
          buildCompetitorsChapterModel({
            projectId,
            projectName,
            domain,
            seed: prev.searchBand?.seed,
            locale: prev.searchBand?.locale,
            location: prev.searchBand?.location,
            recent: prev.searchBand?.recent,
            // Preserve in-session SERP overlap rows by re-mapping from current model
            // only when empty; otherwise enrich aside with link competitors.
            result:
              prev.rows.length > 0
                ? {
                    source: 'dataforseo' as const,
                    stubbed: false,
                    projectId,
                    domain,
                    keywords: (prev.searchBand?.seed ?? '')
                      .split(/[,;]+/)
                      .map((k) => k.trim())
                      .filter(Boolean),
                    items: prev.rows.map((r) => {
                      const domainCell = r.cells.domain
                      const host =
                        typeof domainCell === 'object' && domainCell
                          ? domainCell.primary
                          : String(domainCell ?? '')
                      return {
                        domain: host,
                        overlapCount: Number.parseInt(String(r.cells.overlap ?? '0'), 10) || 0,
                        avgRank: Number.parseFloat(
                          String(r.cells.avgRank ?? '').replace(',', '.'),
                        ) || null,
                      }
                    }),
                    fetchedAt: new Date().toISOString(),
                  }
                : null,
            linkCompetitors,
            t,
          }),
        )
      }
      if (chapter === 'rank-tracking') {
        const data = await api(paths.routes.apiProjectSeoRankConfigs(projectId))
        if (data?.configs) {
          const list = data.configs as SeoRankConfig[]
          setConfigs(list)
          const primary = list[0]
          if (primary) {
            setRankModel(
              buildRankChapterModel({
                projectId,
                projectName,
                domain,
                config: primary,
                seed: primary.keywords.slice(0, 3).join(', ') || brandSeedFromHost(domain),
                recent: primary.keywords.slice(0, 6),
                t,
              }),
            )
          }
        }
      }
      if (chapter === 'gsc') {
        const data = await api(paths.routes.apiProjectSeoGsc(projectId))
        if (data?.status) {
          setGscNote(
            data.status.connected
              ? t('seoMarket.workspace.gscConnected')
              : t('seoMarket.workspace.gscDisconnected'),
          )
        }
      }
    })()
  }, [api, applyBacklinksHistory, chapter, domain, projectId, projectName, searchParams, t])

  return (
    <div className="checkion-seo-project" data-section="seo-project-workspace">
      <SectionChrome
        title={t('seoMarket.workspaceTitle', { project: projectName })}
      />
      <SeoChapterNav
        active={chapter}
        hrefFor={(id) => paths.routes.projectSeo(projectId, id)}
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      {chapter === 'overview' ? <SeoDashboardView model={dashModel} /> : null}

      {chapter === 'keywords' ? (
        <SeoChapterView
          model={kwModel}
          searchBusy={busy}
          onSearch={runKeywordSearch}
          workbench={
            <div className="checkion-seo-project__stack">
              <SectionChrome
                title={t('seoMarket.workspace.workbench')}
                quiet
                meta={t('seoMarket.workspace.researchSuggestMeta')}
              />
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => void runKeywordsSuggest()}
              >
                {t('seoMarket.workspace.researchSuggest')}
              </Button>
              <Text role="meta" as="p">
                {t('seoMarket.workspace.researchSuggestHint')}
              </Text>
              {suggestBrief ? <SeoSuggestBriefPanel view={suggestBrief} /> : null}
              {saved.length > 0 ? (
                <>
                  <SectionChrome
                    title={t('seoMarket.workspace.saved')}
                    quiet
                    meta={t('seoMarket.workspace.savedMeta', { count: saved.length })}
                  />
                  <Text role="meta" as="p">
                    {t('seoMarket.workspace.savedHint')}
                  </Text>
                </>
              ) : null}
            </div>
          }
        />
      ) : null}

      {chapter === 'domain' ? (
        <SeoChapterView
          model={domainModel}
          searchBusy={busy}
          onSearch={runDomainRefresh}
        />
      ) : null}

      {chapter === 'backlinks' ? (
        <SeoChapterView
          model={backlinksModel}
          searchBusy={busy}
          onSearch={runBacklinksRefresh}
          workbench={
            <div className="checkion-seo-project__stack">
              <SectionChrome
                title={t('seoMarket.workspace.workbench')}
                quiet
                meta={
                  backlinks.length > 0
                    ? t('seoMarket.workspace.snapshotsInSession', {
                        count: backlinks.length,
                      })
                    : t('seoMarket.workspace.captureSnapshot')
                }
              />
              <Button
                variant="primary"
                disabled={busy}
                onClick={() =>
                  void runBacklinksRefresh({
                    seed: domain,
                    locale: backlinksModel.searchBand?.locale ?? 'de',
                    location:
                      backlinksModel.searchBand?.location ??
                      t('seoMarket.locations.germany'),
                  })
                }
              >
                {t('seoMarket.workspace.captureBacklinks')}
              </Button>
            </div>
          }
        />
      ) : null}

      {chapter === 'rank-tracking' ? (
        <SeoChapterView
          model={rankModel}
          searchBusy={busy}
          onSearch={runRankTrack}
          workbench={
            <div className="checkion-seo-project__stack">
              <SectionChrome
                title={t('seoMarket.workspace.workbench')}
                quiet
                meta={t('seoMarket.workspace.ranksSuggestMeta')}
              />
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => void runRankTrackSetSuggest()}
              >
                {t('seoMarket.workspace.ranksSuggest')}
              </Button>
              <Text role="meta" as="p">
                {t('seoMarket.workspace.ranksSuggestHint')}
              </Text>
              {suggestBrief ? <SeoSuggestBriefPanel view={suggestBrief} /> : null}
              {configs.length > 0 ? (
                <>
                  <SectionChrome
                    title={t('seoMarket.workspace.configs')}
                    quiet
                    meta={t('seoMarket.workspace.configsMeta', {
                      count: configs.length,
                    })}
                  />
                  {configs.slice(0, 3).map((cfg) => (
                    <div key={cfg.id} className="checkion-seo-project__row">
                      <Text role="meta" as="span">
                        {cfg.domain} · {cfg.keywords.length} kw · {cfg.schedule}
                      </Text>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={async () => {
                          trackJob({
                            id: `seo-rank-${cfg.id}-${Date.now()}`,
                            resource: 'seo-market',
                            status: 'running',
                            title: t('seoMarket.workspace.rankRefresh'),
                            href: paths.routes.projectSeo(projectId, 'rank-tracking'),
                            projectId,
                            detail: cfg.domain,
                          })
                          const updated = await api(
                            paths.routes.apiProjectSeoRankConfigRefresh(projectId, cfg.id),
                            { method: 'POST' },
                          )
                          if (updated) {
                            const next = updated as SeoRankConfig
                            setConfigs((prev) =>
                              prev.map((c) => (c.id === cfg.id ? next : c)),
                            )
                            setRankModel(
                              buildRankChapterModel({
                                projectId,
                                projectName,
                                domain,
                                config: next,
                                recent: next.keywords.slice(0, 6),
                                suggestions: rankModel.searchBand?.suggestions,
                                t,
                              }),
                            )
                            trackJob({
                              id: `seo-rank-${cfg.id}-done`,
                              resource: 'seo-market',
                              status: 'completed',
                              title: t('seoMarket.workspace.rankRefreshDone'),
                              href: paths.routes.projectSeo(projectId, 'rank-tracking'),
                              projectId,
                              detail: cfg.domain,
                            })
                          }
                        }}
                      >
                        {t('seoMarket.workspace.refreshNow')}
                      </Button>
                    </div>
                  ))}
                </>
              ) : null}
            </div>
          }
        />
      ) : null}

      {chapter === 'competitors' ? (
        <SeoChapterView
          model={compModel}
          searchBusy={busy}
          onSearch={runCompetitorsAnalyze}
          workbench={
            <div className="checkion-seo-project__stack">
              <SectionChrome
                title={t('seoMarket.workspace.workbench')}
                quiet
                meta={t('seoMarket.workspace.fieldSuggestMeta')}
              />
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => void runCompetitorsSuggest()}
              >
                {fieldAnalyzed || (compModel.searchBand?.suggestions?.length ?? 0) > 0
                  ? t('seoMarket.workspace.fieldSuggestRefresh')
                  : t('seoMarket.workspace.fieldSuggest')}
              </Button>
              <Text role="meta" as="p">
                {fieldAnalyzed
                  ? t('seoMarket.workspace.fieldSuggestRefreshHint')
                  : t('seoMarket.workspace.fieldSuggestHint')}
              </Text>
              {suggestBrief ? <SeoSuggestBriefPanel view={suggestBrief} /> : null}
            </div>
          }
        />
      ) : null}

      {chapter === 'gsc' ? (
        <SeoChapterView
          model={emptySeoChapter('gsc', { projectId, projectName, domain }, t)}
          workbench={
            <div className="checkion-seo-project__stack">
              <SectionChrome
                title={t('seoMarket.workspace.workbench')}
                quiet
                meta={t('seoMarket.workspace.connection')}
              />
              <Text role="body" as="p" className="checkion-seo-dash__copy">
                {gscNote ?? t('seoMarket.workspace.loadingGsc')}
              </Text>
              <Text role="meta" as="p">
                {t('seoMarket.workspace.gscFirstParty')}
              </Text>
            </div>
          }
        />
      ) : null}
    </div>
  )
}
