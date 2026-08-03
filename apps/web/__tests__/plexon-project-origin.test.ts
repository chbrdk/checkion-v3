import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('registerCheckionProjectOnPlexon', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('returns null in dummy mode without calling fetch', async () => {
    vi.stubEnv('CHECKION_FEDERATION_MODE', 'dummy')
    vi.stubEnv('PLEXON_SERVICE_SECRET', 'secret')
    vi.stubEnv('NEXT_PLEXON_BASE_URL', 'http://plexon.test')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { registerCheckionProjectOnPlexon } = await import('../lib/plexon-project-origin')
    const result = await registerCheckionProjectOnPlexon({
      checkionProjectId: 'proj-1',
      name: 'N',
      domain: 'n.example',
      ownerPlexonUserId: 'owner',
      platformCompanyId: 'comp',
    })
    expect(result).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts to checkion-project-origin in live mode', async () => {
    vi.stubEnv('CHECKION_FEDERATION_MODE', 'live')
    vi.stubEnv('PLEXON_SERVICE_SECRET', 'secret')
    vi.stubEnv('NEXT_PLEXON_BASE_URL', 'http://plexon.test')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        platformProjectId: 'pp-99',
        audionProjectId: 'aud-1',
        platformCompanyId: 'comp',
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { registerCheckionProjectOnPlexon } = await import('../lib/plexon-project-origin')
    const result = await registerCheckionProjectOnPlexon({
      checkionProjectId: 'proj-1',
      name: 'N',
      domain: 'n.example',
      ownerPlexonUserId: 'owner',
      platformCompanyId: 'comp',
    })
    expect(result).toEqual({
      platformProjectId: 'pp-99',
      audionProjectId: 'aud-1',
      platformCompanyId: 'comp',
      ownerPlexonUserId: undefined,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://plexon.test/api/platform/provisioning/checkion-project-origin',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('omits owner/company so Plexon can auto-resolve', async () => {
    vi.stubEnv('CHECKION_FEDERATION_MODE', 'live')
    vi.stubEnv('PLEXON_SERVICE_SECRET', 'secret')
    vi.stubEnv('NEXT_PLEXON_BASE_URL', 'http://plexon.test')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        platformProjectId: 'pp-auto',
        platformCompanyId: 'co-auto',
        ownerPlexonUserId: 'u-auto',
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { registerCheckionProjectOnPlexon } = await import('../lib/plexon-project-origin')
    const result = await registerCheckionProjectOnPlexon({
      checkionProjectId: 'proj-2',
      name: 'Auto',
      domain: 'auto.example',
    })
    expect(result).toEqual({
      platformProjectId: 'pp-auto',
      audionProjectId: undefined,
      platformCompanyId: 'co-auto',
      ownerPlexonUserId: 'u-auto',
    })
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body)
    expect(body).toEqual({
      checkionProjectId: 'proj-2',
      name: 'Auto',
      domain: 'auto.example',
    })
  })
})
