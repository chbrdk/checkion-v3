import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  setFetchPageRunnerForTests,
  fetchPageText,
} from '../lib/scan/fetch-page-text'
import {
  hostBlockedForFetchPage,
  normalizeFetchPageUrl,
} from '../lib/scan/fetch-page-url'
import { paths } from '../lib/paths'

describe('fetch-page URL guard', () => {
  it('blocks private hosts', () => {
    expect(hostBlockedForFetchPage('127.0.0.1')).toBe(true)
    expect(hostBlockedForFetchPage('10.0.0.2')).toBe(true)
    expect(hostBlockedForFetchPage('example.com')).toBe(false)
  })

  it('rejects non-http URLs', () => {
    expect(normalizeFetchPageUrl('ftp://x')).toEqual({
      error: 'Only http and https URLs are allowed',
    })
    expect(normalizeFetchPageUrl('https://example.com/a')).toEqual({
      url: 'https://example.com/a',
    })
  })
})

describe('fetchPageText', () => {
  afterEach(() => {
    setFetchPageRunnerForTests(null)
    vi.unstubAllEnvs()
  })

  it('uses fixture when live scans off', async () => {
    vi.stubEnv('CHECKION_LIVE_SCANS', '0')
    vi.stubEnv('DATABASE_URL', '')
    const result = await fetchPageText('https://example.com')
    expect(result.stubbed).toBe(true)
    expect(result.bodyTextExcerpt).toMatch(/Fixture CHECKION fetch-page/)
  })

  it('honors injected runner', async () => {
    setFetchPageRunnerForTests(async (url) => ({
      url,
      finalUrl: url,
      title: 'Live stub',
      bodyTextExcerpt: 'Hub Line urban eBike '.repeat(5),
      httpStatus: 200,
      stubbed: false,
    }))
    const result = await fetchPageText('https://www.bosch-ebike.com/de/')
    expect(result.stubbed).toBe(false)
    expect(result.title).toBe('Live stub')
    expect(result.bodyTextExcerpt).toMatch(/Hub Line/)
  })

  it('exposes fetch-page route constant', () => {
    expect(paths.routes.apiFetchPage).toBe('/api/fetch-page')
    expect(paths.fetchPageMaxChars).toBe(6000)
  })
})
