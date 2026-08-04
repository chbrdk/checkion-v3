'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Field,
  Hint,
  Input,
  Panel,
  Text,
} from '@msqdx/ui'
import type { ProjectDetail } from '@checkion-v3/contracts'
import { Select } from '../lib/msqdx-ui-client'
import {
  defaultGeoModelIds,
  modelsForLaunch,
} from '../lib/geo/model-catalog'
import {
  defaultGeoQueries,
  hostFromUrl,
  normalizeGeoUrl,
  resolveGeoLaunchUrl,
  sameQueryList,
  urlFromCompanyName,
} from '../lib/geo-query-suggest'
import { paths } from '../lib/paths'
import { GeoModelPicker } from './geo-model-picker'
import { LabelWithTip } from './help-tip'
import { useJobNotifications } from './job-notification-center'
import { GeoQueryList } from './geo-query-list'
import { ProjectFormDialog } from './project-form-dialog'

export { defaultGeoQueries } from '../lib/geo-query-suggest'
export { defaultGeoModelIds } from '../lib/geo/model-catalog'

const DEFAULT_DEMO_URL = 'https://www.bosch-ebike.com/de/'

/** Deep-link / API launch modes preserved across IA rebuilds. */
export type LaunchMode = 'seo' | 'geo' | 'single' | 'deep'

/** Primary capability on the magazine picker. */
export type LaunchCapability = 'seo' | 'geo' | 'wcag'

/** WCAG secondary depth (only when capability = WCAG). */
export type WcagDepth = 'single' | 'deep'

export function capabilityFromLaunchMode(mode: LaunchMode): LaunchCapability {
  if (mode === 'seo') return 'seo'
  if (mode === 'geo') return 'geo'
  return 'wcag'
}

export function wcagDepthFromLaunchMode(mode: LaunchMode): WcagDepth {
  return mode === 'deep' ? 'deep' : 'single'
}

export function launchModeFromState(
  capability: LaunchCapability,
  wcagDepth: WcagDepth,
): LaunchMode {
  if (capability === 'seo') return 'seo'
  if (capability === 'geo') return 'geo'
  return wcagDepth
}

/**
 * Progressive disclosure: cold `/scan` starts with capability tiles only.
 * Explicit `defaultMode` (deep-link / AUDION) skips ahead to the full chain.
 */
export function initialCapability(
  fromAudion: boolean,
  defaultMode?: LaunchMode,
): LaunchCapability | null {
  if (fromAudion) return 'wcag'
  if (defaultMode) return capabilityFromLaunchMode(defaultMode)
  return null
}

export function initialWcagDepth(
  fromAudion: boolean,
  defaultMode?: LaunchMode,
): WcagDepth | null {
  if (fromAudion) return 'single'
  if (defaultMode === 'single' || defaultMode === 'deep') {
    return wcagDepthFromLaunchMode(defaultMode)
  }
  return null
}

/** GEO starts empty unless deep-linked; WCAG / SEO still auto-pick first Collection. */
export function initialProjectId(
  projects: Array<{ id: string }>,
  opts: {
    fromAudion?: boolean
    defaultMode?: LaunchMode
    defaultProjectId?: string
  },
): string {
  const { fromAudion = false, defaultMode, defaultProjectId } = opts
  if (defaultProjectId && projects.some((p) => p.id === defaultProjectId)) {
    return defaultProjectId
  }
  if (initialCapability(fromAudion, defaultMode) === 'geo') return ''
  return projects[0]?.id ?? ''
}

const CAPABILITY_CARDS: Array<{
  id: LaunchCapability
  label: string
  kicker: string
  deck: string
}> = [
  {
    id: 'wcag',
    label: 'WCAG',
    kicker: 'Accessibility',
    deck: 'Page or domain — contrast, structure, and assistive tech readiness.',
  },
  {
    id: 'geo',
    label: 'GEO',
    kicker: 'Answer engines',
    deck: 'Citations, placement, and share of voice in LLM answers.',
  },
  {
    id: 'seo',
    label: 'SEO',
    kicker: 'Findability',
    deck: 'Titles, meta, headings, and corpus coverage across the host.',
  },
]

