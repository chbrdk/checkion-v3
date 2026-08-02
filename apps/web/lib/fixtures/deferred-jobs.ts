/** Deferred-slice dummy jobs — not wired to real GEO/Journey/Report engines. */

export type DeferredJobStatus = 'queued' | 'running' | 'completed' | 'deferred'

export interface DeferredJobCard {
  id: string
  title: string
  projectId: string
  status: DeferredJobStatus
  summary: string
  updatedAt: string
}

export const JOURNEY_JOB_FIXTURES: DeferredJobCard[] = [
  {
    id: 'journey-1',
    title: 'Checkout path — Shop',
    projectId: 'proj-demo-3',
    status: 'deferred',
    summary: 'Journey agent stub. Will reuse the v3 island agent service.',
    updatedAt: '2026-07-25T15:00:00.000Z',
  },
  {
    id: 'journey-2',
    title: 'Service finder — Bosch',
    projectId: 'proj-demo-1',
    status: 'deferred',
    summary: 'Dummy session — no live browser agent in fixture mode.',
    updatedAt: '2026-07-19T11:00:00.000Z',
  },
]

export const REPORT_JOB_FIXTURES: DeferredJobCard[] = [
  {
    id: 'report-1',
    title: 'Weekly quality digest — Bosch',
    projectId: 'proj-demo-1',
    status: 'deferred',
    summary: 'Aggregated single + deep scores as a future magazine report.',
    updatedAt: '2026-07-28T18:00:00.000Z',
  },
  {
    id: 'report-2',
    title: 'Shop accessibility rollup',
    projectId: 'proj-demo-3',
    status: 'deferred',
    summary: 'Dummy multi-agent report card.',
    updatedAt: '2026-07-22T10:00:00.000Z',
  },
]
