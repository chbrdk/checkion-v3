'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Alert,
  Button,
  Field,
  Hint,
  Input,
  LoadingText,
  Panel,
  Text,
  Textarea,
  TopStatus,
} from '@msqdx/ui'
import { Select } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'

const DEFAULT_DEMO_URL = 'https://www.bosch-ebike.com/de/'
const DEFAULT_GEO_MODEL = 'gpt-5.4-nano'

/** Deep-link / API launch modes preserved across IA rebuilds. */
export type LaunchMode = 'seo' | 'geo' | 'single' | 'deep'

/** Primary capability on the magazine picker. */
export type LaunchCapability = 'seo' | 'geo' | 'wcag'

/** WCAG secondary depth (only when capability = WCAG). */
export type WcagDepth = 'single' | 'deep'

function hostFromUrl(raw: string): string {
  try {
    const host = new URL(raw.trim()).hostname.replace(/^www\./i, '')
    return host || 'example.com'
  } catch {
    return 'example.com'
  }
}

/** Sensible GEO prompt defaults derived from the target host. */
export function defaultGeoQueries(url: string): string[] {
  const host = hostFromUrl(url)
  const brand = host.split('.')[0] || host
  return [
    `Best alternatives to ${brand}`,
    `Who leads in ${brand} category solutions?`,
    `${brand} vs competitors for enterprise buyers`,
  ]
}

function parseLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

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

function resolveCapability(fromAudion: boolean, defaultMode: LaunchMode): LaunchCapability {
  if (fromAudion) return 'wcag'
  return capabilityFromLaunchMode(defaultMode)
}

function resolveWcagDepth(fromAudion: boolean, defaultMode: LaunchMode): WcagDepth {
  if (fromAudion) return 'single'
  return wcagDepthFromLaunchMode(defaultMode)
}

