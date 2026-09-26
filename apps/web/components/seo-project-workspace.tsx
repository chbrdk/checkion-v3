'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Chip,
  Field,
  Input,
  Panel,
  SectionChrome,
  Text,
} from '@msqdx/ui'
import type {
  SeoBacklinkSnapshot,
  SeoCompetitorsResult,
  SeoDomainSnapshot,
  SeoKeywordIdea,
  SeoProjectOverview,
  SeoRankConfig,
  SeoSavedKeywordRow,
} from '@checkion-v3/contracts'
import { paths, type SeoProjectChapter } from '../lib/paths'
import { useJobNotifications } from './job-notification-center'

const NAV: Array<{ id: SeoProjectChapter; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'keywords', label: 'Keywords' },
  { id: 'domain', label: 'Domain' },
  { id: 'backlinks', label: 'Backlinks' },
  { id: 'rank-tracking', label: 'Rank tracking' },
  { id: 'competitors', label: 'Competitors' },
  { id: 'gsc', label: 'GSC' },
]

function MetaLine({ source, fetchedAt }: { source?: string | null; fetchedAt?: string | null }) {
  if (!source && !fetchedAt) return null
  return (
    <Text role="meta" as="p">
      {[source, fetchedAt ? new Date(fetchedAt).toLocaleString() : null].filter(Boolean).join(' · ')}
    </Text>
  )
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
  const [overview, setOverview] = useState<SeoProjectOverview | null>(null)
  const [saved, setSaved] = useState<SeoSavedKeywordRow[]>([])
  const [ideas, setIdeas] = useState<SeoKeywordIdea[]>([])
  const [seed, setSeed] = useState(domain.split('.')[0] || 'brand')
  const [domainSnap, setDomainSnap] = useState<SeoDomainSnapshot | null>(null)
  const [backlinks, setBacklinks] = useState<SeoBacklinkSnapshot[]>([])
  const [configs, setConfigs] = useState<SeoRankConfig[]>([])
  const [rankKeywords, setRankKeywords] = useState('')
  const [competitors, setCompetitors] = useState<SeoCompetitorsResult | null>(null)
  const [compKeywords, setCompKeywords] = useState('')
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
    void (async () => {
      if (chapter === 'overview') {
        const data = await api(paths.routes.apiProjectSeoOverview(projectId))
        if (data) setOverview(data as SeoProjectOverview)
      }
      if (chapter === 'keywords') {
        const data = await api(paths.routes.apiProjectSeoKeywords(projectId))
        if (data?.keywords) setSaved(data.keywords as SeoSavedKeywordRow[])
      }
      if (chapter === 'domain') {
        const data = await api(paths.routes.apiProjectSeoDomain(projectId))
        if (data) setDomainSnap((data as { snapshot: SeoDomainSnapshot | null }).snapshot)
      }
      if (chapter === 'backlinks') {
        const data = await api(paths.routes.apiProjectSeoBacklinks(projectId))
        if (data?.history) setBacklinks(data.history as SeoBacklinkSnapshot[])
      }
      if (chapter === 'rank-tracking') {
        const data = await api(paths.routes.apiProjectSeoRankConfigs(projectId))
        if (data?.configs) setConfigs(data.configs as SeoRankConfig[])
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
  }, [api, chapter, projectId])

  return (
    <div className="checkion-seo-project" data-section="seo-project-workspace">
      <SectionChrome
        title={`${projectName} · SEO`}
        meta={`Market SEO for ${domain}`}
      />
      <nav className="checkion-seo-project__nav" aria-label="SEO chapters">
        {NAV.map((item) => (
          <Link key={item.id} href={paths.routes.projectSeo(projectId, item.id)}>
            <Chip static selected={chapter === item.id} size="sm">
              {item.label}
            </Chip>
          </Link>
        ))}
      </nav>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {chapter === 'overview' && overview ? (
        <div className="checkion-seo-project__grid">
          <Panel>
            <Text role="label" as="p">
              Saved keywords
            </Text>
            <Text role="display" as="p">
              {overview.savedKeywordCount}
            </Text>
          </Panel>
          <Panel>
            <Text role="label" as="p">
              Organic keywords
            </Text>
            <Text role="display" as="p">
              {overview.domainSnapshot?.organicKeywords ?? '—'}
            </Text>
            <MetaLine
              source={overview.domainSnapshot?.source}
              fetchedAt={overview.domainSnapshot?.fetchedAt}
            />
          </Panel>
          <Panel>
            <Text role="label" as="p">
              Referring domains
            </Text>
            <Text role="display" as="p">
              {overview.backlinkSnapshot?.referringDomains ?? '—'}
            </Text>
            <MetaLine
              source={overview.backlinkSnapshot?.source}
              fetchedAt={overview.backlinkSnapshot?.fetchedAt}
            />
          </Panel>
          <Panel>
            <Text role="label" as="p">
              Rank configs
            </Text>
            <Text role="display" as="p">
              {overview.rankConfigs.length}
            </Text>
          </Panel>
        </div>
      ) : null}

      {chapter === 'keywords' ? (
        <div className="checkion-seo-project__stack">
          <div className="checkion-seo-project__row">
            <Field label="Seed">
              <Input value={seed} onChange={(e) => setSeed(e.target.value)} />
            </Field>
            <Button
              variant="primary"
              disabled={busy || !seed.trim()}
              onClick={async () => {
                const data = await api(paths.routes.apiProjectSeoKeywords(projectId), {
                  method: 'POST',
                  body: JSON.stringify({ action: 'research', seed, save: true }),
                })
                if (data?.ideas) setIdeas(data.ideas as SeoKeywordIdea[])
                if (data?.keywords) setSaved(data.keywords as SeoSavedKeywordRow[])
              }}
            >
              Research & save
            </Button>
          </div>
          {ideas.length > 0 ? (
            <table className="checkion-seo-table">
              <thead>
                <tr>
                  <th>Idea</th>
                  <th>Volume</th>
                  <th>CPC</th>
                  <th>Competition</th>
                </tr>
              </thead>
              <tbody>
                {ideas.map((row) => (
                  <tr key={row.keyword}>
                    <td>{row.keyword}</td>
                    <td>{row.searchVolume ?? '—'}</td>
                    <td>{row.cpc ?? '—'}</td>
                    <td>{row.competition ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          <Text role="title" as="h2">
            Saved keywords
          </Text>
          <table className="checkion-seo-table">
            <thead>
              <tr>
                <th>Keyword</th>
                <th>Volume</th>
                <th>Difficulty</th>
                <th>Saved</th>
              </tr>
            </thead>
            <tbody>
              {saved.map((row) => (
                <tr key={row.id}>
                  <td>{row.keyword}</td>
                  <td>{row.metrics?.searchVolume ?? '—'}</td>
                  <td>{row.metrics?.difficulty ?? '—'}</td>
                  <td>{new Date(row.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {saved.length === 0 ? (
                <tr>
                  <td colSpan={4}>No saved keywords yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {chapter === 'domain' ? (
        <div className="checkion-seo-project__stack">
          <Button
            variant="primary"
            disabled={busy}
            onClick={async () => {
              const data = await api(paths.routes.apiProjectSeoDomain(projectId), {
                method: 'POST',
                body: JSON.stringify({ action: 'refresh' }),
              })
              if (data) setDomainSnap(data as SeoDomainSnapshot)
            }}
          >
            Refresh domain snapshot
          </Button>
          {domainSnap ? (
            <Panel>
              <Text role="display" as="p">
                {domainSnap.organicKeywords ?? '—'} organic keywords
              </Text>
              <Text role="body" as="p">
                Traffic {domainSnap.organicTraffic ?? '—'} · Cost {domainSnap.organicCost ?? '—'}
              </Text>
              <MetaLine source={domainSnap.source} fetchedAt={domainSnap.fetchedAt} />
              <table className="checkion-seo-table">
                <thead>
                  <tr>
                    <th>Top keyword</th>
                    <th>Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {domainSnap.topKeywords.map((k) => (
                    <tr key={k.keyword}>
                      <td>{k.keyword}</td>
                      <td>{k.searchVolume ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          ) : (
            <Text role="body" as="p">
              No domain snapshot yet — refresh to pull DataForSEO / fixture.
            </Text>
          )}
        </div>
      ) : null}

      {chapter === 'backlinks' ? (
        <div className="checkion-seo-project__stack">
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
          <table className="checkion-seo-table">
            <thead>
              <tr>
                <th>Captured</th>
                <th>Referring domains</th>
                <th>Backlinks</th>
                <th>Rank</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {backlinks.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.capturedAt).toLocaleString()}</td>
                  <td>{row.referringDomains ?? '—'}</td>
                  <td>{row.backlinks ?? '—'}</td>
                  <td>{row.rank ?? '—'}</td>
                  <td>{row.source}</td>
                </tr>
              ))}
              {backlinks.length === 0 ? (
                <tr>
                  <td colSpan={5}>No backlink history yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {chapter === 'rank-tracking' ? (
        <div className="checkion-seo-project__stack">
          <div className="checkion-seo-project__row">
            <Field label="Keywords (comma-separated)">
              <Input
                value={rankKeywords}
                onChange={(e) => setRankKeywords(e.target.value)}
                placeholder="brand, product, category"
              />
            </Field>
            <Button
              variant="primary"
              disabled={busy}
              onClick={async () => {
                const keywords = rankKeywords
                  .split(',')
                  .map((k) => k.trim())
                  .filter(Boolean)
                const config = await api(paths.routes.apiProjectSeoRankConfigs(projectId), {
                  method: 'POST',
                  body: JSON.stringify({ keywords, schedule: 'weekly' }),
                })
                if (config) setConfigs((prev) => [config as SeoRankConfig, ...prev])
              }}
            >
              Create config
            </Button>
          </div>
          {configs.map((cfg) => (
            <Panel key={cfg.id}>
              <Text role="title" as="h3">
                {cfg.domain} · {cfg.keywords.length} keywords · {cfg.schedule}
              </Text>
              <MetaLine
                source={cfg.latestRunStatus ?? undefined}
                fetchedAt={cfg.lastCheckedAt}
              />
              <Button
                variant="ghost"
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
                    setConfigs((prev) =>
                      prev.map((c) => (c.id === cfg.id ? (updated as SeoRankConfig) : c)),
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
              {cfg.latest?.length ? (
                <table className="checkion-seo-table">
                  <thead>
                    <tr>
                      <th>Keyword</th>
                      <th>Position</th>
                      <th>URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cfg.latest.map((s) => (
                      <tr key={s.keyword}>
                        <td>{s.keyword}</td>
                        <td>{s.rank ?? '—'}</td>
                        <td>{s.url ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </Panel>
          ))}
        </div>
      ) : null}

      {chapter === 'competitors' ? (
        <div className="checkion-seo-project__stack">
          <div className="checkion-seo-project__row">
            <Field label="Keywords (optional — uses saved if empty)">
              <Input
                value={compKeywords}
                onChange={(e) => setCompKeywords(e.target.value)}
              />
            </Field>
            <Button
              variant="primary"
              disabled={busy}
              onClick={async () => {
                const keywords = compKeywords
                  .split(',')
                  .map((k) => k.trim())
                  .filter(Boolean)
                const data = await api(paths.routes.apiProjectSeoCompetitors(projectId), {
                  method: 'POST',
                  body: JSON.stringify({ keywords }),
                })
                if (data) setCompetitors(data as SeoCompetitorsResult)
              }}
            >
              Analyze overlap
            </Button>
          </div>
          {competitors ? (
            <>
              <MetaLine source={competitors.source} fetchedAt={competitors.fetchedAt} />
              <table className="checkion-seo-table">
                <thead>
                  <tr>
                    <th>Domain</th>
                    <th>Overlap</th>
                    <th>Avg rank</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.items.map((row) => (
                    <tr key={row.domain}>
                      <td>{row.domain}</td>
                      <td>{row.overlapCount}</td>
                      <td>{row.avgRank ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
        </div>
      ) : null}

      {chapter === 'gsc' ? (
        <Panel>
          <Text role="body" as="p">
            {gscNote ?? 'Loading GSC status…'}
          </Text>
          <Text role="meta" as="p">
            First-party Search Console only — OAuth wiring lands later. Numbers below are stubbed.
          </Text>
        </Panel>
      ) : null}
    </div>
  )
}
