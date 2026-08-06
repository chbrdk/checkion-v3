'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DomainScanControlAction, ScanStatus } from '@checkion-v3/contracts'
import { Alert, Button, Field, Input, Text } from '@msqdx/ui'
import { ConfirmDialog, Dialog } from '../lib/msqdx-ui-client'
import { useJobNotifications } from './job-notification-center'
import { paths } from '../lib/paths'
import type { ShareResourceType } from '@checkion-v3/contracts'

function isActiveDomainStatus(status?: ScanStatus): boolean {
  return (
    status === 'queued' ||
    status === 'running' ||
    status === 'paused' ||
    status === 'cancelling'
  )
}

export function ResultActions({
  resourceId,
  resourceType = 'single',
  projectId,
  url,
  mode,
  status,
}: {
  resourceId: string
  resourceType?: ShareResourceType
  projectId: string
  url: string
  mode: 'single' | 'deep'
  status?: ScanStatus
}) {
  const router = useRouter()
  const { trackJob, controlDomainJob } = useJobNotifications()
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
      const isDomainRerun = resourceType === 'domain'
      const endpoint = isDomainRerun ? paths.routes.apiDomainScans : paths.routes.apiScans
      const body = isDomainRerun ? { projectId, url } : { projectId, mode, url }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`${isDomainRerun ? 'Restart' : 'Re-run'} failed (${res.status})`)
      const data = (await res.json()) as { id: string; domainScanId?: string }
      const isDeep = isDomainRerun || (mode === 'deep' && Boolean(data.domainScanId))
      trackJob({
        id: isDomainRerun ? data.id : isDeep ? data.domainScanId! : data.id,
        resource: isDeep ? 'domain' : 'scan',
        status: 'queued',
        title: isDomainRerun
          ? 'Deep scan restart'
          : mode === 'deep'
            ? 'Deep scan re-run'
            : 'Single scan re-run',
        href: isDomainRerun
          ? paths.routes.domainSection(data.id, 'overview')
          : isDeep
            ? paths.routes.domainSection(data.domainScanId!, 'overview')
          : paths.routes.resultSection(data.id, 'overview'),
        projectId,
        targetUrl: url,
        detail: url,
      })
      setRerunOpen(false)
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

  async function sendDomainControl(action: DomainScanControlAction) {
    if (resourceType !== 'domain') return
    setBusy(true)
    setError(null)
    try {
      await controlDomainJob(
        {
          id: resourceId,
          resource: 'domain',
          status: status ?? 'running',
          title: 'Deep scan',
          href: paths.routes.domainSection(resourceId, 'overview'),
          projectId,
          targetUrl: url,
          detail: url,
          updatedAt: new Date().toISOString(),
        },
        action,
      )
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Control failed')
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
      ) : resourceType === 'domain' ? (
        <>
          {isActiveDomainStatus(status) ? (
            <>
              {status === 'running' || status === 'queued' ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void sendDomainControl('pause')}
                >
                  Pause
                </Button>
              ) : null}
              {status === 'paused' ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void sendDomainControl('resume')}
                >
                  Resume
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void sendDomainControl('cancel')}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button type="button" size="sm" variant="ghost" onClick={() => setRerunOpen(true)}>
              {status === 'failed' || status === 'cancelled' ? 'Restart deep scan' : 'Re-run deep scan'}
            </Button>
          )}
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
        title={resourceType === 'domain' ? 'Restart deep scan?' : 'Re-run scan?'}
        confirmLabel={resourceType === 'domain' ? 'Restart' : 'Re-run'}
      >
        Queues a new {resourceType === 'domain' ? 'deep scan' : mode + ' scan'} for {url}.
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
