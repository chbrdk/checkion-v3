import { beforeEach, describe, expect, it, vi } from 'vitest'

const isPlexonAuthConfigured = vi.fn(() => false)
const viewerCanAccessProject = vi.fn(async () => false)
const listProjectsForViewer = vi.fn(async () => [] as Array<{ id: string }>)
const getProject = vi.fn(async () => null as null | { id: string; platformProjectId?: string })
const listScans = vi.fn(async () => [] as Array<{ id: string; projectId: string }>)
const getScan = vi.fn(async () => null as null | { id: string; projectId: string })
const listDomainScans = vi.fn(async () => [] as Array<{ id: string; projectId: string }>)
const getDomainScan = vi.fn(async () => null as null | { id: string; projectId: string })
const listGeoJobs = vi.fn(async () => [] as Array<{ id: string; projectId: string }>)

vi.mock('../lib/runtime-config', () => ({
  isPlexonAuthConfigured: () => isPlexonAuthConfigured(),
}))

vi.mock('../lib/project-access', () => ({
  viewerCanAccessProject: (...args: unknown[]) => viewerCanAccessProject(...args),
}))

vi.mock('../lib/fixtures/project-store', () => ({
  getProject: (...args: unknown[]) => getProject(...args),
  listProjectsForViewer: (...args: unknown[]) => listProjectsForViewer(...args),
}))

vi.mock('../lib/fixtures/scan-store', () => ({
  getScan: (...args: unknown[]) => getScan(...args),
  listScans: (...args: unknown[]) => listScans(...args),
  getDomainScan: (...args: unknown[]) => getDomainScan(...args),
  listDomainScans: (...args: unknown[]) => listDomainScans(...args),
}))

vi.mock('../lib/fixtures/geo-store', () => ({
  listGeoJobs: (...args: unknown[]) => listGeoJobs(...args),
}))

import {
  listScansForViewer,
  listDomainScansForViewer,
  listGeoJobsForViewer,
  viewerCanAccessScan,
  viewerCanAccessDomainScan,
  viewerCanAccessGeoJob,
} from '../lib/resource-access'

describe('resource-access (Access Model B)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isPlexonAuthConfigured.mockReturnValue(false)
    viewerCanAccessProject.mockResolvedValue(false)
    listProjectsForViewer.mockResolvedValue([])
    getProject.mockResolvedValue(null)
    listScans.mockResolvedValue([
      { id: 'scan-a', projectId: 'proj-mine' },
      { id: 'scan-b', projectId: 'proj-other' },
    ])
    getScan.mockImplementation(async (id: string) => {
      const items = await listScans()
      return items.find((s) => s.id === id) ?? null
    })
    listDomainScans.mockResolvedValue([
      { id: 'dom-a', projectId: 'proj-mine' },
      { id: 'dom-b', projectId: 'proj-other' },
    ])
    getDomainScan.mockImplementation(async (id: string) => {
      const items = await listDomainScans()
      return items.find((s) => s.id === id) ?? null
    })
    listGeoJobs.mockResolvedValue([
      { id: 'geo-a', projectId: 'proj-mine' },
      { id: 'geo-b', projectId: 'proj-other' },
    ])
  })

  it('open mode returns unfiltered run lists', async () => {
    expect((await listScansForViewer(null)).map((s) => s.id)).toEqual(['scan-a', 'scan-b'])
    expect((await listDomainScansForViewer(null)).map((s) => s.id)).toEqual(['dom-a', 'dom-b'])
    expect((await listGeoJobsForViewer(null)).map((s) => s.id)).toEqual(['geo-a', 'geo-b'])
    expect(await viewerCanAccessScan('scan-b', null)).toBe(true)
  })

  it('auth mode filters lists to accessible projects only', async () => {
    isPlexonAuthConfigured.mockReturnValue(true)
    listProjectsForViewer.mockResolvedValue([{ id: 'proj-mine' }])
    viewerCanAccessProject.mockImplementation(async (project: { id: string }) => project.id === 'proj-mine')
    getProject.mockImplementation(async (id: string) =>
      id === 'proj-mine' || id === 'proj-other' ? { id } : null,
    )

    expect((await listScansForViewer('user-1')).map((s) => s.id)).toEqual(['scan-a'])
    expect((await listDomainScansForViewer('user-1')).map((s) => s.id)).toEqual(['dom-a'])
    expect((await listGeoJobsForViewer('user-1')).map((s) => s.id)).toEqual(['geo-a'])
  })

  it('auth mode returns empty lists without a viewer', async () => {
    isPlexonAuthConfigured.mockReturnValue(true)
    expect(await listScansForViewer(null)).toEqual([])
    expect(await listDomainScansForViewer(null)).toEqual([])
    expect(await listGeoJobsForViewer(null)).toEqual([])
  })

  it('auth mode detail checks fail closed for foreign projects', async () => {
    isPlexonAuthConfigured.mockReturnValue(true)
    listProjectsForViewer.mockResolvedValue([{ id: 'proj-mine' }])
    getProject.mockImplementation(async (id: string) => ({ id }))
    viewerCanAccessProject.mockImplementation(async (project: { id: string }) => project.id === 'proj-mine')

    expect(await viewerCanAccessScan('scan-a', 'user-1')).toBe(true)
    expect(await viewerCanAccessScan('scan-b', 'user-1')).toBe(false)
    expect(await viewerCanAccessDomainScan('dom-b', 'user-1')).toBe(false)
    expect(await viewerCanAccessGeoJob('geo-b', 'user-1')).toBe(false)
  })
})
