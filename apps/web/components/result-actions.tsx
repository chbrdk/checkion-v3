'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DomainScanControlAction, ScanStatus } from '@checkion-v3/contracts'
import { Alert, Button, Field, Input, Text } from '@msqdx/ui'
import { ConfirmDialog, Dialog } from '../lib/msqdx-ui-client'
import { useJobNotifications } from './job-notification-center'
import { paths } from '../lib/paths'
import type { ShareResourceType } from '@checkion-v3/contracts'
import { useT } from '../lib/user-prefs'

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
  const t = useT()
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
      if (!res.ok) throw new Error(t('results.shareFailedStatus', { status: res.status }))
      const data = (await res.json()) as { token: string }
      setShareUrl(`${publicOrigin}${paths.routes.shareDetail(data.token)}`)
      setShareOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('results.shareFailed'))
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
      const actionLabel = isDomainRerun ? t('common.restart') : t('results.rerun')
      if (!res.ok) {
        throw new Error(t('results.actionFailedStatus', { action: actionLabel, status: res.status }))
      }
      const data = (await res.json()) as { id: string; domainScanId?: string }
      const isDeep = isDomainRerun || (mode === 'deep' && Boolean(data.domainScanId))
      trackJob({
        id: isDomainRerun ? data.id : isDeep ? data.domainScanId! : data.id,
        resource: isDeep ? 'domain' : 'scan',
        status: 'queued',
        title: isDomainRerun
          ? t('results.jobDeepRestart')
          : mode === 'deep'
            ? t('results.jobDeepRerun')
            : t('results.jobSingleRerun'),
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
      setError(err instanceof Error ? err.message : t('results.rerunFailed'))
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
      if (!res.ok) throw new Error(t('results.deleteFailedStatus', { status: res.status }))
      router.push(paths.routes.projectDetail(projectId))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('results.deleteFailed'))
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
          title: t('results.deepScanTitle'),
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
      setError(err instanceof Error ? err.message : t('results.controlFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="checkion-result-actions">
      <Button type="button" size="sm" onClick={openShare} disabled={busy}>
        {t('common.share')}
      </Button>
      {resourceType === 'single' ? (
        <>
          <Button type="button" size="sm" variant="ghost" onClick={() => setRerunOpen(true)}>
            {t('results.rerun')}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setDeleteOpen(true)}>
            {t('common.delete')}
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
                  {t('common.pause')}
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
                  {t('common.resume')}
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void sendDomainControl('cancel')}
              >
                {t('common.cancel')}
              </Button>
            </>
          ) : (
            <Button type="button" size="sm" variant="ghost" onClick={() => setRerunOpen(true)}>
              {status === 'failed' || status === 'cancelled'
                ? t('results.restartDeepScan')
                : t('results.rerunDeepScan')}
            </Button>
          )}
        </>
      ) : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      <Dialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={t('results.shareTitle')}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShareOpen(false)}>
              {t('common.close')}
            </Button>
            <Button size="sm" onClick={copyLink}>
              {copied ? t('common.copied') : t('common.copyLink')}
            </Button>
          </>
        }
      >
        <Text role="meta">{t('results.shareMeta')}</Text>
        <Field label={t('results.publicLink')}>
          <Input readOnly value={shareUrl} aria-label={t('results.shareLinkAria')} />
        </Field>
      </Dialog>

      <ConfirmDialog
        open={rerunOpen}
        onClose={() => setRerunOpen(false)}
        onConfirm={confirmRerun}
        title={resourceType === 'domain' ? t('results.restartDeepTitle') : t('results.rerunTitle')}
        confirmLabel={resourceType === 'domain' ? t('common.restart') : t('results.rerun')}
      >
        {t('results.rerunBody', {
          kind:
            resourceType === 'domain'
              ? t('results.deepScanKind')
              : t('results.scanKind', { mode }),
          url,
        })}
      </ConfirmDialog>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        title={t('results.deleteTitle')}
        confirmLabel={t('common.delete')}
        danger
      >
        {t('results.deleteBody')}
      </ConfirmDialog>
    </div>
  )
}
