'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Button, Field, Input, Text } from '@msqdx/ui'
import type { ProjectDetail, ProjectSummary } from '@checkion-v3/contracts'
import { ConfirmDialog, Dialog } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'

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
  redirectOnCreate = true,
  onClose,
  onSaved,
}: {
  open: boolean
  mode: 'create' | 'edit'
  initial?: Pick<ProjectDetail, 'id' | 'name' | 'domain' | 'description' | 'platformProjectId' | 'capabilityStatus'>
  /** Bind create to an existing Plexon collection id. */
  platformProjectId?: string
  /** When false, stay on the current page after create (e.g. GEO launch). Default true. */
  redirectOnCreate?: boolean
  onClose: () => void
  onSaved?: (project: ProjectDetail) => void
}) {
  const router = useRouter()
  const t = useT()
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
        if (!res.ok) throw new Error(t('errors.createFailed') + ` (${res.status})`)
        const project = (await res.json()) as ProjectDetail
        onClose()
        onSaved?.(project)
        if (redirectOnCreate) {
          router.push(paths.routes.projectDetail(project.id))
        }
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
      setError(err instanceof Error ? err.message : t('errors.createFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={mode === 'create' ? t('projects.dialogCreateTitle') : t('projects.dialogEditTitle')}
      actions={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" onClick={submit} disabled={busy || !form.name.trim() || !form.domain.trim()}>
            {mode === 'create' ? t('projects.dialogCreate') : t('projects.dialogSave')}
          </Button>
        </>
      }
    >
      <div className="checkion-project-form">
        <Field label={t('projects.dialogName')} hint={t('projects.dialogNameHint')}>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            aria-label={t('projects.dialogNameAria')}
          />
        </Field>
        <Field label={t('projects.dialogDomain')} hint={t('projects.dialogDomainHint')}>
          <Input
            value={form.domain}
            onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
            required
            aria-label={t('projects.dialogDomainAria')}
          />
        </Field>
        <Field label={t('projects.dialogDescription')} hint={t('projects.dialogOptional')}>
          <textarea
            className="checkion-project-form__textarea"
            value={form.description}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            rows={3}
            aria-label={t('projects.dialogDescriptionAria')}
          />
        </Field>
        {mode === 'edit' && initial ? (
          <dl className="checkion-meta-grid checkion-meta-grid--compact">
            <div>
              <dt>{t('projects.dialogCheckionId')}</dt>
              <dd>{initial.id}</dd>
            </div>
            <div>
              <dt>{t('projects.attrCollection')}</dt>
              <dd>{initial.platformProjectId}</dd>
            </div>
            <div>
              <dt>{t('projects.attrCapability')}</dt>
              <dd>{initial.capabilityStatus}</dd>
            </div>
          </dl>
        ) : null}
        {platformProjectId && mode === 'create' ? (
          <Text role="meta">{t('projects.dialogBindCollection', { id: platformProjectId })}</Text>
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
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirmArchive() {
    if (!project) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(paths.routes.apiProjectArchive(project.id), { method: 'POST' })
      if (!res.ok) throw new Error(t('projects.archiveFailed', { status: res.status }))
      onClose()
      router.push(paths.routes.projects)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('projects.archiveFailedGeneric'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ConfirmDialog
        open={open}
        onClose={onClose}
        onConfirm={() => {
          void confirmArchive()
        }}
        title={t('projects.archiveTitle')}
        confirmLabel={busy ? t('projects.archiving') : t('projects.archiveConfirm')}
        danger
      >
        {t('projects.archiveBody', {
          name: project?.name ?? t('projects.dialogDeleteNameFallback'),
        })}
        {error ? <Alert tone="error">{error}</Alert> : null}
      </ConfirmDialog>
    </>
  )
}
