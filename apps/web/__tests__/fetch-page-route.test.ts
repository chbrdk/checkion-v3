import { afterEach, describe, expect, it, vi } from 'vitest'
import { setFetchPageRunnerForTests } from '../lib/scan/fetch-page-text'
import { paths } from '../lib/paths'

vi.mock('../auth', () => ({
  auth: vi.fn(async () => null),
}))

vi.mock('../lib/auth-api-token', () => ({
  getRequestUser: vi.fn(async () => ({ id: 'user-1', email: 'a@b.c' })),
}))

vi.mock('../lib/runtime-config', () => ({
  isPlexonAuthConfigured: vi.fn(() => false),
}))

describe('POST /api/fetch-page route', () => {
  afterEach(() => {
    setFetchPageRunnerForTests(null)
    vi.resetModules()
  })

  it('returns 400 for blocked host and 200 for stub runner', async () => {
    const { POST } = await import('../app/api/fetch-page/route')

    const bad = await POST(
      new Request(`http://localhost${paths.routes.apiFetchPage}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'http://127.0.0.1/' }),
      }),
    )
    expect(bad.status).toBe(400)

    setFetchPageRunnerForTests(async (url) => ({
      url,
      finalUrl: url,
      title: 'Ok',
      bodyTextExcerpt: 'Page text from Chromium stub',
      httpStatus: 200,
      stubbed: false,
    }))

    const ok = await POST(
      new Request(`http://localhost${paths.routes.apiFetchPage}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/page' }),
      }),
    )
    expect(ok.status).toBe(200)
    const json = (await ok.json()) as { bodyTextExcerpt: string }
    expect(json.bodyTextExcerpt).toMatch(/Chromium stub/)
  })
})
