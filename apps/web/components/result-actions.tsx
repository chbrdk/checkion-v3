'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Button, Field, Input, Text } from '@msqdx/ui'
import { ConfirmDialog, Dialog } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'
import type { ShareResourceType } from '@checkion-v3/contracts'

export function ResultActions({
  resourceId,
  resourceType = 'single',
  projectId,
  url,
  mode,
}: {
  resourceId: string
  resourceType?: ShareResourceType
  projectId: string
  url: string
  mode: 'single' | 'deep'
}) {
  const router = useRouter()
  const [shareOpen, setShareOpen] = useState(false)
  const [rerunOpen, setRerunOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const publicOrigin = useMemo(() => {
    if (typeof window !== 'undefined') return window.location.origin
    return `http://localhost:${paths.devPort}`
  }, [])

  async function openShare() {
    setBusy(true)
    setError(null)
    setCopied(false)
    try {
      const res = await fetch(paths.routes.apiShare, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ resourceType, resourceId }),
      })
      if (!res.ok) throw new Error(`Share failed (${res.status})`)
      const data = (await res.json()) as { token: string }
      setShareUrl(`${publicOrigin}${paths.routes.shareDetail(data.token)}`)
      setShareOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Share failed')
    } finally {
      setBusy(false)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  async function confirmRerun() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(paths.routes.apiScans, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectId, mode, url }),
      })
      if (!res.ok) throw new Error(`Re-run failed (${res.status})`)
      const data = (await res.json()) as { id: string }
      router.push(paths.routes.resultDetail(data.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Re-run failed')
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(paths.routes.apiScanDetail(resourceId), {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      router.push(paths.routes.projectDetail(projectId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="checkion-result-actions">
      <Button type="button" size="sm" onClick={openShare} disabled={busy}>
        Share
      </Button>
      {resourceType === 'single' ? (
        <>
          <Button type="button" size="sm" variant="ghost" onClick={() => setRerunOpen(true)}>
            Re-run
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setDeleteOpen(true)}>
            Delete
          </Button>
        </>
      ) : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      <Dialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Share result"
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShareOpen(false)}>
              Close
            </Button>
            <Button size="sm" onClick={copyLink}>
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          </>
        }
      >
        <Text role="meta">Anyone with the link can view the overview (no password in MVP).</Text>
        <Field label="Public link">
          <Input readOnly value={shareUrl} aria-label="Share link" />
        </Field>
      </Dialog>

      <ConfirmDialog
        open={rerunOpen}
        onClose={() => setRerunOpen(false)}
        onConfirm={confirmRerun}
        title="Re-run scan?"
        confirmLabel="Re-run"
      >
        Queues a new {mode} scan for {url}.
      </ConfirmDialog>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete scan?"
        confirmLabel="Delete"
        danger
      >
        Removes this scan from the local fixture store. Shared links for it will 404.
      </ConfirmDialog>
    </div>
  )
}
