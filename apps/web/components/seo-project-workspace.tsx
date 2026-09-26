'use client'

import { useCallback, useEffect, useState } from 'react'
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
  SeoDomainSnapshot,
  SeoKeywordIdea,
  SeoRankConfig,
  SeoSavedKeywordRow,
  SeoSerpResult,
} from '@checkion-v3/contracts'
import { paths, type SeoProjectChapter } from '../lib/paths'
import { emptySeoDashboard } from '../lib/seo-market/dashboard-fixtures'
import { emptySeoChapter } from '../lib/seo-market/chapter-fixtures'
import { buildKeywordsChapterModel } from '../lib/seo-market/keywords-chapter-map'
import { buildDomainChapterModel } from '../lib/seo-market/domain-chapter-map'
import { buildRankChapterModel } from '../lib/seo-market/rank-chapter-map'
import { buildCompetitorsChapterModel } from '../lib/seo-market/competitors-chapter-map'
import { useJobNotifications } from './job-notification-center'
import { SeoDashboardView } from './seo-dashboard-view'
import { SeoChapterView, type SeoChapterSearchQuery } from './seo-chapter-view'
import { SeoChapterNav } from './seo-chapter-nav'

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
  const { trackJob } = useJobNotifications()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<SeoSavedKeywordRow[]>([])
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
  const [backlinks, setBacklinks] = useState<SeoBacklinkSnapshot[]>([])
  const [configs, setConfigs] = useState<SeoRankConfig[]>([])
  const [gscNote, setGscNote] = useState<string | null>(null)

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
    setKwModel(emptySeoChapter('keywords', { projectId, projectName, domain }))
    setDomainModel(emptySeoChapter('domain', { projectId, projectName, domain }))
    setRankModel(emptySeoChapter('rank-tracking', { projectId, projectName, domain }))
    setCompModel(emptySeoChapter('competitors', { projectId, projectName, domain }))
  }, [projectId, projectName, domain])

  const runKeywordSearch = useCallback(
    async (query: SeoChapterSearchQuery) => {
      setBusy(true)
      setError(null)
      const locationCode = locationCodeFor(query.location)
      const languageCode = query.locale || 'de'
      try {
        const [researchRes, serpRes] = await Promise.all([
          fetch(paths.routes.apiProjectSeoKeywords(projectId), {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              action: 'research',
              seed: query.seed,
              save: true,
              limit: 40,
            }),
          }),
          fetch(paths.routes.apiSeoMarketSerp, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              projectId,
              keyword: query.seed,
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
          query.seed,
          ...prevRecent.filter((r) => r.toLowerCase() !== query.seed.toLowerCase()),
        ].slice(0, 6)
        setKwModel(
          buildKeywordsChapterModel({
            projectId,
            projectName,
            domain,
            seed: query.seed,
            locale: query.locale,
            location: query.location,
            recent,
            ideas,
            serp: serpData,
          }),
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'request failed')
      } finally {
        setBusy(false)
      }
    },
    [domain, kwModel.searchBand?.recent, projectId, projectName],
  )

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
          }),
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'request failed')
      } finally {
        setBusy(false)
      }
    },
    [domain, domainModel.searchBand?.recent, projectId, projectName],
  )

  const runRankTrack = useCallback(
    async (query: SeoChapterSearchQuery) => {
      setBusy(true)
      setError(null)
      try {
        const keyword = query.seed.trim()
        if (!keyword) return
        const existing = configs[0]
        const keywords = existing
          ? Array.from(new Set([...existing.keywords, keyword])).slice(0, 50)
          : [keyword]
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
        const recent = [
          keyword,
          ...prevRecent.filter((r) => r.toLowerCase() !== keyword.toLowerCase()),
        ].slice(0, 6)
        setRankModel(
          buildRankChapterModel({
            projectId,
            projectName,
            domain,
            seed: keyword,
            locale: query.locale,
            location: query.location,
            recent,
            config,
          }),
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'request failed')
      } finally {
        setBusy(false)
      }
    },
    [configs, domain, projectId, projectName, rankModel.searchBand?.recent, trackJob],
  )

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
            seed: seed || domain.split('.')[0] || 'brand',
            locale: query.locale,
            location: query.location,
            recent,
            result: data,
          }),
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'request failed')
      } finally {
        setBusy(false)
      }
    },
    [compModel.searchBand?.recent, domain, projectId, projectName],
  )

  useEffect(() => {
    void (async () => {
      if (chapter === 'keywords') {
        const data = await api(paths.routes.apiProjectSeoKeywords(projectId))
        if (data?.keywords) setSaved(data.keywords as SeoSavedKeywordRow[])
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
            }),
          )
        }
      }
      if (chapter === 'backlinks') {
        const data = await api(paths.routes.apiProjectSeoBacklinks(projectId))
        if (data?.history) setBacklinks(data.history as SeoBacklinkSnapshot[])
      }
      if (chapter === 'rank-tracking') {
        const data = await api(paths.routes.apiProjectSeoRankConfigs(projectId))
        if (data?.configs) {
          const list = data.configs as SeoRankConfig[]
          setConfigs(list)
          const primary = list[0]
          if (primary?.latest?.length) {
            setRankModel(
              buildRankChapterModel({
                projectId,
                projectName,
                domain,
                config: primary,
                recent: primary.keywords.slice(0, 6),
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
              ? 'GSC connected — performance stub until OAuth token store.'
              : 'GSC not connected — fixture performance until OAuth.',
          )
        }
      }
    })()
  }, [api, chapter, domain, projectId, projectName])

  return (
    <div className="checkion-seo-project" data-section="seo-project-workspace">
      <SectionChrome
        title={`${projectName} · SEO`}
      />
      <SeoChapterNav
        active={chapter}
        hrefFor={(id) => paths.routes.projectSeo(projectId, id)}
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      {chapter === 'overview' ? (
        <SeoDashboardView
          model={emptySeoDashboard({
            projectId,
            projectName,
            domain,
          })}
        />
      ) : null}

      {chapter === 'keywords' ? (
        <SeoChapterView
          model={kwModel}
          searchBusy={busy}
          onSearch={runKeywordSearch}
          workbench={
            saved.length > 0 ? (
              <div className="checkion-seo-project__stack">
                <SectionChrome title="Saved" quiet meta={`${saved.length} keywords`} />
                <Text role="meta" as="p">
                  Last research auto-saves ideas for this Collection.
                </Text>
              </div>
            ) : undefined
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
          model={emptySeoChapter('backlinks', { projectId, projectName, domain })}
          workbench={
            <div className="checkion-seo-project__stack">
              <SectionChrome title="Workbench" quiet meta="Capture snapshot" />
              <Button
                variant="primary"
                disabled={busy}
                onClick={async () => {
                  const snap = await api(paths.routes.apiProjectSeoBacklinks(projectId), {
                    method: 'POST',
                    body: JSON.stringify({ action: 'refresh' }),
                  })
                  if (snap) {
                    setBacklinks((prev) => [snap as SeoBacklinkSnapshot, ...prev])
                  }
                }}
              >
                Capture backlink snapshot
              </Button>
              {backlinks.length > 0 ? (
                <Text role="meta" as="p">
                  {backlinks.length} live snapshot(s) in session.
                </Text>
              ) : null}
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
            configs.length > 0 ? (
              <div className="checkion-seo-project__stack">
                <SectionChrome
                  title="Configs"
                  quiet
                  meta={`${configs.length} active`}
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
                          title: 'Rank refresh',
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
                            }),
                          )
                          trackJob({
                            id: `seo-rank-${cfg.id}-done`,
                            resource: 'seo-market',
                            status: 'completed',
                            title: 'Rank refresh done',
                            href: paths.routes.projectSeo(projectId, 'rank-tracking'),
                            projectId,
                            detail: cfg.domain,
                          })
                        }
                      }}
                    >
                      Refresh now
                    </Button>
                  </div>
                ))}
              </div>
            ) : undefined
          }
        />
      ) : null}

      {chapter === 'competitors' ? (
        <SeoChapterView
          model={compModel}
          searchBusy={busy}
          onSearch={runCompetitorsAnalyze}
        />
      ) : null}

      {chapter === 'gsc' ? (
        <SeoChapterView
          model={emptySeoChapter('gsc', { projectId, projectName, domain })}
          workbench={
            <div className="checkion-seo-project__stack">
              <SectionChrome title="Workbench" quiet meta="Connection" />
              <Text role="body" as="p" className="checkion-seo-dash__copy">
                {gscNote ?? 'Loading GSC status…'}
              </Text>
              <Text role="meta" as="p">
                First-party Search Console only — OAuth wiring lands later.
              </Text>
            </div>
          }
        />
      ) : null}
    </div>
  )
}
