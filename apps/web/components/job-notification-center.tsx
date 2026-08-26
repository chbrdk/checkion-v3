'use client'

import Link from 'next/link'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Button, Chip, Text } from '../lib/msqdx-ui'
import { useToast } from '../lib/msqdx-ui-client'
import type { DomainScanControlAction, ScanStatus } from '@checkion-v3/contracts'
import type { TipId } from '../lib/help-tips'
import { paths } from '../lib/paths'
import { LabelWithTip } from './help-tip'
import { NavIconJobs } from './nav-icons'
import { useT } from '../lib/user-prefs'
import type { Translator } from '../lib/i18n'

type TrackedJobResource = 'scan' | 'domain' | 'geo'
type TrackedJobStatus = ScanStatus

const JOB_STATUS_TIP: Partial<Record<TrackedJobStatus, TipId>> = {
  queued: 'job.status.queued',
  running: 'job.status.running',
  paused: 'job.status.paused',
  cancelling: 'job.status.cancelling',
  completed: 'job.status.completed',
  failed: 'job.status.failed',
  cancelled: 'job.status.cancelled',
}

function isActiveJobStatus(status: TrackedJobStatus): boolean {
  return (
    status === 'queued' ||
    status === 'running' ||
    status === 'paused' ||
    status === 'cancelling'
  )
}

type TrackedJobProgress = {
  scanned: number
  total: number
  currentUrl?: string
}

export type TrackedJob = {
  id: string
  resource: TrackedJobResource
  title: string
  href: string
  status: TrackedJobStatus
  projectId?: string
  targetUrl?: string
  detail?: string
  progress?: TrackedJobProgress
  updatedAt: string
}

type TrackJobInput = Omit<TrackedJob, 'updatedAt'>

type JobNotificationsContextValue = {
  jobs: TrackedJob[]
  runningCount: number
  restartingKey: string | null
  controllingKey: string | null
  trackJob: (job: TrackJobInput) => void
  dismissJob: (id: string, resource: TrackedJobResource) => void
  clearFinished: () => void
  restartDomainJob: (job: TrackedJob) => Promise<void>
  controlDomainJob: (job: TrackedJob, action: DomainScanControlAction) => Promise<void>
}

const STORAGE_KEY = 'checkion.v3.jobNotifications'
const POLL_MS = 2500

const JobNotificationsContext = createContext<JobNotificationsContextValue>({
  jobs: [],
  runningCount: 0,
  restartingKey: null,
  controllingKey: null,
  trackJob: () => {},
  dismissJob: () => {},
  clearFinished: () => {},
  restartDomainJob: async () => {},
  controlDomainJob: async () => {},
})

function toastCopy(job: TrackJobInput | TrackedJob): string {
  switch (job.status) {
    case 'queued':
      return `${job.title} queued`
    case 'running':
      return `${job.title} in progress`
    case 'completed':
      return `${job.title} ready`
    case 'failed':
      return `${job.title} failed`
    case 'paused':
      return `${job.title} paused`
    case 'cancelling':
      return `${job.title} stopping`
    case 'cancelled':
      return `${job.title} cancelled`
  }
}

