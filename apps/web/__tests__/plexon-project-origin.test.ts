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
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://plexon.test/api/platform/provisioning/checkion-project-origin',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
