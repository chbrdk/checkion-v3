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
import { paths } from '../lib/paths'

type TrackedJobResource = 'scan' | 'domain' | 'geo'
type TrackedJobStatus = 'queued' | 'running' | 'completed' | 'failed'

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
  trackJob: (job: TrackJobInput) => void
  dismissJob: (id: string, resource: TrackedJobResource) => void
  clearFinished: () => void
  restartDomainJob: (job: TrackedJob) => Promise<void>
}

const STORAGE_KEY = 'checkion.v3.jobNotifications'
const POLL_MS = 2500

const JobNotificationsContext = createContext<JobNotificationsContextValue>({
  jobs: [],
  runningCount: 0,
  restartingKey: null,
  trackJob: () => {},
  dismissJob: () => {},
  clearFinished: () => {},
  restartDomainJob: async () => {},
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
    rawStatus === 'completed' ||
    rawStatus === 'failed'
  ) {
    return { status: rawStatus, detail, progress: data.progress }
  }
  return { detail, progress: data.progress }
}

function jobDetail(job: TrackedJob): string {
  if (job.resource === 'domain' && job.progress) {
    const prefix = `${job.progress.scanned}/${job.progress.total} pages scanned`
    return job.progress.currentUrl ? `${prefix} · ${job.progress.currentUrl}` : prefix
  }
  return job.detail || job.href
}

export function JobNotificationsProvider({ children }: { children: ReactNode }) {
  const { push } = useToast()
  const [jobs, setJobs] = useState<TrackedJob[]>([])
  const [restartingKey, setRestartingKey] = useState<string | null>(null)
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
    setJobs((prev) =>
      prev.filter((job) => job.status === 'queued' || job.status === 'running'),
    )
  }, [])

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
    const pending = jobs.filter((job) => job.status === 'queued' || job.status === 'running')
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
      runningCount: jobs.filter((job) => job.status === 'queued' || job.status === 'running').length,
      restartingKey,
      trackJob,
      dismissJob,
      clearFinished,
      restartDomainJob,
    }),
    [jobs, restartingKey, trackJob, dismissJob, clearFinished, restartDomainJob],
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

export function JobNotificationCenterButton() {
  const { jobs, runningCount, restartingKey, dismissJob, clearFinished, restartDomainJob } =
    useJobNotifications()
  const [open, setOpen] = useState(false)
  const failedCount = jobs.filter((job) => job.status === 'failed').length

  return (
    <div className="checkion-job-center">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="checkion-job-center__toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="checkion-job-center-panel"
      >
        Jobs
        {runningCount > 0 ? ` · ${runningCount}` : failedCount > 0 ? ` · ${failedCount} failed` : ''}
      </Button>
      {open ? (
        <div id="checkion-job-center-panel" className="checkion-job-center__panel">
          <div className="checkion-job-center__head">
            <div>
              <Text role="label">Notification center</Text>
              <Text role="meta">Running scans, crawls, and GEO jobs.</Text>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={clearFinished}>
              Clear finished
            </Button>
          </div>
          {jobs.length === 0 ? (
            <Text role="meta">No recent jobs.</Text>
          ) : (
            <ol className="checkion-job-center__list">
              {jobs.map((job) => (
                <li key={itemKey(job)} className="checkion-job-center__item">
                  <div className="checkion-job-center__row">
                    <div className="checkion-job-center__copy">
                      <strong>{job.title}</strong>
                      <Text role="meta">{jobDetail(job)}</Text>
                    </div>
                    <Chip static size="sm">
                      {job.status}
                    </Chip>
                  </div>
                  <div className="checkion-job-center__actions">
                    <Link href={job.href} onClick={() => setOpen(false)}>
                      Open
                    </Link>
                    {job.resource === 'domain' && job.status === 'failed' && job.projectId && job.targetUrl ? (
                      <button
                        type="button"
                        onClick={() => void restartDomainJob(job)}
                        className="checkion-job-center__dismiss"
                        disabled={restartingKey === itemKey(job)}
                      >
                        {restartingKey === itemKey(job) ? 'Restarting' : 'Restart'}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => dismissJob(job.id, job.resource)}
                      className="checkion-job-center__dismiss"
                    >
                      Dismiss
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </div>
  )
}