function storageSafeParse(raw: string | null): TrackedJob[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as TrackedJob[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function itemKey(job: Pick<TrackedJob, 'resource' | 'id'>): string {
  return `${job.resource}:${job.id}`
}

async function readRemoteStatus(job: TrackedJob): Promise<{
  status?: TrackedJobStatus
  detail?: string
  progress?: TrackedJobProgress
}> {
  const endpoint =
    job.resource === 'scan'
      ? paths.routes.apiScanDetail(job.id)
      : job.resource === 'domain'
        ? paths.routes.apiDomainScanDetail(job.id)
        : paths.routes.apiGeoJobDetail(job.id)
  const res = await fetch(endpoint, { cache: 'no-store' })
  if (!res.ok) {
    return {
      status: 'failed',
      detail: `Request failed (${res.status})`,
    }
  }
  const data = (await res.json()) as {
    status?: string
    progress?: TrackedJobProgress
    error?: string
    job?: { status?: string; error?: string }
    payload?: { error?: string }
  }
  const rawStatus = job.resource === 'geo' ? data.job?.status ?? data.status : data.status
  const detail = data.job?.error ?? data.payload?.error ?? data.error
  if (
    rawStatus === 'queued' ||
    rawStatus === 'running' ||
    rawStatus === 'paused' ||
    rawStatus === 'cancelling' ||
    rawStatus === 'completed' ||
    rawStatus === 'failed' ||
    rawStatus === 'cancelled'
  ) {
    return { status: rawStatus, detail, progress: data.progress }
  }
  return { detail, progress: data.progress }
}

function jobDetail(job: TrackedJob, t: Translator): string {
  if (job.resource === 'domain' && job.progress) {
    const prefix = t('jobs.pagesScanned', {
      scanned: job.progress.scanned,
      total: job.progress.total,
    })
    return job.progress.currentUrl ? `${prefix} · ${job.progress.currentUrl}` : prefix
  }
  return job.detail || job.href
}

export function JobNotificationsProvider({ children }: { children: ReactNode }) {
  const { push } = useToast()
  const [jobs, setJobs] = useState<TrackedJob[]>([])
  const [restartingKey, setRestartingKey] = useState<string | null>(null)
  const [controllingKey, setControllingKey] = useState<string | null>(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    setJobs(storageSafeParse(window.localStorage.getItem(STORAGE_KEY)))
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!mountedRef.current) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs))
  }, [jobs])

  const trackJob = useCallback(
    (job: TrackJobInput) => {
      const next: TrackedJob = {
        ...job,
        updatedAt: new Date().toISOString(),
      }
      setJobs((prev) => {
        const key = itemKey(next)
        const existing = prev.find((entry) => itemKey(entry) === key)
        const merged = existing ? { ...existing, ...next, updatedAt: next.updatedAt } : next
        const rest = prev.filter((entry) => itemKey(entry) !== key)
        return [merged, ...rest].slice(0, 24)
      })
      push({ message: toastCopy(next), tone: 'info' })
    },
    [push],
  )

  const dismissJob = useCallback((id: string, resource: TrackedJobResource) => {
    setJobs((prev) => prev.filter((job) => itemKey(job) !== itemKey({ id, resource })))
  }, [])

  const clearFinished = useCallback(() => {
    setJobs((prev) => prev.filter((job) => isActiveJobStatus(job.status)))
  }, [])

  const controlDomainJob = useCallback(
    async (job: TrackedJob, action: DomainScanControlAction) => {
      if (job.resource !== 'domain') return
      const key = itemKey(job)
      setControllingKey(key)
      try {
        const res = await fetch(paths.routes.apiDomainScanControl(job.id), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action }),
        })
        const data = (await res.json()) as { status?: TrackedJobStatus; error?: string }
        if (!res.ok) throw new Error(data.error ?? `Control failed (${res.status})`)
        trackJob({
          ...job,
          status: data.status ?? job.status,
        })
      } catch (err) {
        push({
          message: err instanceof Error ? err.message : 'Control failed',
          tone: 'error',
        })
      } finally {
        setControllingKey(null)
      }
    },
    [push, trackJob],
  )

  const restartDomainJob = useCallback(
    async (job: TrackedJob) => {
      if (job.resource !== 'domain' || !job.projectId || !job.targetUrl) return
      const key = itemKey(job)
      setRestartingKey(key)
      try {
        const res = await fetch(paths.routes.apiDomainScans, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ projectId: job.projectId, url: job.targetUrl }),
        })
        if (!res.ok) throw new Error(`Restart failed (${res.status})`)
        const data = (await res.json()) as { id: string }
        trackJob({
          id: data.id,
          resource: 'domain',
          status: 'queued',
          title: job.title,
          href: paths.routes.domainSection(data.id, 'overview'),
          projectId: job.projectId,
          targetUrl: job.targetUrl,
          detail: job.targetUrl,
        })
      } catch (err) {
        push({
          message: err instanceof Error ? err.message : 'Restart failed',
          tone: 'error',
        })
      } finally {
        setRestartingKey(null)
      }
    },
    [push, trackJob],
  )

  useEffect(() => {
    const pending = jobs.filter((job) => isActiveJobStatus(job.status))
    if (pending.length === 0) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const tick = async () => {
      const updates = await Promise.all(
        pending.map(async (job) => ({
          key: itemKey(job),
          prevStatus: job.status,
          ...(await readRemoteStatus(job)),
        })),
      )
      if (cancelled) return
      setJobs((prev) =>
        prev.map((job) => {
          const update = updates.find((entry) => entry.key === itemKey(job))
          if (!update) return job
          const statusChanged = Boolean(update.status && update.status !== job.status)
          const detailChanged = typeof update.detail === 'string' && update.detail !== job.detail
          const progressChanged =
            JSON.stringify(update.progress ?? null) !== JSON.stringify(job.progress ?? null)
          if (!statusChanged && !detailChanged && !progressChanged) return job
          const next = {
            ...job,
            status: update.status ?? job.status,
            detail: update.detail ?? job.detail,
            progress: update.progress ?? job.progress,
            updatedAt: new Date().toISOString(),
          }
          if (statusChanged) {
            push({
              message: toastCopy(next),
              tone: next.status === 'failed' ? 'error' : next.status === 'completed' ? 'ok' : 'info',
            })
          }
          return next
        }),
      )
      timer = setTimeout(() => {
        void tick()
      }, POLL_MS)
    }

    void tick()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [jobs, push])

  const value = useMemo<JobNotificationsContextValue>(
    () => ({
      jobs,
      runningCount: jobs.filter((job) => isActiveJobStatus(job.status)).length,
      restartingKey,
      controllingKey,
      trackJob,
      dismissJob,
      clearFinished,
      restartDomainJob,
      controlDomainJob,
    }),
    [jobs, restartingKey, controllingKey, trackJob, dismissJob, clearFinished, restartDomainJob, controlDomainJob],
  )

  return (
    <JobNotificationsContext.Provider value={value}>
      {children}
    </JobNotificationsContext.Provider>
  )
}

