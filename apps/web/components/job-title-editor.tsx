'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Button, Field, Input } from '@msqdx/ui'
import { JOB_TITLE_MAX } from '../lib/job-title'
import { Dialog } from '../lib/msqdx-ui-client'

export function JobTitleEditor({
  title,
  endpoint,
  dialogTitle,
  renameAriaLabel,
  renameTitle,
  fieldAriaLabel,
  variant = 'cover',
}: {
  title: string
  /** Absolute app path for PATCH `{ title }` */
  endpoint: string
  dialogTitle: string
  renameAriaLabel: string
  renameTitle?: string
  fieldAriaLabel: string
  variant?: 'cover' | 'folio'
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(title)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setDraft(title)
      setError(null)
    }
  }, [open, title])

  async function save() {
    const trimmed = draft.replace(/\s+/g, ' ').trim()
    if (!trimmed || trimmed.length > JOB_TITLE_MAX) {
      setError(`Name must be 1–${JOB_TITLE_MAX} characters`)
      return
    }
    if (trimmed === title) {
      setOpen(false)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error || `Rename failed (${res.status})`)
      }
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rename failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="checkion-job-title-editor" data-variant={variant}>
        <h2 className="checkion-cover__title">{title}</h2>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="checkion-job-title-editor__rename"
          onClick={() => setOpen(true)}
          aria-label={renameAriaLabel}
          title={renameTitle ?? renameAriaLabel}
        >
          Rename
        </Button>
      </div>

      <Dialog
        open={open}
        onClose={() => {
          if (!busy) setOpen(false)
        }}
        title={dialogTitle}
        className="checkion-job-rename-dialog"
        actions={
          <>
            <Button
              type="button"
              variant="ghost"
              size="md"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" size="md" disabled={busy} onClick={() => void save()}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <Field label="Name">
          <Input
            value={draft}
            maxLength={JOB_TITLE_MAX}
            disabled={busy}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void save()
              }
            }}
            aria-label={fieldAriaLabel}
          />
        </Field>
        {error ? <Alert tone="error">{error}</Alert> : null}
      </Dialog>
    </>
  )
}
