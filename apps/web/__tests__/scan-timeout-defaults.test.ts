import { describe, expect, it, afterEach } from 'vitest'
import { DOMAIN_PAGE_SCAN_TIMEOUT_MS, PUPPETEER_PROTOCOL_TIMEOUT_MS } from '@/lib/scan/constants'

describe('scan timeout defaults', () => {
  const prevProtocol = process.env.PUPPETEER_PROTOCOL_TIMEOUT_MS
  const prevPage = process.env.DOMAIN_PAGE_SCAN_TIMEOUT_MS

  afterEach(() => {
    if (prevProtocol === undefined) delete process.env.PUPPETEER_PROTOCOL_TIMEOUT_MS
    else process.env.PUPPETEER_PROTOCOL_TIMEOUT_MS = prevProtocol
    if (prevPage === undefined) delete process.env.DOMAIN_PAGE_SCAN_TIMEOUT_MS
    else process.env.DOMAIN_PAGE_SCAN_TIMEOUT_MS = prevPage
  })

  it('keeps protocol timeout far below the old 10-minute hang default', () => {
    expect(PUPPETEER_PROTOCOL_TIMEOUT_MS).toBeLessThanOrEqual(180_000)
    expect(PUPPETEER_PROTOCOL_TIMEOUT_MS).toBeGreaterThanOrEqual(30_000)
  })

  it('caps a single domain page so one URL cannot stall the spider', () => {
    expect(DOMAIN_PAGE_SCAN_TIMEOUT_MS).toBeLessThanOrEqual(300_000)
    expect(DOMAIN_PAGE_SCAN_TIMEOUT_MS).toBeGreaterThanOrEqual(30_000)
  })
})
