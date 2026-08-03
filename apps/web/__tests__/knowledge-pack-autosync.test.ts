import { afterEach, describe, expect, it, vi } from 'vitest'
import { publishGeoJobKnowledge } from '../lib/knowledge-pack-autosync'

describe('knowledge-pack-autosync (checkion)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('soft-skips when federation is dummy', async () => {
    vi.stubEnv('CHECKION_FEDERATION_MODE', 'dummy')
    const result = await publishGeoJobKnowledge({ jobId: 'geo-1', soft: true })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.skipped).toBe(true)
      expect(result.error).toBe('federation_not_live')
    }
  })
})
