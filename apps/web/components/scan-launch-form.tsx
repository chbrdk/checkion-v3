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

export function ScanLaunchForm({
  projects,
  defaultMode = 'single',
  defaultProjectId,
}: {
  projects: Array<{ id: string; name: string }>
  defaultMode?: 'single' | 'deep'
  defaultProjectId?: string
}) {
  const router = useRouter()
  const [url, setUrl] = useState('https://www.bosch-ebike.com/de/')
  const [mode, setMode] = useState<'single' | 'deep'>(defaultMode)
  const [projectId, setProjectId] = useState(
    defaultProjectId && projects.some((p) => p.id === defaultProjectId)
      ? defaultProjectId
      : (projects[0]?.id ?? ''),
  )
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setError(null)
    try {
      const res = await fetch(paths.routes.apiScans, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectId, mode, url }),
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
          title="Single scan launch"
          meta="fixtures"
          metaTone="accent"
          as="h2"
        />
        <Hint panel>
          Dummy mode synthesizes a completed single-page result instantly — no live crawler. Deep
          mode also creates a light domain payload.
        </Hint>

        <form className="checkion-scan-form" onSubmit={onSubmit}>
          <Field label="URL" hint="Page to evaluate">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              aria-label="Scan URL"
            />
          </Field>
          <Field label="Mode" hint="MVP: single or deep">
            <Select
              value={mode}
              onChange={(value) => setMode(value as 'single' | 'deep')}
              options={[
                { value: 'single', label: 'Single page' },
                { value: 'deep', label: 'Deep crawl' },
              ]}
              aria-label="Scan mode"
            />
          </Field>
          <Field label="Project" hint="Collection capability">
            <Select
              value={projectId}
              onChange={setProjectId}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              aria-label="Project"
            />
          </Field>

          <div className="checkion-scan-form__actions">
            {status === 'submitting' ? (
              <LoadingText>Synthesizing dummy result…</LoadingText>
            ) : (
              <Button type="submit" disabled={!projectId || !url}>
                Launch {mode === 'single' ? 'single' : 'deep'} scan
              </Button>
            )}
            {status === 'idle' ? (
              <TopStatus level="ok" primary="Ready" secondary="fixture corpus" />
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
