import { describe, expect, it } from 'vitest'
import { normalizeDataForSeoTarget } from '../lib/seo-market/dataforseo-target'

describe('normalizeDataForSeoTarget', () => {
  it('strips scheme, www, path, and port', () => {
    expect(normalizeDataForSeoTarget('https://www.Example.com/path?x=1')).toBe('example.com')
    expect(normalizeDataForSeoTarget('WWW.vaillant-group.com/')).toBe('vaillant-group.com')
    expect(normalizeDataForSeoTarget('example.com:443')).toBe('example.com')
  })

  it('keeps multi-label hosts', () => {
    expect(normalizeDataForSeoTarget('docs.msqdx.example')).toBe('docs.msqdx.example')
  })

  it('rejects empty / non-host input', () => {
    expect(() => normalizeDataForSeoTarget('')).toThrow(/domain is required/)
    expect(() => normalizeDataForSeoTarget('not a host')).toThrow(/Invalid domain/)
    expect(() => normalizeDataForSeoTarget('localhost')).toThrow(/Invalid domain/)
  })
})
