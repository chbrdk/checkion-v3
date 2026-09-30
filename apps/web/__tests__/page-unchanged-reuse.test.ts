import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  checkPageUnchangedByFingerprint,
  checkPageUnchangedByHeaders,
  fingerprintFromHtml,
  normalizeEtag,
  resolvePageUnchanged,
} from '../lib/scan/page-unchanged-check'
import {
  cloneScanResultForReuse,
  resolveSkipUnchangedPages,
  slimScanResultForCache,
} from '../lib/scan/domain-scan-reuse'
import type { ScanResult } from '../lib/scan/types'

describe('normalizeEtag', () => {
  it('equates weak and strong validators', () => {
    expect(normalizeEtag('W/"abc"')).toBe('"abc"')
    expect(normalizeEtag('"abc"')).toBe('"abc"')
  })
})

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

  it('returns unchanged on 304 Not Modified', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 304 }))
    await expect(
      checkPageUnchangedByHeaders('https://example.com', { etag: '"v1"' }),
    ).resolves.toBe('unchanged')
    const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit
    expect((init.headers as Record<string, string>)['If-None-Match']).toBe('"v1"')
  })

  it('returns unchanged when etag matches (weak vs strong)', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: { etag: 'W/"v1"' },
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

  it('falls back to GET when HEAD is 405', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 405 }))
      .mockResolvedValueOnce(new Response(null, { status: 304 }))
    await expect(
      checkPageUnchangedByHeaders('https://example.com', { etag: '"v1"' }),
    ).resolves.toBe('unchanged')
    expect(vi.mocked(fetch).mock.calls[0]?.[1]).toMatchObject({ method: 'HEAD' })
    expect(vi.mocked(fetch).mock.calls[1]?.[1]).toMatchObject({ method: 'GET' })
  })

  it('returns unknown on fetch failure', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network'))
    await expect(
      checkPageUnchangedByHeaders('https://example.com', { etag: '"v1"' }),
    ).resolves.toBe('unknown')
  })
})

describe('fingerprint reuse', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('builds stable fingerprints from HTML', () => {
    const a = fingerprintFromHtml(
      '<html><head><title>Hello</title></head><body><h1>Hi</h1><p>Body text here.</p></body></html>',
    )
    const b = fingerprintFromHtml(
      '<html><head><title>Hello</title></head><body><h1>Hi</h1><p>Body text here.</p></body></html>',
    )
    const c = fingerprintFromHtml(
      '<html><head><title>Hello</title></head><body><h1>Hi</h1><p>Changed body.</p></body></html>',
    )
    expect(a).toBeTruthy()
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })

  it('returns unchanged when HTML fingerprint matches', async () => {
    const html =
      '<html><head><title>Services</title></head><body><h1>Services</h1><p>Consulting for plants.</p></body></html>'
    const fp = fingerprintFromHtml(html)!
    vi.mocked(fetch).mockResolvedValue(
      new Response(html, {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
    )
    await expect(checkPageUnchangedByFingerprint('https://example.com', fp)).resolves.toBe(
      'unchanged',
    )
  })

  it('resolvePageUnchanged falls through to fingerprint when headers unknown', async () => {
    const html =
      '<html><head><title>X</title></head><body><h1>X</h1><p>stable copy for fingerprint.</p></body></html>'
    const fp = fingerprintFromHtml(html)!
    vi.mocked(fetch)
      // header probe: 200 without matching etag echo
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: {},
        }),
      )
      .mockResolvedValueOnce(
        new Response(html, {
          status: 200,
          headers: { 'content-type': 'text/html' },
        }),
      )
    await expect(
      resolvePageUnchanged('https://example.com', {
        etag: '"missing-on-response"',
        contentFingerprint: fp,
      }),
    ).resolves.toBe('unchanged')
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
