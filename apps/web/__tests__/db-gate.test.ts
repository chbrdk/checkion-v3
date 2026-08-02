import { afterEach, describe, expect, it, vi } from 'vitest'
import { isDatabaseConfigured } from '../lib/db/config'

describe('isDatabaseConfigured', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is false when DATABASE_URL unset (fixture fallback)', () => {
    vi.stubEnv('DATABASE_URL', '')
    expect(isDatabaseConfigured()).toBe(false)
  })

  it('is true when DATABASE_URL set', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://user:pass@localhost:5432/checkion')
    expect(isDatabaseConfigured()).toBe(true)
  })
})
