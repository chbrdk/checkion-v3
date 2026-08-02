import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../app/api/federation/health/route'
import { paths } from '../lib/paths'

describe('federation health', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('reports deferred dummy mode by default', async () => {
    vi.stubEnv(paths.envFederationMode, 'dummy')
    vi.stubEnv(paths.envPlexonServiceSecret, '')
    const res = await GET()
    const body = await res.json()
    expect(body.contract).toBe(paths.federationContract)
    expect(body.mode).toBe('dummy')
    expect(body.deferred).toBe(true)
    expect(body.plexonReachable).toBe(true)
  })

  it('probes plexon when live and configured', async () => {
    vi.stubEnv(paths.envFederationMode, 'live')
    vi.stubEnv(paths.envPlexonBase, 'http://plexon.test')
    vi.stubEnv(paths.envPlexonServiceSecret, 'test-secret')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    )
    const res = await GET()
    const body = await res.json()
    expect(body.deferred).toBe(false)
    expect(body.configured).toBe(true)
    expect(body.mode).toBe('live')
    expect(body.plexonReachable).toBe(true)
    expect(fetch).toHaveBeenCalled()
  })
})
