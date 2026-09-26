import { describe, expect, it, beforeEach } from 'vitest'
import { isJevShadowEnabled, useCaseEnvSuffix } from '@/lib/jev/env'
import { detectYmyl } from '@/lib/scan/ymyl-heuristic'

describe('checkion jev shadow wiring', () => {
  beforeEach(() => {
    delete process.env.OPENROUTER_API_KEY
    delete process.env.JEV_SHADOW_ENABLED
  })

  it('maps use case env suffix', () => {
    expect(useCaseEnvSuffix('checkion.ymyl_gate')).toBe('CHECKION_YMYL_GATE')
  })

  it('ymyl heuristic still works without shadow', () => {
    const r = detectYmyl(
      'https://example.com/gesundheit/arzt',
      'Arzt finden',
      'medizinische behandlung und diagnose',
      null,
    )
    expect(r.isYmyl).toBe(true)
    expect(isJevShadowEnabled('checkion.ymyl_gate')).toBe(false)
  })
})