const CAPABILITY_CARDS: Array<{
  id: LaunchCapability
  label: string
  kicker: string
  deck: string
}> = [
  {
    id: 'seo',
    label: 'SEO',
    kicker: 'Findability',
    deck: 'Titles, meta, headings, and corpus coverage across the host.',
  },
  {
    id: 'geo',
    label: 'GEO',
    kicker: 'Answer engines',
    deck: 'Citations, placement, and share of voice in LLM answers.',
  },
  {
    id: 'wcag',
    label: 'WCAG',
    kicker: 'Accessibility',
    deck: 'Page or domain — contrast, structure, and assistive tech readiness.',
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
  defaultMode = 'single',
  defaultProjectId,
  defaultUrl,
  correlation,
  fromAudion = false,
  projectLabel,
}: {
  projects: Array<{ id: string; name: string }>
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
  const router = useRouter()
  const initialUrl = defaultUrl?.trim() || DEFAULT_DEMO_URL

  const [capability, setCapability] = useState<LaunchCapability>(() =>
    resolveCapability(fromAudion, defaultMode),
  )
  const [wcagDepth, setWcagDepth] = useState<WcagDepth>(() =>
    resolveWcagDepth(fromAudion, defaultMode),
  )
  const [url, setUrl] = useState(initialUrl)
  const [projectId, setProjectId] = useState(
    defaultProjectId && projects.some((p) => p.id === defaultProjectId)
      ? defaultProjectId
      : (projects[0]?.id ?? ''),
  )
  const [geoQueries, setGeoQueries] = useState(() => defaultGeoQueries(initialUrl).join('\n'))
  const [geoModels, setGeoModels] = useState(DEFAULT_GEO_MODEL)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const activeProjectName =
    projectLabel || projects.find((p) => p.id === projectId)?.name || projectId
  const activeCapability = fromAudion ? 'wcag' : capability
  const activeWcagDepth = fromAudion ? 'single' : wcagDepth

  const modeCopy = useMemo(() => {
    if (fromAudion) {
      return {
        title: 'Scan this page',
        deck: 'AUDION handed off this step URL. Confirm the Collection project, then launch a single-page accessibility scan.',
        cta: 'Launch single scan',
        loading: 'Starting single-page scan…',
        destination: '→ /results/…/overview',
      }
    }
    switch (activeCapability) {
      case 'seo':
        return {
          title: 'SEO coverage',
          deck: 'Crawl the host and open the domain magazine where SEO coverage is a first-class chapter — titles, meta, H1s, and keyword density across pages.',
          cta: 'Launch SEO crawl',
          loading: 'Starting SEO domain crawl…',
          destination: '→ /domain/…/overview',
        }
      case 'geo':
        return {
          title: 'GEO presence',
          deck: 'Ask answer engines where this host shows up — citations, placement, and competitive share of voice.',
          cta: 'Start GEO job',
          loading: 'Starting GEO job…',
          destination: '→ /geo/…/overview',
        }
      default:
        if (activeWcagDepth === 'deep') {
          return {
            title: 'Deep WCAG crawl',
            deck: 'Spider the domain from this URL and open a light corpus magazine alongside the page result.',
            cta: 'Launch deep scan',
            loading: 'Starting deep crawl…',
            destination: '→ /results/…/overview',
          }
        }
        return {
          title: 'Quick single scan',
          deck: 'One URL, one magazine result — accessibility first, with SEO and performance signals in the same reading.',
          cta: 'Launch single scan',
          loading: 'Starting single-page scan…',
          destination: '→ /results/…/overview',
        }
    }
  }, [activeCapability, activeWcagDepth, fromAudion])

  function onCapabilityChange(next: LaunchCapability) {
    if (fromAudion) return
    setCapability(next)
    setError(null)
  }

  function onWcagDepthChange(next: WcagDepth) {
    if (fromAudion) return
    setWcagDepth(next)
    setError(null)
  }

  function onUrlChange(next: string) {
    setUrl(next)
    if (activeCapability === 'geo' && geoQueries.trim() === defaultGeoQueries(url).join('\n')) {
      setGeoQueries(defaultGeoQueries(next).join('\n'))
    }
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
    const data = (await res.json()) as { id: string }
    router.push(paths.routes.resultSection(data.id, 'overview'))
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
    router.push(paths.routes.domainSection(data.id, 'overview'))
  }

  async function launchGeo() {
    const queries = parseLines(geoQueries)
    const resolvedQueries = queries.length > 0 ? queries : defaultGeoQueries(url)
    const models = parseLines(geoModels.replace(/,/g, '\n'))
    const body: Record<string, unknown> = {
      projectId,
      url,
      queries: resolvedQueries,
    }
    if (models.length > 0) body.models = models

    const res = await fetch(paths.routes.apiGeoJobs, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      let detail = `GEO launch failed (${res.status})`
      try {
        const errBody = (await res.json()) as { detail?: string; error?: string }
        if (errBody.detail) detail = errBody.detail
        else if (errBody.error) detail = errBody.error
      } catch {
        /* ignore */
      }
      throw new Error(detail)
    }
    const data = (await res.json()) as { jobId?: string; job?: { id: string } }
    const jobId = data.jobId || data.job?.id
    if (!jobId) throw new Error('GEO launch returned no job id')
    router.push(paths.routes.geoSection(jobId, 'overview'))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setError(null)
    try {
      if (activeCapability === 'seo') {
        await launchSeo()
      } else if (activeCapability === 'geo') {
        await launchGeo()
      } else {
        await launchWcagScan(activeWcagDepth)
      }
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Launch failed')
    }
  }

  const visibleCards = fromAudion
    ? CAPABILITY_CARDS.filter((c) => c.id === 'wcag')
    : CAPABILITY_CARDS

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
            : 'Choose a capability, drop a URL, launch. SEO coverage, GEO presence, or WCAG — one magazine to begin.'}
        </p>
      </header>

      <Panel className="checkion-launch-stage">
        <form className="checkion-scan-form checkion-scan-form--launch" onSubmit={onSubmit}>
          <div className="checkion-launch-capability">
            <span
              className="checkion-launch-capability__label"
              id="checkion-launch-capability-label"
            >
              Capability
            </span>
            <div
              className="checkion-capability-grid"
              role="radiogroup"
              aria-labelledby="checkion-launch-capability-label"
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
            <p className="checkion-launch-capability__hint" aria-live="polite">
              <strong>{modeCopy.title}</strong>
              <span> — {modeCopy.deck}</span>
            </p>
          </div>

          {activeCapability === 'wcag' && !fromAudion ? (
            <div className="checkion-launch-depth">
              <span className="checkion-launch-depth__label" id="checkion-launch-depth-label">
                WCAG depth
              </span>
              <div
                className="checkion-depth-grid"
                role="radiogroup"
                aria-labelledby="checkion-launch-depth-label"
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

          <div className="checkion-launch-compose">
            <div className="checkion-launch-compose__lead">
              <Field
                className="checkion-launch-compose__url"
                label="URL"
                hint={
                  activeCapability === 'geo'
                    ? 'Target host for citation checks'
                    : activeCapability === 'seo'
                      ? 'Host root to crawl for SEO coverage'
                      : 'Page to evaluate'
                }
              >
                <Input
                  value={url}
                  onChange={(e) => onUrlChange(e.target.value)}
                  required
                  aria-label="Scan URL"
                  placeholder="https://"
                />
              </Field>

              {activeCapability === 'geo' ? (
                <div className="checkion-launch-compose__geo">
                  <Field
                    label="Queries"
                    hint="One prompt per line — leave as-is for host defaults"
                  >
                    <Textarea
                      value={geoQueries}
                      onChange={(e) => setGeoQueries(e.target.value)}
                      rows={4}
                      aria-label="GEO queries"
                    />
                  </Field>
                  <Field label="Models" hint="Comma or line-separated · default gpt-5.4-nano">
                    <Input
                      value={geoModels}
                      onChange={(e) => setGeoModels(e.target.value)}
                      aria-label="GEO models"
                      placeholder={DEFAULT_GEO_MODEL}
                    />
                  </Field>
                </div>
              ) : null}
            </div>

            <div className="checkion-launch-compose__footer">
              <Field
                className="checkion-launch-compose__project"
                label="Project"
                hint="CHECKION Collection capability"
              >
                <Select
                  value={projectId}
                  onChange={setProjectId}
                  options={projects.map((p) => ({ value: p.id, label: p.name }))}
                  aria-label="Project"
                />
              </Field>

              <div className="checkion-scan-form__actions checkion-launch-compose__actions">
                {status === 'submitting' ? (
                  <LoadingText>{modeCopy.loading}</LoadingText>
                ) : (
                  <Button type="submit" disabled={!projectId || !url.trim()}>
                    {modeCopy.cta}
                  </Button>
                )}
                {status === 'idle' ? (
                  <TopStatus level="ok" primary="Ready" secondary={modeCopy.destination} />
                ) : null}
                {status === 'error' ? (
                  <TopStatus level="critical" primary="Launch failed" secondary="retry" />
                ) : null}
              </div>
            </div>

            {error ? <Alert tone="error">{error}</Alert> : null}
          </div>
        </form>
      </Panel>

      {!fromAudion ? (
        <nav className="checkion-launch-demos" aria-label="Open fixture demos">
          <span className="checkion-launch-demos__label">Try a finished fixture</span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(paths.routes.domainSection('domain-1', 'overview'))}
          >
            SEO · domain-1
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(paths.routes.geoSection('geo-1', 'overview'))}
          >
            GEO · geo-1
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(paths.routes.resultSection('scan-single-1', 'overview'))}
          >
            WCAG · scan-single-1
          </Button>
        </nav>
      ) : null}

    </article>
  )
}
