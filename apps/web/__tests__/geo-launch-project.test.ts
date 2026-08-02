import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  deleteProject,
  listProjects,
  resetProjectStore,
} from '../lib/fixtures/project-store'
import { resolveGeoLaunchProjectId } from '../lib/geo-launch-project'

vi.mock('../auth', () => ({
  auth: vi.fn(async () => null),
}))

vi.mock('../lib/auth-api-token', () => ({
  getRequestUser: vi.fn(async () => null),
}))

vi.mock('../lib/plexon-auth', () => ({
  getPlexonProfile: vi.fn(async () => null),
}))

vi.mock('../lib/plexon-project-origin', () => ({
  registerCheckionProjectOnPlexon: vi.fn(async () => null),
}))

describe('resolveGeoLaunchProjectId', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    resetProjectStore()
  })

  it('uses an explicit existing project id', async () => {
    const req = new Request('http://localhost/api/geo-jobs', { method: 'POST' })
    const result = await resolveGeoLaunchProjectId(req, {
      projectId: 'proj-demo-1',
      url: 'https://example.com',
    })
    expect(result).toEqual({ ok: true, projectId: 'proj-demo-1', created: false })
  })

  it('rejects unknown explicit project ids', async () => {
    const req = new Request('http://localhost/api/geo-jobs', { method: 'POST' })
    const result = await resolveGeoLaunchProjectId(req, {
      projectId: 'proj-missing',
      url: 'https://example.com',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('project_not_found')
      expect(result.detail).toMatch(/proj-missing/)
    }
  })

  it('falls back to the first Collection project when projectId omitted', async () => {
    const req = new Request('http://localhost/api/geo-jobs', { method: 'POST' })
    const result = await resolveGeoLaunchProjectId(req, {
      url: 'https://example.com',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.created).toBe(false)
      expect(result.projectId).toMatch(/^proj-/)
    }
  })

  it('auto-creates a project when the Collection store is empty', async () => {
    for (const p of await listProjects()) {
      await deleteProject(p.id)
    }
    expect((await listProjects()).length).toBe(0)

    const req = new Request('http://localhost/api/geo-jobs', { method: 'POST' })
    const result = await resolveGeoLaunchProjectId(req, {
      url: 'https://acme.example/geo',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.created).toBe(true)
      expect(result.projectId).toMatch(/^proj-/)
    }
    const created = (await listProjects()).find((p) => p.id === (result.ok ? result.projectId : ''))
    expect(created?.domain).toBe('acme.example')
    expect(created?.name).toMatch(/GEO/)
  })
})
