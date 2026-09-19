import { describe, expect, it } from 'vitest'
import {
  buildDomainScanMaxPagesSelectOptions,
  DOMAIN_SCAN_DEFAULT_MAX_PAGES,
  DOMAIN_SCAN_MAX_PAGES_CAP,
  parseDomainScanMaxPagesParam,
  resolveDomainScanMaxPages,
} from '../lib/scan/domain-scan-max-pages'

describe('domain-scan-max-pages', () => {
  it('defaults and caps', () => {
    expect(resolveDomainScanMaxPages()).toBe(DOMAIN_SCAN_DEFAULT_MAX_PAGES)
    expect(resolveDomainScanMaxPages(50)).toBe(50)
    expect(resolveDomainScanMaxPages(99999)).toBe(DOMAIN_SCAN_MAX_PAGES_CAP)
    expect(resolveDomainScanMaxPages(0)).toBe(1)
  })

  it('builds select options including All', () => {
    const opts = buildDomainScanMaxPagesSelectOptions('All')
    expect(opts.map((o) => o.value)).toEqual(['50', '100', '250', '500', '1000', '10000'])
    expect(opts.at(-1)?.label).toBe('All')
  })

  it('parses query params', () => {
    expect(parseDomainScanMaxPagesParam('250')).toBe(250)
    expect(parseDomainScanMaxPagesParam('')).toBeUndefined()
    expect(parseDomainScanMaxPagesParam('nope')).toBeUndefined()
  })
})