const WCAG_DEPTH_CARDS: Array<{
  id: WcagDepth
  label: string
  kicker: string
  deck: string
}> = [
  {
    id: 'single',
    label: 'Quick single scan',
    kicker: 'One page',
    deck: 'One URL, one magazine — accessibility first with SEO and performance beside it.',
  },
  {
    id: 'deep',
    label: 'Deep scan',
    kicker: 'Domain crawl',
    deck: 'Spider from this URL into a light corpus magazine alongside the page result.',
  },
]

export function ScanLaunchForm({
  projects,
  defaultMode,
  defaultProjectId,
  defaultUrl,
  correlation,
  fromAudion = false,
  projectLabel,
}: {
  projects: Array<{ id: string; name: string; domain?: string; platformProjectId?: string }>
  /** When set (deep-link / AUDION), skip progressive disclosure and show the full chain. */
  defaultMode?: LaunchMode
  defaultProjectId?: string
  defaultUrl?: string
  correlation?: {
    platformProjectId?: string
    audionRunId?: string
    stepUrl?: string
  }
  fromAudion?: boolean
  projectLabel?: string
}) {
  const { trackJob } = useJobNotifications()
  const initialUrl = defaultUrl?.trim() || DEFAULT_DEMO_URL

  const [capability, setCapability] = useState<LaunchCapability | null>(() =>
    initialCapability(fromAudion, defaultMode),
  )
  const [wcagDepth, setWcagDepth] = useState<WcagDepth | null>(() =>
    initialWcagDepth(fromAudion, defaultMode),
  )
  const [url, setUrl] = useState(initialUrl)
  const [companyName, setCompanyName] = useState('')
  const [projectOptions, setProjectOptions] = useState(projects)
  const [projectId, setProjectId] = useState(() =>
    initialProjectId(projects, { fromAudion, defaultMode, defaultProjectId }),
  )
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [createProjectPrefill, setCreateProjectPrefill] = useState<
    Pick<ProjectDetail, 'name' | 'domain' | 'description'> | undefined
  >(undefined)
  const [geoQueries, setGeoQueries] = useState(() =>
    defaultGeoQueries(initialUrl, { companyName: undefined }),
  )
  const [geoModels, setGeoModels] = useState<string[]>(() => defaultGeoModelIds())
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setProjectOptions(projects)
  }, [projects])

  const activeProject = projectOptions.find((p) => p.id === projectId)
  const activeProjectName = projectLabel || activeProject?.name || projectId
  const activeCapability = fromAudion ? 'wcag' : capability
  const activeWcagDepth = fromAudion ? 'single' : wcagDepth
  const geoTargetReady = Boolean(url.trim() || companyName.trim())
  const geoSuggestUrl =
    normalizeGeoUrl(url) ||
    (companyName.trim() ? urlFromCompanyName(companyName) : '') ||
    resolveGeoLaunchUrl(url, geoQueries, { companyName, fallback: '' })
  const geoCreatePrefill = useMemo(() => {
    const host =
      hostFromUrl(normalizeGeoUrl(url) || urlFromCompanyName(companyName) || url) ||
      hostFromUrl(urlFromCompanyName(companyName.trim() || 'brand'))
    const name = companyName.trim() || (host ? `GEO · ${host}` : '')
    return {
      name,
      domain: host,
      description: '',
    }
  }, [url, companyName])

  function openCreateProject() {
    setCreateProjectPrefill(geoCreatePrefill)
    setCreateProjectOpen(true)
  }

  const showDepth = activeCapability === 'wcag' && !fromAudion
  const showCompose =
    fromAudion ||
    activeCapability === 'seo' ||
    activeCapability === 'geo' ||
    (activeCapability === 'wcag' && activeWcagDepth !== null)

  const modeCopy = useMemo(() => {
    if (fromAudion) {
      return {
        title: 'Scan this page',
        deck: 'AUDION handed off this step URL. Confirm the Collection project, then launch a single-page accessibility scan.',
        cta: 'Launch single scan',
        loading: 'Starting single-page scan…',
      }
    }
    switch (activeCapability) {
      case 'seo':
        return {
          title: 'SEO coverage',
          deck: 'Crawl the host and open the domain magazine where SEO coverage is a first-class chapter — titles, meta, H1s, and keyword density across pages.',
          cta: 'Launch SEO crawl',
          loading: 'Starting SEO domain crawl…',
        }
      case 'geo':
        return {
          title: 'GEO presence',
          deck: 'Ask answer engines where this host shows up — citations, placement, and competitive share of voice.',
          cta: 'Start GEO job',
          loading: 'Starting GEO job…',
        }
      case 'wcag':
        if (activeWcagDepth === 'deep') {
          return {
            title: 'Deep WCAG crawl',
            deck: 'Spider the domain from this URL and open a light corpus magazine alongside the page result.',
            cta: 'Launch deep scan',
            loading: 'Starting deep crawl…',
          }
        }
        return {
          title: 'Quick single scan',
          deck: 'One URL, one magazine result — accessibility first, with SEO and performance signals in the same reading.',
          cta: 'Launch single scan',
          loading: 'Starting single-page scan…',
        }
      default:
        return {
          title: 'Start a run',
          deck: 'Choose a capability to continue.',
          cta: 'Launch',
          loading: 'Starting…',
        }
    }
  }, [activeCapability, activeWcagDepth, fromAudion])

  function onCapabilityChange(next: LaunchCapability) {
    if (fromAudion) return
    setCapability(next)
    setError(null)
    // GEO: empty project by default. WCAG / SEO: keep / restore a Collection pick.
    if (next === 'geo') {
      if (!(defaultProjectId && projectOptions.some((p) => p.id === defaultProjectId))) {
        setProjectId('')
      } else {
        setProjectId(defaultProjectId)
      }
    } else if (!projectId.trim() && projectOptions[0]?.id) {
      setProjectId(projectOptions[0].id)
    }
  }

  function onProjectCreated(project: ProjectDetail) {
    setProjectOptions((prev) => {
      if (prev.some((p) => p.id === project.id)) return prev
      return [...prev, { id: project.id, name: project.name, domain: project.domain }]
    })
    setProjectId(project.id)
  }

  function onWcagDepthChange(next: WcagDepth) {
    if (fromAudion) return
    setWcagDepth(next)
    setError(null)
  }

  function refreshGeoDefaults(nextUrl: string, nextCompany: string) {
    if (activeCapability !== 'geo') return
    const prevDefaults = defaultGeoQueries(url, { companyName: companyName || undefined })
    if (!sameQueryList(geoQueries, prevDefaults)) return
    setGeoQueries(
      defaultGeoQueries(nextUrl || urlFromCompanyName(nextCompany || 'brand'), {
        companyName: nextCompany || undefined,
      }),
    )
  }

  function onUrlChange(next: string) {
    setUrl(next)
    refreshGeoDefaults(next, companyName)
  }

  function onCompanyNameChange(next: string) {
    setCompanyName(next)
    refreshGeoDefaults(url, next)
  }

  async function launchWcagScan(launchMode: WcagDepth) {
    const body: Record<string, unknown> = { projectId, mode: launchMode, url }
    if (correlation?.platformProjectId) {
      body.platformProjectId = correlation.platformProjectId
    }
    if (correlation?.audionRunId) {
      body.audionRunId = correlation.audionRunId
    }
    if (correlation?.stepUrl || (fromAudion && url)) {
      body.stepUrl = correlation?.stepUrl || url
    }
    const res = await fetch(paths.routes.apiScans, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Launch failed (${res.status})`)
    const data = (await res.json()) as { id: string; domainScanId?: string }
    const isDeep = launchMode === 'deep' && Boolean(data.domainScanId)
    trackJob({
      id: isDeep ? data.domainScanId! : data.id,
      resource: isDeep ? 'domain' : 'scan',
      status: 'queued',
      title: launchMode === 'deep' ? 'Deep scan' : 'Single scan',
      href: isDeep
        ? paths.routes.domainSection(data.domainScanId!, 'overview')
        : paths.routes.resultSection(data.id, 'overview'),
      projectId,
      targetUrl: url,
      detail: url,
    })
  }

  async function launchSeo() {
    const res = await fetch(paths.routes.apiDomainScans, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectId, url }),
    })
    if (!res.ok) {
      let detail = `SEO launch failed (${res.status})`
      try {
        const errBody = (await res.json()) as { detail?: string; error?: string }
        if (errBody.detail) detail = errBody.detail
        else if (errBody.error) detail = errBody.error
      } catch {
        /* ignore */
      }
      throw new Error(detail)
    }
    const data = (await res.json()) as { id: string }
    if (!data.id) throw new Error('SEO launch returned no domain id')
    trackJob({
      id: data.id,
      resource: 'domain',
      status: 'queued',
      title: 'SEO crawl',
      href: paths.routes.domainSection(data.id, 'overview'),
      projectId,
      targetUrl: url,
      detail: url,
    })
  }

  async function readLaunchError(res: Response, fallback: string): Promise<string> {
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      try {
        const errBody = (await res.json()) as { detail?: string; error?: string }
        if (errBody.detail?.trim()) return errBody.detail.trim()
        if (errBody.error?.trim()) return errBody.error.trim()
      } catch {
        /* fall through */
      }
    } else {
      // Auth middleware may redirect to HTML /login — don't swallow as opaque status.
      if (res.redirected || contentType.includes('text/html')) {
        return `${fallback}: sign in required (got HTML instead of API JSON)`
      }
    }
    return `${fallback} (${res.status})`
  }

  async function launchGeo() {
    const queries = geoQueries.map((q) => q.trim()).filter(Boolean)
    const trimmedCompany = companyName.trim()
    if (!url.trim() && !trimmedCompany) {
      throw new Error('Provide a URL or company name to start a GEO check')
    }
    // Prefer explicit URL; company-only derives a normalized citation URL.
    // Empty projectId → API auto-creates from URL / company (never silent first-project pick).
    const resolvedUrl = resolveGeoLaunchUrl(url, queries, {
      companyName: trimmedCompany || undefined,
      fallback: null,
    })
    if (!resolvedUrl) {
      throw new Error('Provide a URL or company name to start a GEO check')
    }
    const resolvedQueries =
      queries.length > 0
        ? queries
        : defaultGeoQueries(resolvedUrl, {
            companyName: trimmedCompany || undefined,
          })
    const models = modelsForLaunch(geoModels)
    const resolvedProjectId = projectId.trim() || undefined
    const body: Record<string, unknown> = {
      url: resolvedUrl,
      queries: resolvedQueries,
      models,
    }
    if (trimmedCompany) body.companyName = trimmedCompany
    if (resolvedProjectId) body.projectId = resolvedProjectId
    const platformProjectId =
      correlation?.platformProjectId?.trim() ||
      (activeProject?.platformProjectId &&
      !activeProject.platformProjectId.startsWith('plx-local-')
        ? activeProject.platformProjectId
        : undefined)
    if (platformProjectId) body.platformProjectId = platformProjectId

    const res = await fetch(paths.routes.apiGeoJobs, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      throw new Error(await readLaunchError(res, 'GEO launch failed'))
    }
    let data: { jobId?: string; job?: { id: string }; projectId?: string }
    try {
      data = (await res.json()) as typeof data
    } catch {
      throw new Error('GEO launch returned a non-JSON response — check auth / API health')
    }
    const jobId = data.jobId || data.job?.id
    if (!jobId) throw new Error('GEO launch returned no job id')
    if (data.projectId && data.projectId !== projectId) {
      setProjectId(data.projectId)
    }
    trackJob({
      id: jobId,
      resource: 'geo',
      status: 'queued',
      title: 'GEO job',
      href: paths.routes.geoSection(jobId, 'overview'),
      projectId: data.projectId || resolvedProjectId,
      targetUrl: resolvedUrl,
      detail: resolvedUrl,
    })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!showCompose || !activeCapability) return
    if (activeCapability === 'wcag' && !activeWcagDepth) return
    setStatus('submitting')
    setError(null)
    try {
      if (activeCapability === 'seo') {
        await launchSeo()
      } else if (activeCapability === 'geo') {
        await launchGeo()
      } else {
        await launchWcagScan(activeWcagDepth!)
      }
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Launch failed')
    }
  }

  const visibleCards = fromAudion
    ? CAPABILITY_CARDS.filter((c) => c.id === 'wcag')
    : CAPABILITY_CARDS

  const composeKey =
    activeCapability === 'wcag'
      ? `compose-wcag-${activeWcagDepth ?? 'pending'}`
      : `compose-${activeCapability ?? 'none'}`

  return (
    <article className="checkion-magazine checkion-magazine--launch">
      <header className="checkion-launch-hero">
        <p className="checkion-launch-hero__eyebrow">{paths.brandLabel}</p>
        <Text role="headline" as="h1" className="checkion-launch-hero__title">
          {fromAudion ? 'Scan this page' : 'Start a run'}
        </Text>
        <p className="checkion-launch-hero__deck">
          {fromAudion
            ? 'Single-page accessibility for this AUDION step — results live in CHECKION.'
            : 'Choose a capability, drop a URL, launch. WCAG, GEO presence, or SEO coverage — one magazine to begin.'}
        </p>
      </header>

      <Panel className="checkion-launch-stage">
        <form className="checkion-scan-form checkion-scan-form--launch" onSubmit={onSubmit}>
          <div className="checkion-launch-capability">
            <div className="checkion-launch-tip-row" aria-label="Capability tips">
              <LabelWithTip tipId="launch.wcag">
                <span>WCAG</span>
              </LabelWithTip>
              <LabelWithTip tipId="launch.geo">
                <span>GEO</span>
              </LabelWithTip>
              <LabelWithTip tipId="launch.seo">
                <span>SEO</span>
              </LabelWithTip>
            </div>
            <div
              className="checkion-capability-grid"
              role="radiogroup"
              aria-label="Capability"
            >
              {visibleCards.map((card) => {
                const selected = activeCapability === card.id
                return (
                  <button
                    key={card.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`${card.label}. ${card.deck}`}
                    className={
                      selected
                        ? 'checkion-capability-tile checkion-capability-tile--selected'
                        : 'checkion-capability-tile'
                    }
                    disabled={fromAudion}
                    onClick={() => onCapabilityChange(card.id)}
                  >
                    <span className="checkion-capability-tile__kicker">{card.kicker}</span>
                    <span className="checkion-capability-tile__label">{card.label}</span>
                    <span className="checkion-capability-tile__deck">{card.deck}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {showDepth ? (
            <div
              key={`depth-${activeCapability}`}
              className="checkion-launch-depth checkion-launch-reveal"
            >
              <div className="checkion-launch-tip-row" aria-label="Depth tips">
                <LabelWithTip tipId="launch.depth.single">
                  <span>Quick single</span>
                </LabelWithTip>
                <LabelWithTip tipId="launch.depth.deep">
                  <span>Deep scan</span>
                </LabelWithTip>
              </div>
              <div
                className="checkion-depth-grid"
                role="radiogroup"
                aria-label="WCAG depth"
              >
                {WCAG_DEPTH_CARDS.map((card) => {
                  const selected = activeWcagDepth === card.id
                  return (
                    <button
                      key={card.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={`${card.label}. ${card.deck}`}
                      className={
                        selected
                          ? 'checkion-depth-tile checkion-depth-tile--selected'
                          : 'checkion-depth-tile'
                      }
                      onClick={() => onWcagDepthChange(card.id)}
                    >
                      <span className="checkion-depth-tile__kicker">{card.kicker}</span>
                      <span className="checkion-depth-tile__label">{card.label}</span>
                      <span className="checkion-depth-tile__deck">{card.deck}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          {fromAudion && projectId ? (
            <Hint panel>
              CHECKION project:{' '}
              <a className="ds-link" href={paths.routes.projectDetail(projectId)}>
                {activeProjectName}
              </a>
              {correlation?.platformProjectId
                ? ` · Collection ${correlation.platformProjectId}`
                : null}
              {correlation?.audionRunId ? ` · run ${correlation.audionRunId}` : null}
            </Hint>
          ) : null}

          {showCompose ? (
            <div key={composeKey} className="checkion-launch-compose checkion-launch-reveal">
              <div className="checkion-launch-compose__lead">
                {activeCapability === 'geo' ? (
                  <div className="checkion-launch-compose__row checkion-launch-compose__row--geo">
                    <Field
                      className="checkion-launch-compose__url"
                      label="URL"
                      size="md"
                      hint="Target host for citation checks (or use company name)"
                    >
                      <Input
                        value={url}
                        onChange={(e) => onUrlChange(e.target.value)}
                        block
                        aria-label="Scan URL"
                        placeholder="https://"
                      />
                    </Field>

                    <Field
                      className="checkion-launch-compose__company"
                      label="Company name"
                      size="md"
                      hint="Brand when you do not have a URL yet"
                    >
                      <Input
                        value={companyName}
                        onChange={(e) => onCompanyNameChange(e.target.value)}
                        block
                        aria-label="Company name"
                        placeholder="Acme"
                      />
                    </Field>

                    <Field
                      className="checkion-launch-compose__project"
                      label="Project"
                      size="md"
                      hint="Optional — select, create, or auto-create on Start"
                    >
                      <div className="checkion-launch-compose__project-stack">
                        <Select
                          value={projectId}
                          onChange={setProjectId}
                          size="md"
                          placeholder="Select or create project…"
                          options={projectOptions.map((p) => ({
                            value: p.id,
                            label: p.name,
                          }))}
                          aria-label="Project"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="checkion-launch-compose__new-project"
                          onClick={openCreateProject}
                          disabled={status === 'submitting'}
                        >
                          + New project
                        </Button>
                      </div>
                    </Field>
                  </div>
                ) : (
                  <div className="checkion-launch-compose__row">
                    <Field
                      className="checkion-launch-compose__url"
                      label="URL"
                      size="md"
                      hint={
                        activeCapability === 'seo'
                          ? 'Host root to crawl for SEO coverage'
                          : 'Page to evaluate'
                      }
                    >
                      <Input
                        value={url}
                        onChange={(e) => onUrlChange(e.target.value)}
                        required
                        block
                        aria-label="Scan URL"
                        placeholder="https://"
                      />
                    </Field>

                    {!fromAudion ? (
                      <Field
                        className="checkion-launch-compose__project"
                        label="Project"
                        size="md"
                        hint="CHECKION Collection capability"
                      >
                        <Select
                          value={projectId}
                          onChange={setProjectId}
                          size="md"
                          options={projectOptions.map((p) => ({ value: p.id, label: p.name }))}
                          aria-label="Project"
                        />
                      </Field>
                    ) : null}
                  </div>
                )}

                {activeCapability === 'geo' ? (
                  <div className="checkion-launch-compose__geo">
                    <GeoQueryList
                      value={geoQueries}
                      onChange={setGeoQueries}
                      url={geoSuggestUrl}
                      companyName={companyName}
                      projectId={projectId || undefined}
                      platformProjectId={
                        correlation?.platformProjectId ||
                        (activeProject?.platformProjectId &&
                        !activeProject.platformProjectId.startsWith('plx-local-')
                          ? activeProject.platformProjectId
                          : undefined)
                      }
                      project={
                        activeProject
                          ? { name: activeProject.name, domain: activeProject.domain }
                          : undefined
                      }
                      disabled={status === 'submitting'}
                    />
                    <GeoModelPicker
                      value={geoModels}
                      onChange={setGeoModels}
                      disabled={status === 'submitting'}
                    />
                  </div>
                ) : null}
              </div>

              <div className="checkion-launch-compose__footer">
                <div className="checkion-scan-form__actions checkion-launch-compose__actions">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={
                      status === 'submitting' ||
                      (activeCapability === 'geo'
                        ? !geoTargetReady
                        : !projectId || !url.trim())
                    }
                  >
                    {status === 'submitting' ? modeCopy.loading : modeCopy.cta}
                  </Button>
                </div>
              </div>

              {activeCapability === 'geo' && !geoTargetReady ? (
                <Alert tone="info">Provide a URL or company name to start a GEO check.</Alert>
              ) : null}

              {activeCapability === 'geo' && geoTargetReady && !projectId.trim() ? (
                <Alert tone="info">
                  No project selected — Start will auto-create one from the target URL or company
                  name (federation company from session or PLEXON_DEMO_COMPANY_ID when set).
                </Alert>
              ) : null}

              {error ? <Alert tone="error">{error}</Alert> : null}
            </div>
          ) : null}
        </form>
      </Panel>

      {activeCapability === 'geo' ? (
        <ProjectFormDialog
          open={createProjectOpen}
          mode="create"
          initial={
            createProjectPrefill
              ? {
                  id: '',
                  name: createProjectPrefill.name,
                  domain: createProjectPrefill.domain,
                  description: createProjectPrefill.description,
                  platformProjectId: '',
                  capabilityStatus: 'pending',
                }
              : undefined
          }
          redirectOnCreate={false}
          onClose={() => setCreateProjectOpen(false)}
          onSaved={onProjectCreated}
        />
      ) : null}
    </article>
  )
}