export function useJobNotifications() {
  return useContext(JobNotificationsContext)
}

/** Badge overlaid on the rail Jobs icon when work is active or failed. */
export function JobsRailIcon({
  runningCount,
  failedCount,
}: {
  runningCount: number
  failedCount: number
}) {
  const badge =
    runningCount > 0 ? String(runningCount) : failedCount > 0 ? String(failedCount) : null
  return (
    <span
      className="checkion-job-center__rail-icon"
      data-tone={runningCount > 0 ? 'live' : failedCount > 0 ? 'fail' : undefined}
    >
      <NavIconJobs />
      {badge ? <span className="checkion-job-center__rail-badge">{badge}</span> : null}
    </span>
  )
}

export function JobNotificationCenterPanel({
  open,
  onClose,
  railEdge = 'left',
}: {
  open: boolean
  onClose: () => void
  railEdge?: 'left' | 'right' | 'top' | 'bottom'
}) {
  const { jobs, restartingKey, controllingKey, dismissJob, clearFinished, restartDomainJob, controlDomainJob } =
    useJobNotifications()
  const t = useT()
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Element | null
      if (!target) return
      if (panelRef.current?.contains(target)) return
      const railControl = target.closest?.('.nav-rail .rail-link')
      const aria = railControl?.getAttribute('aria-label') ?? ''
      if (aria === t('nav.jobs') || aria.startsWith(`${t('nav.jobs')},`)) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onPointer)
    }
  }, [open, onClose, t])

  if (!open) return null

  const edge =
    railEdge === 'right' ? 'right' : railEdge === 'top' || railEdge === 'bottom' ? 'left' : 'left'

  return (
    <div
      ref={panelRef}
      id="checkion-job-center-panel"
      className="checkion-job-center checkion-job-center--rail"
      data-edge={edge}
      role="dialog"
      aria-label={t('jobs.aria')}
    >
      <div className="checkion-job-center__panel">
        <div className="checkion-job-center__head">
          <div>
            <Text role="label">{t('jobs.title')}</Text>
            <Text role="meta">{t('jobs.meta')}</Text>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={clearFinished}>
            {t('jobs.clearFinished')}
          </Button>
        </div>
        {jobs.length === 0 ? (
          <Text role="meta">{t('jobs.empty')}</Text>
        ) : (
          <ol className="checkion-job-center__list">
            {jobs.map((job) => (
              <li key={itemKey(job)} className="checkion-job-center__item">
                <div className="checkion-job-center__row">
                  <div className="checkion-job-center__copy">
                    <strong>{job.title}</strong>
                    <Text role="meta">{jobDetail(job, t)}</Text>
                  </div>
                  <div className="checkion-job-center__status">
                    {JOB_STATUS_TIP[job.status] ? (
                      <LabelWithTip tipId={JOB_STATUS_TIP[job.status]!}>
                        <Chip static size="sm">
                          {job.status}
                        </Chip>
                      </LabelWithTip>
                    ) : (
                      <Chip static size="sm">
                        {job.status}
                      </Chip>
                    )}
                  </div>
                </div>
                <div className="checkion-job-center__actions">
                  <Link href={job.href} onClick={onClose}>
                    {t('common.open')}
                  </Link>
                  {job.resource === 'domain' &&
                  (job.status === 'running' || job.status === 'queued') ? (
                    <button
                      type="button"
                      onClick={() => void controlDomainJob(job, 'pause')}
                      className="checkion-job-center__dismiss"
                      disabled={controllingKey === itemKey(job)}
                    >
                      {t('common.pause')}
                    </button>
                  ) : null}
                  {job.resource === 'domain' && job.status === 'paused' ? (
                    <button
                      type="button"
                      onClick={() => void controlDomainJob(job, 'resume')}
                      className="checkion-job-center__dismiss"
                      disabled={controllingKey === itemKey(job)}
                    >
                      {t('common.resume')}
                    </button>
                  ) : null}
                  {job.resource === 'domain' && isActiveJobStatus(job.status) ? (
                    <button
                      type="button"
                      onClick={() => void controlDomainJob(job, 'cancel')}
                      className="checkion-job-center__dismiss"
                      disabled={controllingKey === itemKey(job)}
                    >
                      {t('common.cancel')}
                    </button>
                  ) : null}
                  {job.resource === 'domain' &&
                  (job.status === 'failed' || job.status === 'cancelled') &&
                  job.projectId &&
                  job.targetUrl ? (
                    <button
                      type="button"
                      onClick={() => void restartDomainJob(job)}
                      className="checkion-job-center__dismiss"
                      disabled={restartingKey === itemKey(job)}
                    >
                      {restartingKey === itemKey(job) ? t('common.restarting') : t('common.restart')}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => dismissJob(job.id, job.resource)}
                    className="checkion-job-center__dismiss"
                  >
                    {t('common.dismiss')}
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

