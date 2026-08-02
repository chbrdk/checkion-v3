'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Button, Field, Input, Text } from '@msqdx/ui'
import type { ProjectDetail, ProjectSummary } from '@checkion-v3/contracts'
import { ConfirmDialog, Dialog } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'

type ProjectFormState = {
  name: string
  domain: string
  description: string
}

function emptyForm(): ProjectFormState {
  return { name: '', domain: '', description: '' }
}

function formFromProject(project: Pick<ProjectDetail, 'name' | 'domain' | 'description'>): ProjectFormState {
  return {
    name: project.name,
    domain: project.domain,
    description: project.description,
  }
}

export function ProjectFormDialog({
  open,
  mode,
  initial,
  platformProjectId,
  onClose,
  onSaved,
}: {
  open: boolean
  mode: 'create' | 'edit'
  initial?: Pick<ProjectDetail, 'id' | 'name' | 'domain' | 'description' | 'platformProjectId' | 'capabilityStatus'>
  /** Bind create to an existing Plexon collection id. */
  platformProjectId?: string
  onClose: () => void
  onSaved?: (project: ProjectDetail) => void
}) {
  const router = useRouter()
  const [form, setForm] = useState<ProjectFormState>(emptyForm)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setBusy(false)
    setForm(initial ? formFromProject(initial) : emptyForm())
  }, [open, initial])

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      if (mode === 'create') {
        const res = await fetch(paths.routes.apiProjects, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            domain: form.domain,
            description: form.description,
            platformProjectId: platformProjectId,
          }),
        })
        if (!res.ok) throw new Error(`Create failed (${res.status})`)
        const project = (await res.json()) as ProjectDetail
        onClose()
        onSaved?.(project)
        router.push(paths.routes.projectDetail(project.id))
        router.refresh()
        return
      }

      if (!initial?.id) throw new Error('Missing project id')
      const res = await fetch(paths.routes.apiProjectDetail(initial.id), {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          domain: form.domain,
          description: form.description,
        }),
      })
      if (!res.ok) throw new Error(`Update failed (${res.status})`)
      const project = (await res.json()) as ProjectDetail
      onClose()
      onSaved?.(project)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'New project' : 'Edit project'}
      actions={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={busy || !form.name.trim() || !form.domain.trim()}>
            {mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="checkion-project-form">
        <Field label="Name" hint="CHECKION display name for this collection">
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            aria-label="Project name"
          />
        </Field>
        <Field label="Domain" hint="Primary hostname or URL">
          <Input
            value={form.domain}
            onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
            required
            aria-label="Project domain"
          />
        </Field>
        <Field label="Description" hint="Optional">
          <textarea
            className="checkion-project-form__textarea"
            value={form.description}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            rows={3}
            aria-label="Project description"
          />
        </Field>
        {mode === 'edit' && initial ? (
          <dl className="checkion-meta-grid checkion-meta-grid--compact">
            <div>
              <dt>CHECKION id</dt>
              <dd>{initial.id}</dd>
            </div>
            <div>
              <dt>Collection</dt>
              <dd>{initial.platformProjectId}</dd>
            </div>
            <div>
              <dt>Capability</dt>
              <dd>{initial.capabilityStatus}</dd>
            </div>
          </dl>
        ) : null}
        {platformProjectId && mode === 'create' ? (
          <Text role="meta">Will bind to collection {platformProjectId}.</Text>
        ) : null}
        {error ? <Alert tone="error">{error}</Alert> : null}
      </div>
    </Dialog>
  )
}

export function ProjectDeleteConfirm({
  open,
  project,
  onClose,
}: {
  open: boolean
  project: Pick<ProjectSummary, 'id' | 'name'> | null
  onClose: () => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirmDelete() {
    if (!project) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(paths.routes.apiProjectDetail(project.id), { method: 'DELETE' })
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      onClose()
      router.push(paths.routes.projects)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
      setBusy(false)
    }
  }

  return (
    <>
      <ConfirmDialog
        open={open}
        onClose={onClose}
        onConfirm={() => {
          void confirmDelete()
        }}
        title="Delete project?"
        confirmLabel={busy ? 'Deleting…' : 'Delete'}
        danger
      >
        Removes {project?.name ?? 'this project'}. Scans stay reachable under Unassigned.
        {error ? <Alert tone="error">{error}</Alert> : null}
      </ConfirmDialog>
    </>
  )
}
