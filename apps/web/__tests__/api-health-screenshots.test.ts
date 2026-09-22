import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { paths } from '../lib/paths'

describe('api health screenshots probe', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checkion-health-shots-'))
    vi.stubEnv('SCAN_SCREENSHOTS_PATH', tmpDir)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('reports writable screenshot mount on /api/health', async () => {
    const { GET } = await import('../app/api/health/route')
    const res = await GET()
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.product).toBe('checkion-v3')
    expect(body.federationContract).toBe(paths.federationContract)
    expect(body.screenshots.path).toBe(tmpDir)
    expect(body.screenshots.writable).toBe(true)
    expect(typeof body.screenshots.jpegCount).toBe('number')
  })
})
