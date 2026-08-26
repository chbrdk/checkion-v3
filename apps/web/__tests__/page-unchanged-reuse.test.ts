import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkPageUnchangedByHeaders } from '../lib/scan/page-unchanged-check'
import {
  cloneScanResultForReuse,
  resolveSkipUnchangedPages,
  slimScanResultForCache,
} from '../lib/scan/domain-scan-reuse'
import type { ScanResult } from '../lib/scan/types'

describe('checkPageUnchangedByHeaders', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns unknown when previous has no etag or last-modified', async () => {
    await expect(checkPageUnchangedByHeaders('https://example.com', {})).resolves.toBe('unknown')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns unchanged when etag matches', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: { etag: '"v1"' },
      }),
    )
    await expect(
      checkPageUnchangedByHeaders('https://example.com', { etag: '"v1"' }),
    ).resolves.toBe('unchanged')
  })

  it('returns changed when etag differs', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: { etag: '"v2"' },
      }),
    )
    await expect(
      checkPageUnchangedByHeaders('https://example.com', { etag: '"v1"' }),
    ).resolves.toBe('changed')
  })

  it('returns unknown on fetch failure', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network'))
    await expect(
      checkPageUnchangedByHeaders('https://example.com', { etag: '"v1"' }),
    ).resolves.toBe('unknown')
  })
})

describe('domain-scan-reuse helpers', () => {
  it('defaults skipUnchangedPages to true', () => {
    expect(resolveSkipUnchangedPages(undefined)).toBe(true)
    expect(resolveSkipUnchangedPages(true)).toBe(true)
    expect(resolveSkipUnchangedPages(false)).toBe(false)
    expect(resolveSkipUnchangedPages('false')).toBe(false)
  })

  it('clones prior result with new id and reusedUnchanged flag', () => {
    const source = {
      id: 'old',
      url: 'https://example.com/a',
      score: 80,
      timestamp: '2020-01-01T00:00:00.000Z',
      documentCacheHints: { etag: '"x"' },
      screenshot: 'data:huge',
    } as unknown as ScanResult

    const cloned = cloneScanResultForReuse(source, 'domain-1', 'https://example.com/a', 'domain-1-p0')
    expect(cloned.id).toBe('domain-1-p0')
    expect(cloned.groupId).toBe('domain-1')
    expect(cloned.reusedUnchanged).toBe(true)
    expect(cloned.screenshot).toContain('domain-1-p0')

    const slim = slimScanResultForCache(source)
    expect((slim as { screenshot?: unknown }).screenshot).toBeUndefined()
    expect(slim.documentCacheHints?.etag).toBe('"x"')
  })
})
