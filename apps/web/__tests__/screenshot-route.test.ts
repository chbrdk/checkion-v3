import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../app/api/scans/[id]/screenshot/route'
import { writeScreenshot, readScreenshot } from '../lib/scan/screenshot-storage'
import { apiScanScreenshot } from '../lib/scan/constants'

describe('screenshot storage + route', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checkion-screenshots-'))
    vi.stubEnv('SCAN_SCREENSHOTS_PATH', tmpDir)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('writes and reads jpeg by scan id', async () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xd9])
    const url = await writeScreenshot('scan-single-1', buf)
    expect(url).toBe(apiScanScreenshot('scan-single-1'))
    const read = await readScreenshot('scan-single-1')
    expect(read?.equals(buf)).toBe(true)
  })

  it('serves stored jpeg for an existing scan', async () => {
    const { createScan, getScanOverview } = await import('../lib/fixtures/scan-store')
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('CHECKION_LIVE_SCANS', '')

    const scan = await createScan({
      projectId: 'proj-1',
      mode: 'single',
      url: 'https://example.com/',
    })
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xaa, 0xd9])
    await writeScreenshot(scan.id, buf)

    // Point overview screenshotUrl at the API path (live adapt does this).
    const overview = await getScanOverview(scan.id)
    expect(overview).toBeTruthy()

    const res = await GET(new Request('http://localhost/api/scans/x/screenshot'), {
      params: Promise.resolve({ id: scan.id }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/jpeg')
    const body = Buffer.from(await res.arrayBuffer())
    expect(body.equals(buf)).toBe(true)
  })

  it('returns svg placeholder when file is missing', async () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('CHECKION_LIVE_SCANS', '')
    const { createScan } = await import('../lib/fixtures/scan-store')
    const scan = await createScan({
      projectId: 'proj-1',
      mode: 'single',
      url: 'https://example.com/missing-shot',
    })

    const res = await GET(new Request('http://localhost/api/scans/x/screenshot'), {
      params: Promise.resolve({ id: scan.id }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/svg+xml')
    expect(res.headers.get('X-Screenshot')).toBe('placeholder')
  })
})
