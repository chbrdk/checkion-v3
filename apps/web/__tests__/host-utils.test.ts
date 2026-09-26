import { describe, expect, it } from 'vitest'
import { brandSeedFromHost } from '../lib/seo-market/host-utils'

describe('brandSeedFromHost', () => {
  it('strips www and uses the registrable label', () => {
    expect(brandSeedFromHost('www.vaillant-group.com')).toBe('vaillant-group')
    expect(brandSeedFromHost('https://www.vaillant.com/de')).toBe('vaillant')
    expect(brandSeedFromHost('vaillant-group.com')).toBe('vaillant-group')
  })

  it('never returns bare www', () => {
    expect(brandSeedFromHost('www')).toBe('brand')
    expect(brandSeedFromHost('WWW.example.com')).toBe('example')
    expect(brandSeedFromHost('www.')).toBe('brand')
  })

  it('handles empty and simple hosts', () => {
    expect(brandSeedFromHost('')).toBe('brand')
    expect(brandSeedFromHost('acme.example')).toBe('acme')
  })
})
