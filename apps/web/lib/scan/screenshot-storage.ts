/**
 * Local screenshot storage for Phase 2 (puppeteer JPEG buffers).
 * S3 support deferred — prefer bundled local disk under SCAN_SCREENSHOTS_PATH.
 *
 * Coolify (external worker): main-app + scan-worker MUST share the same host
 * directory bind. Never rely on Dockerfile VOLUME (anonymous volumes diverge).
 */

import fs from 'fs'
import path from 'path'
import { apiScanScreenshot, ENV_SCAN_SCREENSHOTS_PATH } from './constants'

/** Absolute default so worker cwd (`apps/web`) does not fork the path. */
const IMAGE_DEFAULT_DIR = '/workspace/checkion-v3/data/screenshots'
const EXT = '.jpg'

export function getScreenshotDir(): string {
  const raw = process.env[ENV_SCAN_SCREENSHOTS_PATH]?.trim()
  if (raw) {
    return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw)
  }
  // Prefer image absolute default when running in Coolify/Docker; else cwd-relative.
  if (fs.existsSync('/workspace/checkion-v3') || process.env.NODE_ENV === 'production') {
    return IMAGE_DEFAULT_DIR
  }
  return path.join(process.cwd(), 'data', 'screenshots')
}

function getScreenshotPath(scanId: string): string {
  const dir = getScreenshotDir()
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  // Keep file names filesystem-safe (DB ids are usually already safe).
  const safeId = scanId.replace(/[^a-zA-Z0-9._-]+/g, '_')
  return path.join(dir, `${safeId}${EXT}`)
}

/** Write screenshot to local disk. Returns a relative URL path for the scan payload. */
export async function writeScreenshot(scanId: string, buffer: Buffer): Promise<string> {
  const filePath = getScreenshotPath(scanId)
  try {
    fs.writeFileSync(filePath, buffer)
  } catch (err) {
    console.error('[checkion-v3] screenshot write failed', {
      scanId,
      filePath,
      dir: getScreenshotDir(),
      bytes: buffer.length,
      err,
    })
    throw err
  }
  console.info('[checkion-v3] screenshot wrote', {
    scanId,
    filePath,
    bytes: buffer.length,
  })
  return apiScanScreenshot(scanId)
}

export async function readScreenshot(scanId: string): Promise<Buffer | null> {
  const filePath = getScreenshotPath(scanId)
  if (!fs.existsSync(filePath)) return null
  return fs.readFileSync(filePath)
}

/** Copy an existing capture to a new scan id (reuse / remount). Returns API path or null. */
export async function copyScreenshot(fromScanId: string, toScanId: string): Promise<string | null> {
  const buf = await readScreenshot(fromScanId)
  if (!buf) return null
  return writeScreenshot(toScanId, buf)
}

/** Ops probe for worker `/health` — shared-mount visibility without listing contents. */
export function screenshotStorageProbe(): {
  path: string
  writable: boolean
  jpegCount: number
} {
  const dir = getScreenshotDir()
  let writable = false
  let jpegCount = 0
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const probe = path.join(dir, `.write-probe-${process.pid}`)
    fs.writeFileSync(probe, 'ok')
    fs.unlinkSync(probe)
    writable = true
    const names = fs.readdirSync(dir)
    jpegCount = names.filter((n) => n.endsWith(EXT)).length
  } catch (err) {
    console.warn('[checkion-v3] screenshot storage probe failed', { dir, err })
  }
  return { path: dir, writable, jpegCount }
}
