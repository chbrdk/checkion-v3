'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Alert,
  Button,
  Field,
  Hint,
  Input,
  LoadingText,
  Panel,
  SectionChrome,
  TopStatus,
} from '@msqdx/ui'
import { Select } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'

const DEFAULT_DEMO_URL = 'https://www.bosch-ebike.com/de/'

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
  defaultMode?: 'single' | 'deep'
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
  const [url, setUrl] = useState(defaultUrl?.trim() || DEFAULT_DEMO_URL)
  const [mode, setMode] = useState<'single' | 'deep'>(fromAudion ? 'single' : defaultMode)
  const [projectId, setProjectId] = useState(
    defaultProjectId && projects.some((p) => p.id === defaultProjectId)
      ? defaultProjectId
      : (projects[0]?.id ?? ''),
  )
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const activeProjectName =
    projectLabel || projects.find((p) => p.id === projectId)?.name || projectId

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setError(null)
    try {
      const launchMode = fromAudion ? 'single' : mode
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
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Launch failed')
    }
  }

  return (
    <article className="checkion-magazine checkion-magazine--launch">
      <Panel className="checkion-magazine-band">
        <SectionChrome
          quiet
          title={fromAudion ? 'Scan this page (from AUDION)' : 'Single scan launch'}
          meta={fromAudion ? 'AUDION · single' : 'fixtures'}
          metaTone="accent"
          as="h2"
        />
        {fromAudion ? (
          <Hint panel>
            CHECKION owns accessibility scan results for this Collection. Confirm project and URL,
            then launch a single-page scan — Journey explore stays in AUDION.
          </Hint>
        ) : (
          <Hint panel>
            Dummy mode synthesizes a completed single-page result instantly — no live crawler. Deep
            mode also creates a light domain payload.
          </Hint>
        )}

        {fromAudion && projectId ? (
          <Hint panel>
            CHECKION project:{' '}
            <a className="ds-link" href={paths.routes.projectDetail(projectId)}>
              {activeProjectName}
            </a>
            {correlation?.platformProjectId
              ? ` · Collection ${correlation.platformProjectId}`
              : null}
          </Hint>
        ) : null}

        <form className="checkion-scan-form" onSubmit={onSubmit}>
          <Field label="URL" hint="Page to evaluate">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              aria-label="Scan URL"
            />
          </Field>
          <Field
            label="Mode"
            hint={fromAudion ? 'AUDION handoff is locked to single-page' : 'MVP: single or deep'}
          >
            <Select
              value={fromAudion ? 'single' : mode}
              onChange={(value) => {
                if (fromAudion) return
                setMode(value as 'single' | 'deep')
              }}
              options={
                fromAudion
                  ? [{ value: 'single', label: 'Single page' }]
                  : [
                      { value: 'single', label: 'Single page' },
                      { value: 'deep', label: 'Deep crawl' },
                    ]
              }
              aria-label="Scan mode"
            />
          </Field>
          <Field label="Project" hint="CHECKION Collection capability">
            <Select
              value={projectId}
              onChange={setProjectId}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              aria-label="Project"
            />
          </Field>

          {correlation?.audionRunId ? (
            <Hint panel>AUDION run: {correlation.audionRunId}</Hint>
          ) : null}

          <div className="checkion-scan-form__actions">
            {status === 'submitting' ? (
              <LoadingText>Synthesizing dummy result…</LoadingText>
            ) : (
              <Button type="submit" disabled={!projectId || !url}>
                Launch {(fromAudion ? 'single' : mode) === 'single' ? 'single' : 'deep'} scan
              </Button>
            )}
            {status === 'idle' ? (
              <TopStatus
                level="ok"
                primary="Ready"
                secondary={fromAudion ? 'opens /results/…/overview' : 'fixture corpus'}
              />
            ) : null}
            {status === 'error' ? (
              <TopStatus level="critical" primary="Launch failed" secondary="retry" />
            ) : null}
          </div>

          {error ? <Alert tone="error">{error}</Alert> : null}
        </form>
      </Panel>

      <Panel className="checkion-magazine-band">
        <SectionChrome quiet title="Open a finished single scan" meta="demo" as="h3" />
        <Hint panel>Jump straight into the magazine result for the Bosch home fixture.</Hint>
        <div className="checkion-scan-form__actions">
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              router.push(paths.routes.resultSection('scan-single-1', 'overview'))
            }
          >
            Open scan-single-1
          </Button>
        </div>
      </Panel>
    </article>
  )
}
