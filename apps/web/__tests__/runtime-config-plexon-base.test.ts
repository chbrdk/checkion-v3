import { afterEach, describe, expect, it, vi } from 'vitest'
import { plexonBaseUrl } from '../lib/runtime-config'

describe('plexonBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('prefers NEXT_PLEXON_BASE_URL', () => {
    vi.stubEnv('NEXT_PLEXON_BASE_URL', 'https://plexon.explicit.test/')
    vi.stubEnv('PLEXON_AUTH_URL', 'https://plexon.auth.test')
    expect(plexonBaseUrl()).toBe('https://plexon.explicit.test')
  })

  it('falls back to PLEXON_AUTH_URL when base unset', () => {
    vi.stubEnv('NEXT_PLEXON_BASE_URL', '')
    vi.stubEnv('PLEXON_AUTH_URL', 'https://plexon.auth.test/')
    expect(plexonBaseUrl()).toBe('https://plexon.auth.test')
  })
})
