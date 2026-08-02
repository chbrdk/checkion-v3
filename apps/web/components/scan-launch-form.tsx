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
  ToggleGroup,
  TopStatus,
} from '@msqdx/ui'
import { Select } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'

const DEFAULT_DEMO_URL = 'https://www.bosch-ebike.com/de/'
const DEFAULT_GEO_MODEL = 'gpt-5.4-nano'

export type LaunchMode = 'single' | 'deep' | 'geo'

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

function resolveLaunchMode(
  fromAudion: boolean,
  defaultMode: LaunchMode,
): LaunchMode {
  if (fromAudion) return 'single'
  return defaultMode
}

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
  const [url, setUrl] = useState(initialUrl)
  const [mode, setMode] = useState<LaunchMode>(resolveLaunchMode(fromAudion, defaultMode))
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
  const activeMode = fromAudion ? 'single' : mode

  const modeCopy = useMemo(() => {
    if (fromAudion) {
      return {
        title: 'Scan this page',
        deck: 'AUDION handed off this step URL. Confirm the Collection project, then launch a single-page accessibility scan.',
        cta: 'Launch single scan',
        loading: 'Starting single-page scan…',
      }
    }
    switch (activeMode) {
      case 'deep':
        return {
          title: 'Deep crawl',
          deck: 'Spider the domain from this URL and open a light corpus magazine alongside the page result.',
          cta: 'Launch deep crawl',
          loading: 'Starting deep crawl…',
        }
      case 'geo':
        return {
          title: 'GEO presence',
          deck: 'Ask answer engines where this host shows up — citations, placement, and competitive share of voice.',
          cta: 'Start GEO job',
          loading: 'Starting GEO job…',
        }
      default:
        return {
          title: 'Single page',
          deck: 'One URL, one magazine result — accessibility, SEO, performance, and more in one reading.',
          cta: 'Launch single scan',
          loading: 'Starting single-page scan…',
        }
    }
  }, [activeMode, fromAudion])

  function onModeChange(next: string) {
    if (fromAudion) return
    if (next === 'single' || next === 'deep' || next === 'geo') {
      setMode(next)
      setError(null)
    }
  }

  function onUrlChange(next: string) {
    setUrl(next)
    if (activeMode === 'geo' && geoQueries.trim() === defaultGeoQueries(url).join('\n')) {
      setGeoQueries(defaultGeoQueries(next).join('\n'))
    }
  }

  async function launchScan(launchMode: 'single' | 'deep') {
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
      if (activeMode === 'geo') {
        await launchGeo()
      } else {
        await launchScan(activeMode)
      }
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Launch failed')
    }
  }

  const modeOptions = fromAudion
    ? [{ value: 'single', label: 'Single' }]
    : [
        { value: 'single', label: 'Single' },
        { value: 'deep', label: 'Deep' },
        { value: 'geo', label: 'GEO' },
      ]

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
            : 'Pick a mode, drop a URL, launch. Single page, deep crawl, or GEO presence — one place to begin.'}
        </p>
      </header>

      <Panel className="checkion-launch-stage">
        <form className="checkion-scan-form checkion-scan-form--launch" onSubmit={onSubmit}>
          <div className="checkion-launch-mode">
            <span className="checkion-launch-mode__label" id="checkion-launch-mode-label">
              Mode
            </span>
            <ToggleGroup
              aria-label="Launch mode"
              value={activeMode}
              onChange={onModeChange}
              size="md"
              options={modeOptions}
            />
            <p className="checkion-launch-mode__hint" aria-live="polite">
              <strong>{modeCopy.title}</strong>
              <span> — {modeCopy.deck}</span>
            </p>
          </div>

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

          <Field label="URL" hint={activeMode === 'geo' ? 'Target host for citation checks' : 'Page to evaluate'}>
            <Input
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              required
              aria-label="Scan URL"
              placeholder="https://"
            />
          </Field>

          {activeMode === 'geo' ? (
            <>
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
            </>
          ) : null}

          <Field label="Project" hint="CHECKION Collection capability">
            <Select
              value={projectId}
              onChange={setProjectId}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              aria-label="Project"
            />
          </Field>

          <div className="checkion-scan-form__actions">
            {status === 'submitting' ? (
              <LoadingText>{modeCopy.loading}</LoadingText>
            ) : (
              <Button type="submit" disabled={!projectId || !url.trim()}>
                {modeCopy.cta}
              </Button>
            )}
            {status === 'idle' ? (
              <TopStatus
                level="ok"
                primary="Ready"
                secondary={
                  fromAudion
                    ? '→ /results/…/overview'
                    : activeMode === 'geo'
                      ? '→ /geo/…/overview'
                      : '→ /results/…/overview'
                }
              />
            ) : null}
            {status === 'error' ? (
              <TopStatus level="critical" primary="Launch failed" secondary="retry" />
            ) : null}
          </div>

          {error ? <Alert tone="error">{error}</Alert> : null}
        </form>
      </Panel>

      {!fromAudion ? (
        <nav className="checkion-launch-demos" aria-label="Open fixture demos">
          <span className="checkion-launch-demos__label">Try a finished fixture</span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(paths.routes.resultSection('scan-single-1', 'overview'))}
          >
            Single · scan-single-1
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(paths.routes.geoSection('geo-1', 'overview'))}
          >
            GEO · geo-1
          </Button>
        </nav>
      ) : null}
    </article>
  )
}
